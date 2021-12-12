/**
 * 订单支付成功后触发此回调（订单超时等等不会触发此回调）
 * 
 * 文档：https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=9_7&index=8
 * 实践：https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=23_9&index=1
 */

const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})


//返回14位字符串日期20210102030405
function getStrDate(date) {
  let year = date.getFullYear()
  let month = (date.getMonth() + 1).toString().padStart(2, '0')
  let day = date.getDate().toString().padStart(2, '0')
  let hour = date.getHours().toString().padStart(2, '0')
  let min = date.getMinutes().toString().padStart(2, '0')
  let sec = date.getSeconds().toString().padStart(2, '0')
  return year + month + day + hour + min + sec
}

function getNonceStr() {
  var out = ''
  for (let i = 0; i < 4; i++) {
    out += Math.random().toString(36).slice(-4)
  }
  return out
}

exports.main = async (event, context) => {
  if (event.resultCode !== 'SUCCESS' || event.returnCode !== 'SUCCESS') {
    return {
      errcode: 1,
      errmsg: '支付回调失败'
    }
  }

  try {
    const db = cloud.database()
    const _ = db.command


    //查询订单（保证订单支付信息一定准确）
    const out_trade_no = event.outTradeNo
    const sub_mch_id = event.subMchId
    const nonce_str = event.nonceStr

    const res = await cloud.cloudPay.queryOrder({
      out_trade_no: out_trade_no,
      sub_mch_id: sub_mch_id,
      nonce_str: nonce_str
    })

    //读取数据库订单
    var dbRes = await db.collection('orders').where({
      'orderInfo.outTradeNo': out_trade_no
    }).get()
    var order = dbRes.data[0]

    //校验返回的订单金额是否与商户侧的订单金额一致
    const totalFee = res.totalFee


    if (totalFee !== order.payInfo.feeInfo.totalFee) { //若金额不一致则订单存在问题

      //构建修改对象
      var formData = {
        'orderInfo.orderState': 'ERROR',
        'orderInfo.orderStateMsg': '异常取消',
        'orderInfo.timeInfo.endTime': getStrDate(new Date())
      }

      if (res.tradeState === 'SUCCESS') { //已付款则退款（不用关闭订单）
        let refundRes = await cloud.cloudPay.refund({
          envId: 'cloud1-4g4b6j139b4e50e0', //云开发中复制
          subMchId: sub_mch_id,
          nonce_str: getNonceStr(),
          outTradeNo: out_trade_no,
          out_refund_no: 'REFUND' + out_trade_no,
          totalFee: totalFee,
          refundFee: totalFee
        })

        if (refundRes.resultCode === 'SUCCESS' && refundRes.returnCode === 'SUCCESS') {
          console.log("退款成功")
          formData['payInfo.tradeState'] = 'REFUND'
          formData['payInfo.tradeStateMsg'] = '转入退款'
        }else{
          console.log('退款失败')
        }
      } else { //未付款则关闭统一接口订单
        let nonce_str = getNonceStr()
        await cloud.cloudPay.closeOrder({
          out_trade_no: order.orderInfo.outTradeNo,
          sub_mch_id: order.goodsInfo.shopInfo.subMchId,
          nonce_str: nonce_str
        })
      }

      //修改订单状态
      var p = db.collection('orders').doc(order._id).update({
        data: formData
      })

      //最后都要释放库存
      let record = order.goodsInfo.record
      let proList = [p]
      record.forEach(food => {
        proList.push(
          db.collection('food').doc(food._id).update({
            data: {
              curNum: _.inc(food.num),
              allNum: _.inc(food.num)
            }
          })
        )
      })

      try {
        await Promise.all(proList)
        console.log('修改订单状态、释放库存成功')
      } catch (err) {
        console.error('修改订单状态、释放库存出错', err)
      }

      return {
        errcode: 0,
        errmsg: '回调成功, 订单金额与接口订单金额不一致'
      }
    }

    if (res.tradeState === 'SUCCESS') {
      //构建更新对象
      var formData = {}
      var flag = false

      if (order.payInfo.tradeState == 'NOTPAY') {
        flag = true
        formData['payInfo.tradeState'] = 'SUCCESS'
        formData['payInfo.tradeStateMsg'] = '支付成功'
      }
      if (order.orderInfo.orderState == 'NOTPAY') {
        flag = true
        formData['orderInfo.orderState'] = 'NOTCONFIRM'
        formData['orderInfo.orderStateMsg'] = '未确认'
      }
      if (!('payTime' in order.orderInfo.timeInfo)) {
        flag = true
        formData['orderInfo.timeInfo.payTime'] = getStrDate(new Date())
      }

      if (flag) {
        //更新数据库订单信息
        await db.collection('orders')
          .where({
            'orderInfo.outTradeNo': out_trade_no
          }).update({
            data: {
              ...formData
            }
          })
      }
    }

    return {
      errcode: 0,
      errmsg: '回调成功'
    }
  } catch (error) {
    console.error('发生异常' ,error)
    return {
      errcode: 0,
      errmsg: '支付回调成功，但执行过程发生异常'
    }
  }
}
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


exports.main = async (event, context) => {
  if (event.resultCode !== 'SUCCESS' || event.returnCode !== 'SUCCESS') {
    return {
      errcode: 1,
      errmsg: '支付回调失败'
    }
  }

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
  const db = cloud.database()
  var dbRes = await db.collection('orders').where({
    'orderInfo.outTradeNo': out_trade_no
  }).get()
  var order = dbRes.data[0]

  //校验返回的订单金额是否与商户侧的订单金额一致
  const totalFee = res.totalFee
  if (totalFee !== order.payInfo.feeInfo.totalFee) { //若金额不一致则订单存在问题
    //订单存在问题
    if (res.tradeState === 'SUCCESS') {
      //若已付款则退款，修改数据库信息
    } else {
      //若未付款则关闭订单，修改数据库信息
    }

    return {
      errcode: 0,
      errmsg: '金额不一致'
    }
  }

  if (res.tradeState === 'SUCCESS') {
    //构建更新对象
    var formData = {}
    var flag = false

    if (order.orderInfo.orderState == 'NOTPAY') {
      flag = true
      formData['payInfo.tradeState'] = 'SUCCESS'
      formData['payInfo.tradeStateMsg'] = '支付成功'
    }
    if (order.orderInfo.orderState == 'NOTPAY') {
      flag = true
      formData['orderInfo.orderState'] = 'NOTCONFIRM'
      formData['orderInfo.orderStateMsg'] = '未确认'
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
}
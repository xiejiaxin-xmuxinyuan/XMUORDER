//记得右键 上传/删除触发器
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = _.aggregate

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

// 返回长度为4位的随机字母字符串
function getRandomStr() {
  return Math.random().toString(36).slice(-4)
}

exports.main = async (event, context) => {
  try {
    const db = cloud.database()
    var date = new Date()
    date.setTime(date.getTime() - 1000 * 60 * 10) //时间前推10分钟

    //获取距当前时间10分钟内的
    var res = await db.collection('orders').aggregate()
      .match({
        'orderInfo.timeInfo.createTime': _.gt(getStrDate(date)),
        'orderInfo.pollingTimes': _.lte(10), //实现每个订单最多被轮询查单11次（大约5分钟后支付超时）
        'orderInfo.orderState': 'NOTPAY'
      })
      .end()

    var orders = res.list
    for (let index = 0; index < orders.length; index++) {
      let order = orders[index]
      try {
        //查单
        let nonce_str = getRandomStr() + getRandomStr() + getRandomStr() + getRandomStr()
        let queryRes = await cloud.cloudPay.queryOrder({
          out_trade_no: order.orderInfo.outTradeNo,
          sub_mch_id: order.goodsInfo.shopInfo.subMchId,
          nonce_str: nonce_str
        })

        if (queryRes.resultCode === 'SUCCESS' && queryRes.returnCode === 'SUCCESS' &&
          queryRes.tradeState === 'SUCCESS') { //得知支付成功则修改订单状态
          console.log(index, '修改状态为支付成功')
          //构建更新对象
          var formData = {
            'payInfo.tradeState': 'SUCCESS',
            'payInfo.tradeStateMsg': '支付成功'
          }
          if (order.orderInfo.orderState == 'NOTPAY') {
            formData['orderInfo.orderState'] = 'NOTCONFIRM'
            formData['orderInfo.orderStateMsg'] = '未确认'
          }

          db.collection('orders')
            .doc(order._id)
            .update({
              data: {
                ...formData
              }
            })
        } else if (order.orderInfo.pollingTimes >= 10) { //如果是第11次查询则关闭订单
          console.log(index, '关闭订单')
          let nonce_str = getRandomStr() + getRandomStr() + getRandomStr() + getRandomStr()
          let closeRes = await cloud.cloudPay.closeOrder({
            out_trade_no: order.orderInfo.outTradeNo,
            sub_mch_id: order.goodsInfo.shopInfo.subMchId,
            nonce_str: nonce_str
          })
          if (closeRes.resultCode === 'SUCCESS' && closeRes.returnCode === 'SUCCESS') {
            console.log(index, '关闭订单成功')
            //修改订单状态
            //构建更新对象
            var formData = {
              'orderInfo.orderState': 'CLOSED',
              'orderInfo.orderStateMsg': '已取消',
              'orderInfo.timeInfo.endTime': getStrDate(new Date())
            }
            db.collection('orders')
              .doc(order._id)
              .update({
                data: {
                  ...formData
                }
              })
          }
        } else { // 仍未支付则 pollingTimes += 1
          console.log(index, '轮询次数+1')
          db.collection('orders')
            .doc(order._id)
            .update({
              data: {
                'orderInfo.pollingTimes': _.inc(1)
              }
            })
        }
      } catch (e) {
        console.error(e)
        continue
      }
    }
  } catch (e) {
    console.error(e)
  }

  return "查单数量：" + orders.length
}
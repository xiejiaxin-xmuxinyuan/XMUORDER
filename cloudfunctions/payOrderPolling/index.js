/**
 * 云函数触发器轮询（上传/删除触发器可以开启、关闭）
 * 对10分钟内订单状态为未支付的所有订单进行间隔30s的轮询，
 * 每个订单被轮询查单11次（大约5分钟后）, 若仍未支付则判定为支付超时，关闭订单
 * 若被轮询查单结果为已支付，则修改数据库订单状态为已支付
 */

const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command


//返回14位字符串日期20210102030405
function getStrDate(date, format = false) {
  let year = date.getFullYear()
  let month = (date.getMonth() + 1).toString().padStart(2, '0')
  let day = date.getDate().toString().padStart(2, '0')
  let hour = date.getHours().toString().padStart(2, '0')
  let min = date.getMinutes().toString().padStart(2, '0')
  let sec = date.getSeconds().toString().padStart(2, '0')
  if (format) {
    return year + '年' + month + '月' + day + '日 ' + hour + ':' + min + ':' + sec
  } else {
    return year + month + day + hour + min + sec
  }
}

// 返回长度为16位的随机字母字符串
function getNonceStr() {
  var out = ''
  for (let i = 0; i < 4; i++) {
    out += Math.random().toString(36).slice(-4)
  }
  return out
}



exports.main = async (event, context) => {
  try {

    var limitTime = new Date()
    limitTime.setTime(limitTime.setMinutes(limitTime.getMinutes() - 10)) //距当前10分钟内

    var res = await db.collection('orders').where({
      'orderInfo.pollingTimes': _.lte(10), //实现每个订单最多被轮询查单11次（大约5分钟后支付超时）
      'orderInfo.orderState': 'NOTPAY',
      'orderInfo.timeInfo.createTime': _.gt(getStrDate(limitTime))
    }).get()

    var orders = res.data
    for (let index = 0; index < orders.length; index++) {
      let order = orders[index]
      try {
        //查单
        let nonce_str = getNonceStr()
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
          if (!('payTime' in order.orderInfo.timeInfo)) {
            formData['orderInfo.timeInfo.payTime'] = getStrDate(new Date())
          }

          await db.collection('orders').doc(order._id).update({
            data: formData
          })
        } else if (order.orderInfo.pollingTimes >= 10) { //如果是第11次查询则超时关闭订单
          console.log(index, '超时关闭订单')

          let nonce_str = getNonceStr()
          let closeRes = await cloud.cloudPay.closeOrder({
            out_trade_no: order.orderInfo.outTradeNo,
            sub_mch_id: order.goodsInfo.shopInfo.subMchId,
            nonce_str: nonce_str
          })
          if (closeRes.resultCode === 'SUCCESS' && closeRes.returnCode === 'SUCCESS') {
            console.log(index, '关闭订单成功')

            const endDate = new Date()

            //修改订单状态
            await db.collection('orders').doc(order._id).update({
              data: {
                'orderInfo.orderState': 'CLOSED',
                'orderInfo.orderStateMsg': '已取消',
                'payInfo.tradeState': 'TIMEOUT',
                'payInfo.tradeStateMsg': '支付超时',
                'orderInfo.timeInfo.endTime': getStrDate(endDate)
              }
            })

            console.log(index, '发送订单取消的订阅消息')
            //发送订单取消订阅消息
            cloud.openapi.subscribeMessage.send({
              "touser": order.userInfo.openid,
              "page": '/subpackages/order/pages/record/recordDetail?outTradeNo=' + order.orderInfo.outTradeNo,
              "lang": 'zh_CN',
              "data": {
                "thing1": {
                  "value": order.goodsInfo.shopInfo.name
                },
                "thing2": {
                  "value": '订单支付超时'
                },
                "character_string4": {
                  "value": order.orderInfo.outTradeNo
                },
                "thing8": {
                  "value": '无'
                },
                "time3": {
                  "value": getStrDate(endDate, true)
                }
              },
              "templateId": 'Q_EQhMx9pJeohoPN3oln0_ZIAqGDj_yJyilqOnwkYfY',
              "miniprogramState": 'trial'
            })

            try { //释放库存
              let record = order.goodsInfo.record
              let proList = []
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

              await Promise.all(proList)
              console.log(index, '释放库存成功')
            } catch (err) {
              console.log(index, '释放库存出错', err)
            }
          }
        } else { // 仍未支付则 pollingTimes += 1
          console.log(index, '轮询次数+1, 当前次数：', order.orderInfo.pollingTimes + 1)
          await db.collection('orders')
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
    return "查单数量：" + orders.length
  } catch (e) {
    console.error(e)
  }
}
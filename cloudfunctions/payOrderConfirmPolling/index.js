const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

//返回16位随机字母字符串
function getNonceStr() {
  var out = ''
  for (let i = 0; i < 4; i++) {
    out += Math.random().toString(36).slice(-4)
  }
  return out
}

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


function sendMessage(order, endDate, reason, note = null) {
  console.log('发送订单取消的订阅消息')
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
        "value": reason
      },
      "character_string4": {
        "value": order.orderInfo.outTradeNo
      },
      "thing8": {
        "value": note === null ? '无' : note
      },
      "time3": {
        "value": getStrDate(endDate, true)
      }
    },
    "templateId": 'Q_EQhMx9pJeohoPN3oln0_ZIAqGDj_yJyilqOnwkYfY',
    "miniprogramState": 'trial'
  })
}

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    var limitTime = new Date()
    limitTime.setTime(limitTime.setMinutes(limitTime.getMinutes() - 30)) //距当前15分钟内

    var res = await db.collection('orders').where({
      'orderInfo.confirmPollingTimes': _.lte(20), //实现每个订单最多被轮询查单21次（大约10分钟后超时）
      'orderInfo.orderState': 'NOTCONFIRM',
      'orderInfo.timeInfo.payTime': _.gt(getStrDate(limitTime))
    }).get()

    var orders = res.data
    for (let index = 0; index < orders.length; index++) {
      try {
        const order = orders[index]
        const outTradeNo = order.orderInfo.outTradeNo
        const subMchId = order.goodsInfo.shopInfo.subMchId
        const totalFee = order.payInfo.feeInfo.totalFee

        if (!('confirmPollingTimes' in order.orderInfo)) {
          order.orderInfo.confirmPollingTimes = 1
        } else {
          order.orderInfo.confirmPollingTimes += 1
        }

        // 修改对象初始化
        var formData = {
          'orderInfo.confirmPollingTimes': order.orderInfo.confirmPollingTimes
        }

        if (order.orderInfo.confirmPollingTimes > 20) { // 达到第21次轮询则设置为被拒绝并退款再释放库存
          console.log(index, '超时自动拒单')
          var endDate = new Date()
          formData['orderInfo.orderState'] = 'NOTACCEPT'
          formData['orderInfo.orderStateMsg'] = '被拒'
          formData['orderInfo.notAcceptReason'] = '商家未及时接单'
          formData['orderInfo.timeInfo.endTime'] = getStrDate(endDate)
          // 退款
          var refundRes = await cloud.cloudPay.refund({
            envId: 'cloud1-4g4b6j139b4e50e0',
            subMchId: subMchId,
            nonce_str: getNonceStr(),
            outTradeNo: outTradeNo,
            out_refund_no: 'REFUND' + outTradeNo,
            totalFee: totalFee,
            refundFee: totalFee
          })

          if (refundRes.resultCode === 'SUCCESS' && refundRes.returnCode === 'SUCCESS') {
            console.log("退款成功")
            formData['payInfo.tradeState'] = 'REFUND'
            formData['payInfo.tradeStateMsg'] = '转入退款'
          } else {
            console.log("退款失败", refundRes)
            formData['payInfo.tradeState'] = 'REFUNDERROR'
            formData['payInfo.tradeStateMsg'] = '退款失败'
          }

          sendMessage(order, endDate, '订单被拒', '商家未及时接单')

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
        } else {
          console.log(index, '轮询次数+1, 当前次数：', order.orderInfo.confirmPollingTimes)
        }

        // 执行修改
        await db.collection('orders').doc(order._id).update({
          data: formData
        })
      } catch (e) {
        console.error(e)
        continue
      }
    }
    return "检测订单数量：" + orders.length
  } catch (e) {
    console.error(e)
  }
}
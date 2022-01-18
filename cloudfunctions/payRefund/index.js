/**
 * 云函数退款，同时修改数据库中的订单信息
 * 参数：
 *      outTradeNo: 订单号
 * 返回： object 
 *        成功：{success: ture}
 *        失败：{success: false}
 */

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
function getStrDate(date) {
  let year = date.getFullYear()
  let month = (date.getMonth() + 1).toString().padStart(2, '0')
  let day = date.getDate().toString().padStart(2, '0')
  let hour = date.getHours().toString().padStart(2, '0')
  let min = date.getMinutes().toString().padStart(2, '0')
  let sec = date.getSeconds().toString().padStart(2, '0')
  return year + month + day + hour + min + sec
}

const db = cloud.database()
const _ = db.command
// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const outTradeNo = event.outTradeNo

    //读取数据库订单
    var dbRes = await db.collection('orders').where({
      'orderInfo.outTradeNo': outTradeNo
    }).limit(1).get()
    const order = dbRes.data[0]
    const subMchId = order.goodsInfo.shopInfo.subMchId
    const totalFee = order.payInfo.feeInfo.totalFee

    //定义修改对象
    var formData = {}

    // 退款
    var refundRes = await cloud.cloudPay.refund({
      envId: 'cloud1-4g4b6j139b4e50e0', //云开发中复制
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
      formData['payInfo.tradeStateMsg'] = '退款异常'
    }

    formData['orderInfo.timeInfo.endTime'] = getStrDate(new Date())

    // 修改订单状态
    await db.collection('orders').doc(order._id).update({
      data: formData
    })

    return {
      success: true
    }
  } catch (error) {
    console.error(error)
    return {
      success: false
    }
  }
}
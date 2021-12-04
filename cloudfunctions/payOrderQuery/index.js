/**
 * 云函数查询订单
 * 参数： 
 *    sub_mch_id: 商户号
 *    out_trade_no: 订单号
 *    nonce_str: 随机字符串（32位以内：建议16位）
 * 
 * 返回： object 
 *        成功：{success: ture, info: 订单详情}
 *        失败：{success: false, returnMsg: 查询失败原因}
 */

const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  try {
    const out_trade_no = event.out_trade_no
    const sub_mch_id = event.sub_mch_id
    const nonce_str = event.nonce_str

    var res = await cloud.cloudPay.queryOrder({
      out_trade_no: out_trade_no,
      sub_mch_id: sub_mch_id,
      nonce_str: nonce_str
    })

    if (res.resultCode !== 'SUCCESS' || res.returnCode !== 'SUCCESS') {
      return {
        success: false,
        returnMsg: res.returnMsg
      }
    }

    if (res.tradeState === 'SUCCESS') { //更新订单信息
      //读取数据库订单信息
      const db = cloud.database()
      var dbRes = await db.collection('orders').where({
        'orderInfo.outTradeNo': out_trade_no
      }).get()

      var order = dbRes.data[0]

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
      success: true,
      info: res
    }
  } catch (e) {
    console.error(e)
    return {
      success: false
    }
  }
}
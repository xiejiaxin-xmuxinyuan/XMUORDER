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
  const out_trade_no = event.out_trade_no
  const sub_mch_id = event.sub_mch_id
  const nonce_str = event.nonce_str

  const res = await cloud.cloudPay.queryOrder({
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

  //交易状态在前端返回值进行判断
  return {
    success: true,
    info: res
  }
}
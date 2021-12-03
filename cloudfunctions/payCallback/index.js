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
  console.log('回调event:', event)

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

  console.log('查单结果：', res)

  //校验返回的订单金额是否与商户侧的订单金额一致 TODO
  // const totalFee = res.totalFee //订单总金额（cashFee是不包括优惠券的金额）
  // 读取数据库 判断订单状态 数据库更新订单信息 TODO


  return {
    errcode: 0,
    errmsg: '回调成功'
  }
}
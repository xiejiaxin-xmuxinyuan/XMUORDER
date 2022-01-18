/**
 *  云函数用于提交当前用户反馈
 * 参数 ： 
 *      feedback : 用户反馈信息;
 *      record: 订单数据
 * 返回 ： success ： 状态码
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const feedback = event.feedback
  const outTradeNo = event.outTradeNo
  const date = event.date
  const refund = event.refund
  const cID = event.cID
  const record = event.record
  const feeInfo = event.feeInfo
  try {
    const openid = wxContext.OPENID
    await db.collection('userFeedbacks').add({
      data: {
        _openid: openid,
        feedback,
        canteenFeedback: '',
        outTradeNo,
        date,
        refund,
        state: 0,
        cID,
        record,
        feeInfo
      }
    })
    return {
      success: true
    }
  } catch (e) {
    return {
      success: false
    }
  }
}
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
  const record = event.record
  const feedback = event.feedback
  try {
    const openid = wxContext.OPENID
    await db.collection('userFeedbacks').add({
      data: {
        record: record,
        _openid: openid,
        feedback: feedback,
        outTradeNo : record.orderInfo.outTradeNo,
        date : record.orderInfo.timeInfo.formatedTime,
        state : 0
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
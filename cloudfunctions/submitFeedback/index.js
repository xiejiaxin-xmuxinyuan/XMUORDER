// 云函数入口文件
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
    const rID = record._id
    console.log(openid)
    await db.collection('userFeedbacks').add({
      data: {
        record: record,
        _openid: openid,
        feedback: feedback,
        rID : rID,
        date : record.date,
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
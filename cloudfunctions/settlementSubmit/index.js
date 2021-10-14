// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    var userRecord = event.userRecord
    userRecord.openid = openid
    userRecord.date = new Date()

    await db.collection('userRecord').add({
      data: userRecord
    })
    return {
      success: true
    }
  } catch (e) {
    console.error(e)
    return {
      success: false
    }
  }
}
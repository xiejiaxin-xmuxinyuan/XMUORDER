// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  try {
    const openid = wxContext.OPENID
    const res = await db.collection('userFeedbacks').where({
      openid: openid
    })
    .orderBy('date','desc')
    .get()

    return {
      success : true,
      res : res
    }
  } catch (e) {
    return {
      success: false
    }
  }
}
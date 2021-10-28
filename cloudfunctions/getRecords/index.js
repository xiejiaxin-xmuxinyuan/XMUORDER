// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  try{
    const record = await db.collection('userRecord').where({
      _openid: openid
    })
    .orderBy('date','desc')
    .get()
    return {
      success : true,
      record : record
    }
  }catch(e){
    return {
      success : false
    }
  }
  
}
// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _=db.command
const $ = db.command.aggregate
// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const canteen =db.collection('canteen').aggregate()
  .lookup({
    from : 'Food',
    let : {
      cID : '$_id',
      
    }
  })

  return {

  }
}
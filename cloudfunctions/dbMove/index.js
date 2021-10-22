/**
 * 云函数聚合联表查询单个餐厅信息（从food表中获取食物信息）
 * 参数： table: string 表名
 *        _id:  string 要删除记录的_id
 *                    
 * 返回： object 
 *        成功：{success: 1}
 *        失败：{success: 0}
 */

const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  return new Promise((resolve, reject) => {
    db.collection(event.table).doc(event._id)
      .remove()
      .then(res => {
        resolve({
          success: 1
        })
      })
      .catch(e => {
        console.error(e)
        reject({
          success: 0
        })
      })
  })
}
/**
 * 云函数update数据库
 * 参数： table:  数据库表名称
 *        _id:  记录的_id
 *        path: 更新字段的路径字符串 如 'foodList.1' 'foodList.1.food'
 *        formData: 更新的数据 或 数据库命令的参数 如 {name: '新名称', type: '新类型'}
 *        (可选)push: any 
 *                    带有该参数时将执行数据库push命令，
 *                    对path参数连接的数组字段进行push(formData)操作
 *                    相当于 foodList.1.food.push(formData)
 *        (可选)pull: any 
 *                    带有该参数时将执行数据库pull命令
 *                    移除path参数连接的字段
 *                    相当于 foodList.pull(formData)
 *                    
 * 返回： object 
 *        成功：{success: ture, res: 数据库操作的返回值}
 *        失败：{success: false}
 */

const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  return new Promise((resolve, reject) => {
    const table = event.table
    const _id = event._id
    const formData = event.formData
    const path = event.path
    const _ = db.command

    // 之后考虑针对openid判断所属商店管理员身份
    // const wxContext = cloud.getWXContext()
    // const openid = wxContext.OPENID

    if ('push' in event) {
      db.collection(table).doc(_id).update({
          data: {
            [path]: _.push(formData)
          }
        })
        .then(res => {
          resolve({
            success: true,
            res: res
          })
        })
        .catch(e => {
          console.error(e)
          reject({
            success: false
          })
        })
    } else if ('pull' in event) {
      db.collection(table).doc(_id).update({
          data: {
            [path]: _.pull(formData)
          }
        })
        .then(res => {
          resolve({
            success: true,
            res: res
          })
        })
        .catch(e => {
          console.error(e)
          reject({
            success: false
          })
        })
    } else {
      db.collection(table).doc(_id).update({
          data: {
            [path]: formData
          }
        })
        .then(res => {
          resolve({
            success: true,
            res: res
          })
        })
        .catch(e => {
          console.error(e)
          reject({
            success: false
          })
        })
    }
  })
}
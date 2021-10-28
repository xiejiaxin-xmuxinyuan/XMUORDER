/**
 * 云函数修改当前用户信息
 * 参数： 
 *        formData: 更新的数据如 {nickName: '新昵称', address: '新地址', identity: {type:"admin"}}
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

// 云函数入口函数
exports.main = async (event, context) => {
  return new Promise((resolve, reject) => {

    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const formData = event.formData

    db.collection('users').where({
        _openid: openid
      }).update({
        data: formData
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
  })
}
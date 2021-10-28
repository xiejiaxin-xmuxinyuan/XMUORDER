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
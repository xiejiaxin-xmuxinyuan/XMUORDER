const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const outTradeNo = event.outTradeNo

  return new Promise((resolve, reject) => {
    db.collection('orders').where({
        'userInfo.openid': openid,
        'orderInfo.outTradeNo': outTradeNo
      }).get()
      .then(res => {
        if (res.data.length == 1) {
          resolve({
            success: true,
            order: res.data[0]
          })
        } else {
          console.log('查询结果数量不正确:', res.data)
          resolve({
            success: false
          })
        }
      }).catch(err => {
        console.error('错误', err)
        resolve({
          success: false
        })
      })
  })
}
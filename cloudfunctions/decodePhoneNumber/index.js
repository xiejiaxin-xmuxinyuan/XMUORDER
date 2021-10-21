/**
 * 获取用户手机号
 * 参数：object {
 *      phoneNumInfo: wx.cloud.CloudID(cloudID)}
 *      其中 cloudID 通过用户点击字段 open-type="getPhoneNumber" 的按钮获取
 * 返回：用户的手机号码
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  return new Promise((resolve, reject) => {
    if (event.phoneNumInfo.data && event.phoneNumInfo.data.phoneNumber) {
      const phoneNumber = event.phoneNumInfo.data.phoneNumber
      resolve({
        success: true,
        phoneNumber
      })
    } else {
      reject({
        success: false
      })
    }
  })
}
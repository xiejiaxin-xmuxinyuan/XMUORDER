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
  try{
    const wxContext = cloud.getWXContext()
    if (event.phoneNumInfo.data && 
        event.phoneNumInfo.data.phoneNumber) {
      const phoneNumber = event.phoneNumInfo.data.phoneNumber
      return {
        success: true,
        phoneNumber
      }
    }
    else return {
      success: false
    }

  } catch(e) {
    console.error(e)
    return {
      success: false,
      errMsg: e
    }
  }
}
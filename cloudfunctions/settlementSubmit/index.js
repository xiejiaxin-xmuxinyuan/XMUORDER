/**
 * 云函数提交订单
 * 目前仅添加userRecord用户记录
 * 参数： userRecord: object 添加到userRecord表的新记录
 *                    
 * 返回： object 
 *        成功：{success: ture}
 *        失败：{success: false}
 */


const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

 function formatDate(inputTime) { //该函数用于格式化时间戳
  var date = new Date(inputTime);
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  m = m < 10 ? ('0' + m) : m;
  var d = date.getDate();
  d = d < 10 ? ('0' + d) : d;
  var h = date.getHours() + 8;
  h = h < 10 ? ('0' + h) : h;
  var minute = date.getMinutes();
  var second = date.getSeconds();
  minute = minute < 10 ? ('0' + minute) : minute;
  second = second < 10 ? ('0' + second) : second;
  return y + '-' + m + '-' + d + ' ' + h + ':' + minute + ':' + second;
}

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    var userRecord = event.userRecord
    userRecord.openid = openid
    userRecord.date = formatDate(new Date())
    await db.collection('userRecord').add({
      data: userRecord
    })
    return {
      success: true
    }
  } catch (e) {
    console.error(e)
    return {
      success: false
    }
  }
}
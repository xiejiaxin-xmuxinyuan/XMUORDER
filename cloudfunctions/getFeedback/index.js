/**
 *  云函数获取当前用户的反馈
 * 参数 ： 无
 * 返回 ： success : 状态码以显示是否正确返回
 *         res ：用户反馈记录
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  try {
    const openid = wxContext.OPENID
    const res = await db.collection('userFeedbacks').where({
        _openid: openid
      })
      .orderBy('date', 'desc')
      .get()

    return {
      success: true,
      res: res
    }
  } catch (e) {
    return {
      success: false
    }
  }
}
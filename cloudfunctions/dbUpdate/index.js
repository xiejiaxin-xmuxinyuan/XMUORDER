// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 之后考虑针对openid判断所属商店管理员身份
    // const wxContext = cloud.getWXContext()
    // const openid = wxContext.OPENID
    const table = event.table
    const _id = event._id
    const formData = event.formData
    const path = event.path

    if ('push' in event) {
      const _ = db.command
      res = await db.collection(table).doc(_id).update({
        data: {
          [path]: _.push(formData)
        }
      })
    } else {
      res = await db.collection(table).doc(_id).update({
        data: {
          [path]: formData
        }
      })
    }
    return {
      success: true,
      res: res
    }
  } catch (e) {
    console.error(e)
    return {
      success: false
    }
  }
}
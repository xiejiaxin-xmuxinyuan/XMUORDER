/**
 * 云函数update数据库
 * 参数： table:  数据库表名称
 *        _id:  记录的_id
 *        path: 更新字段的路径字符串 如 'foodList.1' 'foodList.1.food'
 *        formData: 更新的数据 如 {name: '新名称', type: '新类型'}
 *        (可选)push: any 
 *                    带有该参数时将执行数据库push命令，
 *                    对path参数连接的数组字段进行push(formData)操作
 *                    相当于 foodList.1.food.push(formData)
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
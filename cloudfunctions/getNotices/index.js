/**
 * 获取数据库notices表中hidden字段为false的数据
 * 参数： 无
 * 返回： object 
 *       如果成功，对象 包含为 true 的 isActive 字段，
 *       以及用户信息字段；
 *       如果用户未登录，对象仅包含为 false 的 isActive 字段。
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})


exports.main = async (event, context) => {
  try {
    const db = cloud.database()

    //读取notices数据
    const countResult = await db.collection('notices').where({
      hidden: false
    }).count()

    const total = countResult.total
    // 计算需分几次取
    const MAX_LIMIT = 20
    const batchTimes = Math.ceil(total / MAX_LIMIT)
    const tasks = []
    for (let i = 0; i < batchTimes; i++) {
      let promise = db.collection('notices').where({
        hidden: false
      }).skip(i * MAX_LIMIT).limit(MAX_LIMIT).get()
      tasks.push(promise)
    }

    const res = (await Promise.all(tasks)).reduce((acc, cur) => {
      return {
        notices: acc.data.concat(cur.data)
      }
    })
    console.log(res)

    return {
      data: res.data,
      success: true
    }
  } catch (e) {
    console.error(e)
    return {
      success: false
    }
  }
}
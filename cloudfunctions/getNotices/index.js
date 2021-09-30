/**
 * 获取数据库notices表中hidden字段为false的数据
 * 参数： 无
 * 返回： object 
 *       若成功 返回对象
 *         res: 以top字段、date字段排序的notices表数据
 *         success: true
 *       若失败 返回对象
 *         success: false
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})


function mysort(a,b){ //辅助函数 用于sort排序
  if(a.top !== b.top){
       return a.top > b.top ? -1 : 1;
   }
   else if(a.date !== b.date){
       return a.date > b.date ? -1 : 1;
   }
   else{
       return 1;
   }
}

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
    res.data.sort(mysort)
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
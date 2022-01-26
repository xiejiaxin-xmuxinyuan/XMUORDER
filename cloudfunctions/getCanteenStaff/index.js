/**
 * 云函数获取指定cID下staff类型用户（获取该商店的员工，不包括管理员）
 * 参数 ：cID：餐厅ID
 *        pageSize(选填)： 每个分页记录数，默认5
 *        currPage(选填)： 当前页序号，默认1
 *        
 * 返回：
 *      (成功)     
 *      object：{ 
 *      success: 1,
 *      staff: 当前分页记录数组,
 *      currPage: 当前页序号,
 *      totalPage: 总页数,
 *      totalCount: 总记录数,
 *      }
 *      (失败)
 *      object: {
 *        success: 0
 *      }
 */

const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command
exports.main = async (event, context) => {
  const cID = event.cID
  const pageSize = "pageSize" in event ? event.pageSize : 5 // 每页数据量
  var currPage = "currPage" in event ? event.currPage : 1 //查询的当前页数
  if (currPage < 1) {
    currPage = 1
  }

  return new Promise((resolve, reject) => {
    db.collection('users')
      .where({
        identity: {
          type: _.in(["member", "admin"]),
          cID: cID
        }
      })
      .count()
      .then(res => {
        const totalCount = res.total
        const totalPage = totalCount === 0 ? 0 : totalCount <= pageSize ? 1 : Math.ceil(totalCount / pageSize)
        if (totalPage === 0) { //如果没有任何记录
          resolve({
            success: true,
            staff: [],
            currPage: currPage,
            totalPage: totalPage,
            totalCount: totalCount,
          })
          return
        }

        if (currPage > totalPage) {
          currPage = totalPage
        }

        db.collection('users').where({
            identity: {
              type: _.in(["member", "admin"]),
              cID: cID
            }
          }).skip((currPage - 1) * pageSize).limit(pageSize).get()
          .then(res => {
            resolve({
              success: true,
              staff: res.data,
              currPage: currPage,
              totalPage: totalPage,
              totalCount: totalCount,
            })
            return
          })
          .catch(e => {
            console.error(e)
            reject({
              success: false
            })
            return
          })
      })
  })
}
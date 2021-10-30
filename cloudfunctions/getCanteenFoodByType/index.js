const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()


exports.main = async (event, context) => {
  const cID = event.cID
  const typeName = event.typeName
  const pageSize = "pageSize" in event ? event.pageSize : 5 // 每页数据量
  var currPage = "currPage" in event ? event.currPage : 1 //查询的当前页数

  return new Promise((resolve, reject) => {
    db.collection('food')
      .where({
        cID: cID,
        typeName: typeName
      })
      .count()
      .then(res => {
        const totalCount = res.total
        const totalPage = totalCount === 0 ? 0 : totalCount <= pageSize ? 1 : Math.ceil(totalCount / pageSize)

        if (totalPage === 0) { //如果没有任何记录
          resolve({
            success: true,
            food: [],
            currPage: currPage,
            totalPage: totalPage,
            totalCount: totalCount,
          })
        }

        if (currPage > totalPage) {
          currPage = totalPage
        }

        db.collection('food')
          .where({
            cID: cID,
            typeName: typeName
          })
          .skip((currPage - 1) * pageSize)
          .limit(pageSize)
          .get()
          .then(res => {
            resolve({
              success: true,
              food: res.data,
              currPage: currPage,
              totalPage: totalPage,
              totalCount: totalCount,
            })
          })
          .catch(e => {
            console.error(e)
            reject({
              success: false
            })
          })
      })
  })
}
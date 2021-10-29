// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = _.aggregate

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const pageSize = "pageSize" in event ? event.pageSize : 5 // 每页数据量
  const currPage = "currPage" in event ? event.currPage : 1 //查询的当前页数
  return new Promise((resolve, reject) => {
    db.collection('userRecord')
      .where({
        openid: openid
      })
      .count()
      .then(res => {
        const totalCount = res.total
        const totalPage = totalCount === 0 ? 0 : totalCount <= pageSize ? 1 : Math.ceil(totalCount / pageSize)

        if (currPage > totalPage) {
          resolve({
            success: true,
            record: [],
            currPage: currPage,
            totalPage: totalPage,
            totalCount: totalCount,
          })
        }

        db.collection('userRecord').aggregate()
          .match({
            openid: openid
          })
          .sort({ //日期字符串从大到小排序
            date: -1
          })
          .skip((currPage - 1) * pageSize)
          .limit(pageSize)
          .lookup({
            let: {
              id: '$_id'
            },
            from: 'userFeedbacks',
            pipeline: $.pipeline()
              .match(_.expr($.and([ //匹配openid和rID
                $.eq(['$_openid', openid]),
                $.eq(['$rID', '$$id'])
              ])))
              .replaceRoot({ //只显示state
                newRoot: {
                  state: '$state'
                }
              })
              .done(),
            as: 'feedback' //临时位置
          })
          .end()
          .then(res => {
            resolve({
              success: true,
              record: res.list,
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
      .catch(e => {
        console.error(e)
        reject({
          success: false
        })
      })


  })
}
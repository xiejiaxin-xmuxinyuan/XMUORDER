// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = _.aggregate

exports.main = async (event, context) => {
  return new Promise((resolve, reject) => {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    db.collection('userRecord').aggregate()
      .match({
        openid: openid
      })
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
      .sort({ //日期字符串从大到小排序
        date: -1
      })
      .end()
      .then(res => {
        resolve({
          success: true,
          record: res.list
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
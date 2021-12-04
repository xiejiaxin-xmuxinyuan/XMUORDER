/**
 * 云函数用于获取当前用户订单记录
 * 参数 ： pageSize(选填)： 每个分页记录数，默认5
 *        currPage(选填)： 当前页序号，默认1
 * 返回：
 *      (成功)     
 *      object：{ 
 *      success: 1,
 *      record: 当前分页记录数组（若当前页无记录返回空数组）,
 *      currPage: 当前页序号,
 *      totalPage: 总页数,
 *      totalCount: 总记录数,
 *      }
 *      (失败)
 *      object: {
 *        success: 1
 *      }
 */
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
    db.collection('orders')
      .where({
        'userInfo.openid': openid
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

        db.collection('orders').aggregate()
          .match({
            'userInfo.openid': openid
          })
          .sort({ //日期字符串从大到小排序
            'orderInfo.timeInfo.createTime': -1
          })
          .skip((currPage - 1) * pageSize)
          .limit(pageSize)
          .lookup({ //联表查询订单用户反馈 state
            let: {
              outTradeNo: '$orderInfo.outTradeNo'
            },
            from: 'userFeedbacks',
            pipeline: $.pipeline()
              .match(_.expr($.and([ //匹配openid和rID
                $.eq(['$_openid', openid]),
                $.eq(['$outTradeNo', '$$outTradeNo'])
              ])))
              .replaceRoot({ //只显示state
                newRoot: {
                  state: '$state'
                }
              })
              .done(),
            as: 'feedback'
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
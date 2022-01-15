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

  try {
    //计算分页
    const countRes = await db.collection('orders').where({
      'userInfo.openid': openid
    }).count()
    const totalCount = countRes.total
    const totalPage = totalCount === 0 ? 0 : totalCount <= pageSize ? 1 : Math.ceil(totalCount / pageSize)

    if (currPage > totalPage) {
      return {
        success: true,
        record: [],
        currPage: currPage,
        totalPage: totalPage,
        totalCount: totalCount,
      }
    }

    const ordersRes = await db.collection('orders').aggregate().match({
        'userInfo.openid': openid
      }).sort({
        'orderInfo.timeInfo.createTime': -1,
      }).skip((currPage - 1) * pageSize).limit(pageSize)
      .addFields({ //食物封面
        foodIDs: $.reduce({
          input: '$goodsInfo.record',
          initialValue: [],
          in: $.concatArrays(['$$value', ['$$this._id']]),
        })
      }).lookup({
        let: {
          foodIDs: '$foodIDs'
        },
        from: 'food',
        pipeline: $.pipeline()
          .match(_.expr(
            $.in(['$_id', '$$foodIDs'])
          )).project({
            coverImg: 1
          }).done(),
        as: 'foodImg'
      }).lookup({
        let: {
          outTradeNo: '$orderInfo.outTradeNo'
        },
        from: 'userFeedbacks',
        pipeline: $.pipeline()
          .match(_.expr(
            $.eq(['$outTradeNo', '$$outTradeNo'])
          )).replaceRoot({
            newRoot: {
              state: '$state',
              feedback: '$feedback',
              canteenFeedback: '$canteenFeedback'
            }
          }).done(),
        as: 'feedback'
      })
      .end()

    console.log(ordersRes.list[0])
    var orders = ordersRes.list
    orders.forEach(order => {
      //反馈
      if (order.feedback.length) {
        order.feedback = order.feedback[0]
      } else {
        delete order.feedback
      }

      //id转图片链接对象
      var idToImg = {}
      order.foodImg.forEach(food => {
        idToImg[food._id] = food.coverImg
      })
      // 填充order中food对应的封面链接
      order.goodsInfo.record.forEach(food => {
        if (food._id in idToImg) {
          food.img = idToImg[food._id]
        } else {
          food.img = 'cloud://cloud1-4g4b6j139b4e50e0.636c-cloud1-4g4b6j139b4e50e0-1307666009/noImg.svg'
        }
      })
    })

    return {
      success: true,
      record: orders,
      currPage: currPage,
      totalPage: totalPage,
      totalCount: totalCount,
    }
  } catch (e) {
    console.error(e)
    return {
      success: false
    }
  }
}
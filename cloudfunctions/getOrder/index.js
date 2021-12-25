const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command
const $ = _.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const outTradeNo = event.outTradeNo

  return new Promise((resolve, reject) => {
    db.collection('orders').aggregate().match({
        'userInfo.openid': openid,
        'orderInfo.outTradeNo': outTradeNo
      }).addFields({
        foodIDs: $.reduce({
          input: '$goodsInfo.record',
          initialValue: [],
          in: $.concatArrays(['$$value', ['$$this._id']]),
        })
      })
      .lookup({
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
      }).project({
        foodIDs: 0
      })
      .end().then(res => {
        var order = res.list[0]
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
        delete order.foodImg //删除无用属性

        resolve({
          success: true,
          order: order
        })
      })
  })
}
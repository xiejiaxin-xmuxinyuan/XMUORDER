const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const outTradeNo = event.outTradeNo

  return new Promise((resolve, reject) => {
    db.collection('orders').where({
      'userInfo.openid': openid,
      'orderInfo.outTradeNo': outTradeNo
    }).get().then(res => {
      if (res.data.length == 1) {
        var order = res.data[0]
        // 读取食物封面
        var foodIDs = []
        order.goodsInfo.record.forEach(food => {
          foodIDs.push(food._id)
        })

        db.collection('food').where({
          _id: _.in(foodIDs)
        }).field({
          coverImg: true
        }).get().then(res => {
          //id转图片链接对象
          var idToImg = {}
          res.data.forEach(food => {
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

          resolve({
            success: true,
            order: order
          })
        }).catch(err => {
          console.error('错误', err)
          resolve({
            success: false
          })
        })
      } else {
        console.log('查询结果数量不正确:', res.data)
        resolve({
          success: false
        })
      }
    }).catch(err => {
      console.error('错误', err)
      resolve({
        success: false
      })
    })
  })
}
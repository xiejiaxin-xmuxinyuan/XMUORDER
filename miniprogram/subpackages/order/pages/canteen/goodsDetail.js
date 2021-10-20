var that
const app = getApp()

Page({

  data: {
    canteen: {},
    food: {},
    favourCount: 0,
    badCount: 0
  },

  onLoad: function (options) {
    that = this
    var canteen = app.globalData.canteens[options.cIndex]
    var food = canteen.foodList[options.index1].food[options.index2]

    var favourCount = 0
    var badCount = 0
    food.comment.forEach(element => {
      if (element.score > 0) {
        favourCount++
      } else if (element.score < 0) {
        badCount++
      }
    })


    that.setData({
      canteen: canteen,
      food: food,
      favourCount: favourCount,
      badCount: badCount
    })
  },
  preview: event => {
    let img = event.currentTarget.dataset.img
    wx.previewImage({
      urls: [img]
    })
  }
})
const app = getApp()
const db = wx.cloud.database()
var that

Page({
  data: {
    canteen: {},
    identity: {},
    food: {},
    index1: null,
    index2: null,
    oldImg: ''
  },

  onLoad: function (options) {
    that = this
    let index0 = options.index0
    let index1 = options.index1
    let index2 = options.index2

    var canteen = app.globalData.canteens[index0]
    const identity = app.globalData.identity
    var food = canteen.foodList[index1].food[index2]
    that.setData({
      canteen,
      identity,
      food,
      index1,
      index2
    })
  },
  ChooseImage: function (e) {
    wx.chooseImage({
        count: 1, //默认9
        sizeType: 'compressed'
      })
      .then(res => {
        // TODO: 使用canvas进行压缩
        that.setData({
          ['food.img']: res.tempFilePaths[0],
        })
      })
      .catch(res => {
        wx.showToast({
          title: '图片选择取消',
          icon: 'none',
          duration: 1000
        })
      })
  },
  ViewImage: function (e) {
    wx.previewImage({
      urls: [that.data.food.img],
    });
  },
  DelImg: function (e) {
    wx.showModal({
      title: '移除图片',
      content: '确定要移除这张图片吗',
      cancelText: '否',
      confirmText: '是',
      success: res => {
        if (res.confirm) {
          that.setData({
            ['food.img']: '',
          oldImg: that.data.food.img
          })
        }
      }
    })
  },
})
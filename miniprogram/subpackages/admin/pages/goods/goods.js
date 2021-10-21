// subpackages/admin/pages/goods/goods.js
const app = getApp()
const db = wx.cloud.database()
var that

Page({

  data: {
    identity: {},
    canteens: [],
    shopPickerList: [],
    foodTypePickerList: [],
    shopPickerIndex: null,
    foodTypePickerIndex: null
  },

  onLoad: function (options) {
    that = this

    var canteens = app.globalData.canteen
    var shopPickerList = []
    const identity = app.globalData.identity

    canteens.forEach((canteen, index) => {
      shopPickerList.push(canteen.name)
      if (identity.type === 'admin' || identity.type === 'member') {
        if (canteen.cID === identity.cID) {
          that.shopPickerChange(null, index)
        }
      }
    })

    that.setData({
      canteens: canteens,
      shopPickerList: shopPickerList,
      identity: identity
    })

    //营业期间禁止删除商品（避免点餐页刷新时商品排序错乱）
  },
  shopPickerChange: function (e, setIndex = -1) {
    if (setIndex >= 0) {
      var index = setIndex
    } else {
      var index = e.detail.value
    }

    var foodList = app.globalData.canteen[index].foodList
    var foodTypePickerList = []
    foodList.forEach(element => {
      foodTypePickerList.push(element.name)
    })

    that.setData({
      shopPickerIndex: index,
      foodTypePickerIndex: null,
      foodTypePickerList: foodTypePickerList
    })
  },
  foodTypePickerChange: function (e) {
    that.setData({
      foodTypePickerIndex: e.detail.value
    })
  },
  toAddGood: function (e) {
    wx.navigateTo({
      url: './addGood',
    })
  }
})
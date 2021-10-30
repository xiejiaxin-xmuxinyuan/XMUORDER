// subpackages/admin/pages/shop/shop.js
var that
const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    canteen : [],
    identity:{},
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    that.setData({
      identity : app.globalData.identity
    })
    console.log(app.globalData)
  },
})
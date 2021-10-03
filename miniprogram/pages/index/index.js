// pages/welcome/welcome.js
var that
var app = getApp()

Page({

  data: {
    identity: null
    // 管理员admin 员工staff？
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    app.init()
      .then(globalData => {
        that.setData({
          identity: globalData.identity
        })
      })
      .catch(err => {
        console.error(err)
      })
  },
  redictoUser: function (e) {
    wx.redirectTo({
      url: '../../subpackages/order/pages/index/index',
    })
  },
  redictoAdmin: function (e) {
    wx.navigateTo({
      url: '../../subpackages/admin/pages/index/index',
    })
  }
})
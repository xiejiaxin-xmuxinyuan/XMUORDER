// pages/welcome/welcome.js
var that
const app = getApp()

Page({

  data: {
    identity: null,
    //"unregistered"说明未注册身份
    //对象说明已注册
    // 管理员admin 员工member 超级管理员superAdmin
    img: ''
  },

  onLoad: function (options) {
    that = this
    wx.showLoading({
      title: '获取信息中',
    })
    app.init()
      .then(() => {
        that.setData({
          identity: app.globalData.identity,
          img: app.globalData.img
        })
        wx.hideLoading()
      })
      .catch(err => {
        wx.hideLoading()
        console.error(err)
      })
  },
  redictoUser: function (e) {
    wx.redirectTo({
      url: '../../subpackages/order/pages/index/index',
    })
  },
  toAdmin: function (e) {
    wx.navigateTo({
      url: '../../subpackages/admin/pages/index/index',
    })
  }
})
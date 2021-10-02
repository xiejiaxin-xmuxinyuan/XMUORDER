// pages/welcome/welcome.js
var that
var app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    identity: 'staff'
    // identity: null
    // 管理员admin 员工staff？
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    //globalData问题待解决
    // console.log(that.data.identity)
    // that.setData({
    //   identity: app.globalData.identity
    // })
  },
  redictoUser: function(e){
    wx.redirectTo({
      url: '../../subpackages/order/pages/index/index',
    })
  },
  redictoAdmin: function(e){
    wx.redirectTo({
      url: '../../subpackages/admin/pages/index/index',
    })
  }
})
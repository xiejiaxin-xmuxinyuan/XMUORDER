// pages/notice_detail/notice_detail.js
const app = getApp()
var that
const db = wx.cloud.database()

Page({
  data: {
    notice: {}
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    //读取公告详情
    that.setData({
      notice: app.globalData.notice
    })
  }
})
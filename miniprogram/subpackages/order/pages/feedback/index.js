// subpackages/order/pages/feedback/index.js
var that
const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    records:[]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var that = this
    wx.cloud.callFunction({
      name:'getFeedback',
    }).then(res => {
      that.setData({
        records : res.result.res.data
      })
    })
  },
})
// pages/canteen/canteen.js
var that
const db = wx.cloud.database()
const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    canteen:{}
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    that.setData({
      canteen : app.globalData.canteen
    })
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

})
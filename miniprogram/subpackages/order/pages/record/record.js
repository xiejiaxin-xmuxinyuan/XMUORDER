// subpackages/order/pages/record/record.js
var that
const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    record: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    wx.cloud.callFunction({
      name: 'getRecords',
      success(res) {
        if (res.result.success) {
          that.setData({
            record: res.result.record.data
          })
        } else {
          wx.showModal({
            showCancel: false,
            title: '错误',
            content: '获取订单失败',
            success(res) {
              if (res.confirm) {
                wx.navigateBack({
                  delta: 1,
                })
              }
            }
          })
        }
      }
    })
  },


  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})
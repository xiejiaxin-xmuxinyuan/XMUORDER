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
    wx.showLoading({
      title: '加载中',
    })
    wx.cloud.callFunction({
      name: 'getRecords',
      success(res) {
        wx.hideLoading()
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
  feedback:function(e){
    var record = e.currentTarget.dataset.record
    console.log(record)
  }
})
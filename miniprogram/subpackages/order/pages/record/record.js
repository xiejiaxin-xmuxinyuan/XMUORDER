// subpackages/order/pages/record/record.js
var util = require('../../../../utils/util.js')
var that
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
    util.showLoading('加载中')
    wx.cloud.callFunction({
        name: 'getRecords',
      }).then(res => {
        util.hideLoading()
        if (res.result.success) {
          that.setData({
            record: res.result.record
          })
        } else {
          util.showToast('加载失败', 'error')
          setTimeout(() => {
            wx.navigateBack({
              delta: 1,
            })
          }, 1000);
        }
      })
      .catch(e => {
        util.hideLoading()
        util.showToast('加载失败', 'error')
        setTimeout(() => {
          wx.navigateBack({
            delta: 1,
          })
        }, 1000);
      })
  },
  feedback: function (e) {
    var record = that.data.record[e.currentTarget.dataset.index]
    record = JSON.stringify(record)
    wx.navigateTo({
      url: '../feedback/feedback?record=' + record,
    })
  }
})
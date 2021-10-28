// subpackages/order/pages/feedback/feedback.js
var that

Page({

  /**
   * 页面的初始数据
   */
  data: {
    record: {},
    haveRecord: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this

    if ('record' in options) {
      var record = JSON.parse(options.record)
      that.setData({
        record: record,
        haveRecord: true
      })
    } else {
      that.setData({
        haveRecord: false
      })
    }

  },
  onSubmit: function (e) {
    var record = that.data.record
    var feedback = e.detail.value.feedback
    wx.showLoading({
      title: '提交中',
    })
    wx.cloud.callFunction({
      name: 'submitFeedback',
      data: {
        record: record,
        feedback: feedback
      }
    }).then(res => {
      wx.hideLoading()
      wx.showModal({
        showCancel : false,
        content : '提交成功',
        success(res){
          if(res.confirm){
            wx.navigateBack({
              delta: 1,
            })
          }
        }
      })
    })
  }
})
var util = require('../../../../utils/util.js')
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
    if (!feedback.length) {
      util.showToast('请输入意见内容')
      return
    }

    util.showLoading('提交中')
    wx.cloud.callFunction({
        name: 'submitFeedback',
        data: {
          record: record,
          feedback: feedback
        }
      }).then(res => {
        wx.hideLoading()
        if (res.result.success) {
          util.showToast('提交成功', 'success')
          setTimeout(() => {
            wx.navigateBack()
          }, 1000);
        } else {
          util.showToast('提交失败', 'error')
        }
      })
      .catch(e => {
        util.showToast('提交失败', 'error')
      })
  }
})
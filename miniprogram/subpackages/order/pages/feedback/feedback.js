var util = require('../../../../utils/util.js')
var that
var feedback

Page({
  data: {
    info: {},
    refund: false
  },

  onLoad: function (options) {
    that = this
    var info = JSON.parse(options.info)
    that.setData({
      info: info,
    })
  },
  checkboxChange: function (e) {
    that.setData({
      refund: !that.data.refund
    })
  },

  onSubmit: function (e) {
    feedback = e.detail.value.feedback // 全局的feedback
    if (feedback.length > 0) {
      that.setData({
        'info.feedback': feedback
      })
    } else {
      util.showToast('请输入意见内容')
    }
  },
  submitBtn: function (e) {
    wx.requestSubscribeMessage({
      tmplIds: ['tVCBMu_fvNP7JrFAWTNhnElMKeS3GG-Fg7q2KI7IZdM']
    }).then(res => {
      setTimeout(() => { // 保证onSubmit已将feedback修改
        const info = that.data.info
        if (feedback.length) {
          util.showLoading('提交中')
          wx.cloud.callFunction({
              name: 'submitFeedback',
              data: {
                outTradeNo: info.outTradeNo,
                date: info.formatedTime,
                feedback: feedback,
                refund: that.data.refund,
                cID: info.shopInfo.cID,
                record: info.record,
                feeInfo: info.feeInfo
              }
            }).then(res => {
              wx.hideLoading()
              if (res.result.success) {
                util.showToast('提交成功', 'success')
                setTimeout(() => {
                  wx.navigateBack({
                    delta: 1,
                  })
                }, 1000);
              } else {
                util.showToast('提交失败', 'error')
                setTimeout(() => {
                  wx.navigateBack({
                    delta: 1,
                  })
                }, 1000);
              }
            })
            .catch(e => {
              wx.hideLoading()
              util.showToast('提交失败', 'error')
              setTimeout(() => {
                wx.navigateBack({
                  delta: 1,
                })
              }, 1000);
            })
        }
      }, 200);
    })
  }
})
var util = require('../../../../utils/util.js')
var that

Page({
  data: {
    order: {}
  },

  onLoad: function (options) {
    that = this
    var data = JSON.parse(options.data)
    const outTradeNo = data.outTradeNo
    util.showLoading('加载中')
    wx.cloud.callFunction({
        name: 'getOrder',
        data: {
          outTradeNo: outTradeNo
        }
      }).then(res => {
        util.hideLoading()
        if (res.result.success) {
          that.setData({
            order: res.result.order
          })
        } else {
          util.showToast('加载失败', 'error')
        }
      })
      .catch(e => {
        util.hideLoading()
        util.showToast('加载失败', 'error')
      })



  },

})
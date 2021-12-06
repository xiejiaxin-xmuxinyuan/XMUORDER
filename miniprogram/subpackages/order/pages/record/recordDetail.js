var util = require('../../../../utils/util.js')
var that

Page({
  data: {
    order: { //预渲染信息
      payInfo: {
        feeInfo: {
          otherFee: 0,
          discount: 0,
          cashFee: 0
        },
      },
      orderInfo: {
        orderStateMsg: '加载中',
      }
    }
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
          let order = res.result.order
          if ('payTime' in order.orderInfo.timeInfo) {
            order.orderInfo.timeInfo.formatedPayTime =
              that.strDateFormat(order.orderInfo.timeInfo.payTime)
          }
          if ('confirmTime' in order.orderInfo.timeInfo) {
            order.orderInfo.timeInfo.formatedConfirmTime =
              that.strDateFormat(order.orderInfo.timeInfo.confirmTime)
          }
          if ('endTime' in order.orderInfo.timeInfo) {
            order.orderInfo.timeInfo.formatedEndTime =
              that.strDateFormat(order.orderInfo.timeInfo.endTime)
          }
          that.setData({
            order: order
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
  strDateFormat: strDate => { //14位日期转yyyy-MM-dd hh:mm:ss
    var regExp = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/;
    var formatTime = '$1-$2-$3 $4:$5:$6';
    return strDate.replace(regExp, formatTime)
  }
})
var util = require('../../../../utils/util.js')
var that

function getNonceStr() {
  var out = ''
  for (let i = 0; i < 4; i++) {
    out += Math.random().toString(36).slice(-4)
  }
  return out
}

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
    that.getOrder(outTradeNo)
  },
  strDateFormat: strDate => { //14位日期转yyyy-MM-dd hh:mm:ss
    var regExp = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/;
    var formatTime = '$1-$2-$3 $4:$5:$6';
    return strDate.replace(regExp, formatTime)
  },
  payOrder: function (e) {
    util.showLoading('正在支付')
    const outTradeNo = that.data.order.orderInfo.outTradeNo
    const payment = that.data.order.orderInfo.payment
    wx.requestPayment({
      ...payment
    }).then(res => { //支付成功
      util.showLoading('核实订单中')
      //云函数查单
      that.orderQuery('1616983338', outTradeNo, getNonceStr())
    }).catch(err => { //支付出错
      if (err.errMsg !== 'requestPayment:fail cancel') { //非取消支付报错则进行查单
        util.showLoading('核实订单中')
        //云函数查单
        that.orderQuery('1616983338', outTradeNo, getNonceStr())
      } else { // 用户取消支付
        wx.hideLoading()
        util.showToast('订单未支付', 'error')
      }
    })
  },
  orderQuery: function (sub_mch_id, out_trade_no, nonce_str) {
    wx.cloud.callFunction({
      name: 'payOrderQuery',
      data: {
        sub_mch_id: sub_mch_id,
        out_trade_no: out_trade_no,
        nonce_str: nonce_str
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.success) {
        let resInfo = res.result.info
        if (resInfo.tradeState === 'SUCCESS') { //结果是支付成功
          util.showToast('支付成功', 'success')
        } else {
          util.showToast('订单未支付')
        }
      } else {
        util.showToast('订单核实失败')
      }
      //刷新订单详情
      setTimeout(() => {
        that.refreshOrder()
      }, 1000)
    }).catch(e => {
      wx.hideLoading()
      util.showToast('订单核实失败')
      //刷新订单详情
      setTimeout(() => {
        that.refreshOrder()
      }, 1000)
    })
  },
  getOrder: function (outTradeNo) {
    util.showLoading('加载中')
    wx.cloud.callFunction({
        name: 'getOrder',
        data: {
          outTradeNo: outTradeNo
        }
      }).then(res => {
        wx.hideLoading()
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
  refreshOrder: function (e) {
    const outTradeNo = that.data.order.orderInfo.outTradeNo
    that.getOrder(outTradeNo)
  },
  cancelOrder: function (e) {
    util.showLoading('取消订单中')
    const order = that.data.order

    wx.cloud.callFunction({
        name: 'payOrderCancel',
        data: {
          outTradeNo: order.orderInfo.outTradeNo,
        }
      }).then(res => {
        util.hideLoading()
        if (res.result.success) {
          util.showToast('订单取消成功', 'success')
        } else {
          util.showToast('订单取消失败', 'error')
        }
        setTimeout(() => {
          that.refreshOrder()
        }, 1000);
      })
      .catch(e => {
        util.hideLoading()
        util.showToast('订单取消失败', 'error')
      })
  }
})
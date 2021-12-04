var util = require('../../../../utils/util.js')
var that
const app = getApp()
Page({

  data: {
    orderList: {},
    foodList: [],
    user: {},
    curTime: '',
    timeToPick: ['7:00', '7:30', '8:30', '11:00', '12:00', '12:30', '17:30', '18:00', '18:30'],
    pickedIndex: null,
    totalPrice: 0,
    isTimePick: false
  },


  onLoad: function (options) {
    that = this
    var user = {
      name: app.globalData.name,
      phone: app.globalData.phone,
      address: app.globalData.address
    }
    that.setData({
      orderList: app.globalData.settlement.orderList,
      foodList: app.globalData.settlement.foodList,
      canteen: app.globalData.settlement.canteen,
      money: app.globalData.settlement.money,
      user: user
    })
    that.timeAbleToPick() // 根据当前时间修改可选的点餐时间

  },
  timePickerChange: function (e) {
    that.setData({
      isTimePick: true,
      pickedIndex: e.detail.value
    })
  },
  timeAbleToPick: function (e) { //修改可选的点餐时间
    var timeList = that.data.timeToPick
    var timeToPick = []
    const curTime = getCurTime() //当前时间
    const intCurTime = parseInt(curTime.replace(':', ''))

    for (let i = 0; i < timeList.length; i++) {
      let time = timeList[i];
      let intTime = parseInt(time.replace(':', ''))
      if (intTime > intCurTime) {
        timeToPick.push(time)
      }
    }

    // 体验版过渡
    if (timeToPick.length <= 0) {
      timeToPick.push('无')
    }

    that.setData({
      curTime: curTime,
      timeToPick: timeToPick
    })
  },
  settlementSubmit: function (e) {
    const orderList = that.data.orderList
    const foodList = that.data.foodList
    const canteen = that.data.canteen
    const user = that.data.user

    if (!that.data.isTimePick) {
      util.showToast('时间未选择', 'error')
    } else {
      //构造订单数据
      const goodsPrice = that.data.money * 100
      const otherFee = 0 //打包费等等（单位分）
      const discount = 0 //优惠

      var orderInfo = {
        userInfo: { //用户信息
          openid: undefined,
          name: user.name,
          phone: user.phone
        },
        payInfo: { //支付信息
          feeInfo: { //金额信息
            goodsPrice: goodsPrice,
            otherFee: otherFee,
            discount: discount,
            totalFee: goodsPrice + otherFee, //不包括优惠的总费用
            cashFee: goodsPrice + otherFee - discount //实付款
          },
          tradeState: "NOTPAY",
          tradeStateMsg: "未支付"
        },
        goodsInfo: { //商品信息
          shopInfo: {
            cID: canteen.cID,
            name: canteen.name,
            subMchId: '1616983338'
          },
          record: []
        },
        getFoodInfo: {
          time: that.data.timeToPick[that.data.pickedIndex],
          place: canteen.name + "默认取餐点",
          getState: 'NOTGET',
          getStateMsg: '未取餐'
        },
        orderInfo: {
          timeInfo: {
            createTime: undefined,
            payTime: undefined,
            receiveTime: undefined,
            endTime: undefined
          },
          outTradeNo: undefined,
          orderState: 'NOTPAY',
          orderStateMsg: '未支付',
          pollingTimes: 0 //被轮询查单的次数
        }
      }

      //填充商品信息中的商品记录 orderInfo.goodsInfo.record
      for (const key in orderList) {
        if (key === 'length' || key === 'delete') {
          continue
        }
        let food = foodList[orderList[key][1]].food[orderList[key][2]]
        let foodRecord = {
          food: food.name,
          num: food.orderNum,
          price: food.price,
          img: food.img
        }
        orderInfo.goodsInfo.record.push(foodRecord)
      }

      //请求下单
      wx.showLoading({
        title: '提交订单中',
        mask: true
      })
      wx.cloud.callFunction({
          name: 'payOrder',
          data: {
            orderInfo: orderInfo,
            order: {
              subMchId: '1616983338',
              body: canteen.name + "-订餐",
              totalFee: orderInfo.payInfo.feeInfo.totalFee
            }
          }
        })
        .then(payOrderRes => {
          wx.hideLoading()
          if (!payOrderRes.result.success) { //下单失败
            util.showToast('订单提交失败', 'error')
            return
          }

          //下单成功
          //返回退出canteen页面后会清空当前餐厅购物车
          app.globalData.allOrderList[canteen.cID].delete = true

          //发起支付
          util.showLoading('正在支付')
          wx.requestPayment({
              ...payOrderRes.result.payment, //  ...是展开符
            })
            .then(res => { //支付成功
              util.showLoading('核实订单中')

              //云函数查单
              const outTradeNo = payOrderRes.result.outTradeNo
              let nonceStr = payOrderRes.result.payment.nonceStr
              that.orderQuery('1616983338', outTradeNo, nonceStr)
                .then(() => { //进入支付成功页面
                  setTimeout(() => {
                    wx.navigateTo({
                      url: '../order/paySuccess',
                    })
                  }, 1000)
                })
                .catch(() => { //进入订单支付详情页面
                  setTimeout(() => {
                    wx.navigateTo({
                      url: '../order/payOrder',
                    })
                  }, 1000)
                })
            })
            .catch(err => { //支付出错
              if (err.errMsg !== 'requestPayment:fail cancel') { //非取消支付报错则进行查单
                util.showLoading('核实订单中')
                //云函数查单
                const outTradeNo = payOrderRes.result.outTradeNo
                let nonceStr = payOrderRes.result.payment.nonceStr
                that.orderQuery('1616983338', outTradeNo, nonceStr)
                  .then(() => { //进入支付成功页面
                    setTimeout(() => {
                      wx.navigateTo({
                        url: '../order/paySuccess',
                      })
                    }, 1000)
                  })
                  .catch(() => { //进入订单支付详情页面
                    setTimeout(() => {
                      wx.navigateTo({
                        url: '../order/payOrder',
                      })
                    }, 1000)
                  })
              } else {
                wx.hideLoading()
                util.showToast('订单未支付', 'error')
                setTimeout(() => { //进入订单支付详情页面
                  wx.navigateTo({
                    url: '../order/payOrder',
                  })
                }, 1000)
              }
            })
        })
        .catch(err => {
          wx.hideLoading()
          util.showToast('订单提交失败', 'error')
        })
    }
  },
  orderQuery: function (sub_mch_id, out_trade_no, nonce_str) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
          name: 'payOrderQuery',
          data: {
            sub_mch_id: sub_mch_id,
            out_trade_no: out_trade_no,
            nonce_str: nonce_str
          }
        })
        .then(res => {
          wx.hideLoading()
          if (res.result.success) {
            let resInfo = res.result.info
            if (resInfo.tradeState === 'SUCCESS') { //结果是支付成功
              util.showToast('支付成功', 'success')
              resolve() //表明进入支付成功页面
            } else {
              util.showToast('订单未支付')
              reject() //表明进入订单支付详情页面
            }
          } else {
            util.showToast('订单核实失败')
            reject() //表明进入订单支付详情页面
          }
        })
        .catch(e => {
          wx.hideLoading()
          util.showToast('订单核实失败')
          reject() //表明进入订单支付详情页面
        })
    })
  }
})

function dateToStrTime(date) {
  let h = date.getHours().toString().padStart(2, '0')
  let m = date.getMinutes().toString().padStart(2, '0')
  return h + ':' + m
}

function getCurTime() {
  return dateToStrTime(new Date())
}
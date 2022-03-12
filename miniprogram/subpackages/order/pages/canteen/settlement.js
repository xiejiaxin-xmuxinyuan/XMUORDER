var util = require('../../../../utils/util.js')
var that
const app = getApp()

var outTradeNo //订单号
var isTimePick = false
Page({

  data: {
    orderList: {},
    foodList: [],
    user: {},
    curTime: '',
    timeToPick: ['7:00', '7:30', '8:30', '11:00', '12:00', '12:30', '17:30', '18:00', '18:30'],
    pickedIndex: null,
    goodsPrice: 0, //食物价格（单位元）
    otherFee: 0, //打包费等等（单位元）
    discount: 0, //优惠（单位元）
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
      goodsPrice: app.globalData.settlement.money,
      user: user
    })
    that.timeAbleToPick() // 根据当前时间修改可选的点餐时间

  },
  timePickerChange: function (e) {
    isTimePick = true
    that.setData({
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

    if (!isTimePick) {
      util.showToast('时间未选择', 'error')
    } else {
      // 订阅门店接单和订单取消通知
      wx.requestSubscribeMessage({
        tmplIds: [
          'EOEOyGE1Fzxu26ciatAHZ20fJgjV8m2yM5fa1TbNKwU',
          'Q_EQhMx9pJeohoPN3oln0_ZIAqGDj_yJyilqOnwkYfY',
          'jPQAKJ_VRCc6FP-wBCJiJQxDA7Mhl9KmM2rmx7PiXBU'
        ]
      }).then(res => {
        //构造订单数据
        const goodsPrice = parseInt(that.data.goodsPrice * 100)
        const otherFee = parseInt(that.data.otherFee * 100) //打包费等等（单位分）
        const discount = parseInt(that.data.discount * 100) //优惠

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
              totalFee: parseInt(goodsPrice + otherFee), //不包括优惠的总费用
              cashFee: parseInt(goodsPrice + otherFee - discount) //实付款
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
            timeInfo: {},
            orderState: 'NOTPAY',
            orderStateMsg: '未支付',
            pollingTimes: 0, //被轮询查单的次数
            confirmPollingTimes: 0 //被轮询是否接单的次数
          }
        }

        //填充商品信息中的商品记录 orderInfo.goodsInfo.record
        for (const key in orderList) {
          if (key === 'length') {
            continue
          }
          let food = foodList[orderList[key][1]].food[orderList[key][2]]
          let foodRecord = {
            food: food.name,
            num: food.orderNum,
            price: food.price,
            _id: food._id
          }
          orderInfo.goodsInfo.record.push(foodRecord)
        }

        //请求下单
        util.showLoading('提交订单中')
        wx.cloud.callFunction({
            name: 'payOrder',
            data: {
              orderInfo: orderInfo,
              order: {
                subMchId: '1616983338',
                body: canteen.name + "-食堂",
                totalFee: orderInfo.payInfo.feeInfo.totalFee
              }
            }
          })
          .then(payOrderRes => {
            outTradeNo = payOrderRes.result.outTradeNo
            if (!payOrderRes.result.success) { //下单失败
              wx.hideLoading()
              if ('toastMsg' in payOrderRes.result) {
                util.showToast(payOrderRes.result.toastMsg)
              } else {
                util.showToast('订单提交失败', 'error')
              }
              return
            }
            //下单成功，页面通信删除购物车商品
            const eventChannel = that.getOpenerEventChannel()
            eventChannel.emit('deleteShoppingCart')

            //发起支付
            util.showLoading('正在支付')
            wx.requestPayment({
                ...payOrderRes.result.payment, //  ...是展开符
              })
              .then(res => { //支付成功
                util.showLoading('核实订单中')
                //云函数查单
                let nonceStr = payOrderRes.result.payment.nonceStr
                that.orderQuery('1616983338', outTradeNo, nonceStr)
                  .then(() => { //进入支付成功页面
                    that.toRecordDetail()
                  })
                  .catch(() => { //进入订单支付详情页面
                    that.toRecordDetail()
                  })
              })
              .catch(err => { //支付出错
                if (err.errMsg !== 'requestPayment:fail cancel') { //非取消支付报错则进行查单
                  util.showLoading('核实订单中')
                  //云函数查单
                  let nonceStr = payOrderRes.result.payment.nonceStr
                  that.orderQuery('1616983338', outTradeNo, nonceStr)
                    .then(() => { //进入支付成功页面
                      that.toRecordDetail()
                    })
                    .catch(() => { //进入订单支付详情页面
                      that.toRecordDetail()
                    })
                } else { // 用户取消支付
                  wx.hideLoading()
                  util.showToast('订单未支付', 'error')
                  that.toRecordDetail()
                }
              })
          })
          .catch(err => {
            wx.hideLoading()
            util.showToast('订单提交失败', 'error')
          })
      })
    }
  },
  toRecordDetail: function () {
    setTimeout(() => { //进入订单支付详情页面
      wx.navigateBack({
        delta: 2,
      }).then(res => {
        wx.navigateTo({
          url: '../record/recordDetail?outTradeNo=' + outTradeNo
        })
      })
    }, 1000)
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
              return
            } else {
              util.showToast('订单未支付')
              reject() //表明进入订单支付详情页面
              return
            }
          } else {
            util.showToast('订单核实失败')
            reject() //表明进入订单支付详情页面
            return
          }
        })
        .catch(e => {
          wx.hideLoading()
          util.showToast('订单核实失败')
          reject() //表明进入订单支付详情页面
          return
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
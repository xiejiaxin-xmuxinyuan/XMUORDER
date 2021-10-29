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
    if (!that.data.isTimePick) {
      util.showToast('时间未选择', 'error')
    } else {
      var userRecord = {
        cID: canteen.cID,
        cName: canteen.name,
        record: [],
        allPrice: that.data.money
      }
      for (const key in orderList) {
        if (key === 'length') {
          continue
        }
        let index1 = orderList[key][1]
        let index2 = orderList[key][2]

        let food = foodList[index1].food[index2]
        let foodRecord = {
          food: food.name,
          num: food.orderNum,
          price: food.price * food.orderNum
        }
        userRecord.record.push(foodRecord)
      }

      wx.showLoading({
        title: '提交订单中',
        mask: true
      })
      // TODO: 添加到商家订单

      // 添加到用户记录
      wx.cloud.callFunction({
        name: 'settlementSubmit',
        data: {
          userRecord: userRecord
        }
      }).then(res => {
        wx.hideLoading()
        if (!res.result.success) {
          util.showToast('提交失败', 'error')
        } else {
          //在canteen页面onUpload中清空当前餐厅购物车
          app.globalData.allOrderList[canteen.cID].delete = true

          util.showToast('下单成功', 'success')
          setTimeout(() => {
            wx.navigateBack({
              delta: 2,
            })
          }, 1000);
        }
      })
    }
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
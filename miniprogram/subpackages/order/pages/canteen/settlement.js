// subpackages/order/pages/canteen/settlement.js
var that
const db = wx.cloud.database()
const app = getApp()
Page({

  data: {
    orderList: {},
    list: [],
    user: {},
    curTime: '',
    timeToPick: ['7:00', '7:30', '8:30', '11:00', '12:00', '12:30', '17:30', '18:00', '18:30'],
    pickedIndex: null,
    totalPrice: 0
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
      list: app.globalData.settlement.list,
      canteen: app.globalData.settlement.canteen,
      money: app.globalData.settlement.money,
      user: user
    })
    that.timeAbleToPick() // 根据当前时间修改可选的点餐时间

  },
  timePickerChange: function (e) {
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

    that.setData({
      curTime: curTime,
      timeToPick: timeToPick
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
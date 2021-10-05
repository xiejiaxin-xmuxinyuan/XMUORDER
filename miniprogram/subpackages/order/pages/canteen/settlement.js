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
    timeToPick: ['11:00', '12:00', '12:30'], //读取数据库，和curTime比较后得到可选择的取餐时间
    pickedIndex: null,
    totalPrice: 0
  },


  onLoad: function (options) {
    that = this
    var curTime = getCurTime() //当前时间
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
      user: user,
      curTime: curTime
    })
  },
  timePickerChange: function(e){
    that.setData({
      pickedIndex: e.detail.value
    })
  }
})

function dateToStrTime(date) {
  let h = date.getHours().toString()
  let m = date.getMinutes().toString()
  return h + ':' + m
}

function getCurTime() {
  return dateToStrTime(new Date())
}
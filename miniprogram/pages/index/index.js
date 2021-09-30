// pages/index/index.js
const app = getApp()
const db = wx.cloud.database()
var that
Page({
  /**
   * 页面的初始数据
   */
  data: {
    pageCurr: "info",
    name: null,
    phone:null,
    address: null,
    canteen: [],
    identity:null
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    wx.showLoading({
      title: '获取信息中',
    })
    db.collection("canteen")
      .get()
      .then(val => {
        that.setData({
          canteen: val.data,
        })
        wx.hideLoading()
      })
  },
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },
  onNavChange:function(e){
    if (app.globalData.isActive){
      const pageCurr = e.currentTarget.dataset.cur
      if (e.currentTarget.dataset.cur === 'user') {
        const {name, address,phone,identity} = app.globalData
        that.setData({name,address, pageCurr,phone,identity})
      } else {
        that.setData({pageCurr})
      }
    }
    else {
      that.goToInform()
    }

  },
  toOrder:function(e){
    console.log(e)
    if(!app.globalData.isActive){
      that.goToInform()
    }else{
      app.globalData.canteen=e.currentTarget.dataset.canteen
      wx.navigateTo({
        url: '../canteen/canteen',
      })
    }
  },
  goToInform:function(){
    wx.showModal({
      title: '请完善信息',
      showCancel: true,
      success: val => {
        // 用户点击确认
        if (val.confirm) {
          wx.navigateTo({
            url: '../infoForm/infoForm',
          })
        }
      },
      fail: err => console.error(err)
    })
  },
  toAdmin:function(){
    wx.navigateTo({
      url: '../admin/admin',
    })
  }
})
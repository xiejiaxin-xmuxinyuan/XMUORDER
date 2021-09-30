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
    phone: null,
    address: null,
    canteen: [],
    notices: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this

    //canteen
    wx.showLoading({
      title: '获取活动信息中',
    })
    db.collection("canteen")
      .get()
      .then(val => {
        console.log(val)
        //同时保存notice
        that.setData({
          canteen: val.data,
        })
        wx.hideLoading()
      })

    //notices
    wx.showLoading({
      title: '获取公告中',
    })
    wx.cloud.callFunction({
      name: "getNotices"
    }).then(res => {
      wx.hideLoading()
      console.log(res)
      let result = res.result
      console.log(result)
      if (result.success) {
        that.setData({
          notices: result.data
        })
      } else {
        console.log("notice获取失败")
      }
    })

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },
  onNavChange: function (e) {
    var pageChange = e.currentTarget.dataset.cur
    that.setData({
      pageCurr: pageChange
    })
  },

  showNoticeDetail: function(event) {
    console.log(event)
    //notice数据_id
    let id = event.currentTarget.dataset.id
    wx.navigateTo({
      url: '../notice_detail/notice_detail?id=' + id
    })
  }

})
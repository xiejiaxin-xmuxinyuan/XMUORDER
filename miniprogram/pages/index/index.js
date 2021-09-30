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
        that.setData({
          canteen: val.data,
        })
        wx.hideLoading()
      })

    //notices
    wx.showLoading({
      title: '获取公告中',
    })
    wx.cloud.callFunction({ //调用云函数获取notices
      name: "getNotices"
    }).then(res => {
      wx.hideLoading()
      let result = res.result
      if (result.success) {
        that.setData({
          notices: result.data
        })
      } else { //notice获取失败
        wx.showModal({
          title: '提示',
          content: '公告获取失败'
        }).then(res => {
          that.setData({
            pageCurr: "shop"
          })
        })
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

  showNoticeDetail: function (event) {
    //notice数据_id
    let id = event.currentTarget.dataset.id
    wx.navigateTo({
      url: './noticeDetail?id=' + id
    })
  }

})
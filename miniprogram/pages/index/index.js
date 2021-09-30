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
    notices: [{
        "top": false,
        "title": "普通测试标题",
        "content": "测试内容bbbbbbbbbbb结束",
        "date": "2021-9-29",
        "org": "测试org2"
      },
      {
        "top": true,
        "title": "置顶测试标题",
        "content": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "date": "2021年9月30日",
        "org": "测试org"
      }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    wx.showLoading({
      title: '获取活动信息中',
    })
    db.collection("canteen")
      .get()
      .then(val => {
        console.log(val)
        that.setData({
          canteen: val.data
        })
        wx.hideLoading()
      })
  },
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },
  onNavChange: function (e) {
    console.log(e)
    var pageChange = e.currentTarget.dataset.cur
    that.setData({
      pageCurr: pageChange
    })
  }
})
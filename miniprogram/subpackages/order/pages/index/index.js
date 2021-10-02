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
    notices: [],
    noticeTypes: ['公共', '翔安', '思明', '海韵'],
    noticeCurrType: "公共",
    identity: null
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this

    //canteen
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

  showNoticeDetail: function (event) {
    //保存当前notice详情到全局
    app.globalData.notice = event.currentTarget.dataset.notice
    console.log(app.globalData)
    wx.navigateTo({
      url: './noticeDetail'
    })
  },
  onNavChange: function (e) {
    if (app.globalData.isActive) {
      const pageCurr = e.currentTarget.dataset.cur
      if (e.currentTarget.dataset.cur === 'user') {
        const {
          name,
          address,
          phone,
          identity
        } = app.globalData
        that.setData({
          name,
          address,
          pageCurr,
          phone,
          identity
        })
      } else {
        that.setData({
          pageCurr
        })
      }
    } else {
      that.goToInform()
    }
  },
  noticeTypeSelect: function (e) {
    that.setData({
      noticeCurrType: e.currentTarget.dataset.name
    })
  },
  toOrder: function (e) {
    console.log(e)
    if (!app.globalData.isActive) {
      that.goToInform()
    } else {
      app.globalData.canteen = e.currentTarget.dataset.canteen
      wx.navigateTo({
        url: '../canteen/canteen',
      })
    }
  },
  goToInform: function () {
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
  toAdmin: function () {
    wx.navigateTo({
      url: '../../../../subpackages/admin/pages/index/index',
    })
  },
  infoTouchStart: function (e) {
    that.startPageX = e.changedTouches[0].pageX;
  },
  infoTouchEnd: function (e) {
    const moveX = e.changedTouches[0].pageX - that.startPageX;
    if (Math.abs(moveX) >= 150) {
      let noticeCurrType = that.data.noticeCurrType
      let noticeTypes = that.data.noticeTypes
      let index = -1
      for (let i = 0; i < noticeTypes.length; i++) {
        if (noticeTypes[i] === noticeCurrType) {
          index = i
          break
        }
      }
      let newIndex = index
      let maxPage = that.data.noticeTypes.length - 1;
      if (moveX < 0) {
        newIndex = index === maxPage ? 0 : index + 1
      } else {
        newIndex = index === 0 ? maxPage : index - 1
      }
      that.setData({
        noticeCurrType: that.data.noticeTypes[newIndex]
      })
    }
  }

})
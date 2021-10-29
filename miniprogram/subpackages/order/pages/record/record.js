// subpackages/order/pages/record/record.js
var util = require('../../../../utils/util.js')
var that
Page({
  /**
   * 页面的初始数据
   */
  data: {
    record: [],
    currPage: 0,
    totalPage: 1
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    that.getRecords(1) //第一页
      .then(res => {
        that.setData({
          record: res.record,
          currPage: res.currPage,
          totalPage: res.totalPage,
        })
      })
  },
  onReachBottom() {
    let currPage = that.data.currPage
    let totalPage = that.data.totalPage
    if (currPage < totalPage) {
      that.getRecords(currPage + 1)
        .then(res => {
          let record = that.data.record
          that.setData({
            record: record.concat(res.record),
            currPage: res.currPage,
            totalPage: res.totalPage,
          })
        })
    }
  },
  feedback: function (e) {
    var record = that.data.record[e.currentTarget.dataset.index]
    record = JSON.stringify(record)
    wx.navigateTo({
      url: '../feedback/feedback?record=' + record,
    })
  },
  getRecords: currPage => {
    return new Promise((resolve, reject) => {
      util.showLoading('加载中')
      wx.cloud.callFunction({
          name: 'getRecords',
          data: {
            currPage: currPage
          }
        }).then(res => {
          util.hideLoading()
          if (res.result.success) {
            resolve(res.result)
          } else {
            util.showToast('加载失败', 'error')
            setTimeout(() => {
              wx.navigateBack({
                delta: 1,
              })
            }, 1000);
          }
        })
        .catch(e => {
          util.hideLoading()
          util.showToast('加载失败', 'error')
          setTimeout(() => {
            wx.navigateBack({
              delta: 1,
            })
          }, 1000);
        })
    })
  }
})
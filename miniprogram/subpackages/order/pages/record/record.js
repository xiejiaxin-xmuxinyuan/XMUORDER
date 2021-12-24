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
  onShow: function (options) {
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
    var order = that.data.record[e.currentTarget.dataset.index]
    var info = {
      goods: order.goodsInfo.record,
      formatedTime: order.orderInfo.timeInfo.formatedTime,
      feeInfo: order.payInfo.feeInfo,
      outTradeNo: order.orderInfo.outTradeNo
    }
    info = JSON.stringify(info)
    wx.navigateTo({
      url: '../feedback/feedback?info=' + info,
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
            return
          } else {
            util.showToast('加载失败', 'error')
            setTimeout(() => {
              wx.navigateBack({
                delta: 1,
              })
            }, 1000)
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
  },
  strDateFormat: strDate => { //14位日期转yyyy-MM-dd hh:mm:ss
    var regExp = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/;
    var formatTime = '$1/$2/$3 $4:$5:$6';
    return strDate.replace(regExp, formatTime)
  },
  toRecoredDetail: function (e) {
    const index = e.currentTarget.dataset.index
    var order = that.data.record[index]
    const outTradeNo = order.orderInfo.outTradeNo
    wx.navigateTo({
      url: './recordDetail?outTradeNo=' + outTradeNo
    })
  }
})
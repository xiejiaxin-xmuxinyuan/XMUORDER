// subpackages/order/pages/feedback/feedback.js
var that

Page({

  /**
   * 页面的初始数据
   */
  data: {
    record: {},
    haveRecord: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    
    if ('record' in options) {
      var record = JSON.parse(options.record)
      that.setData({
        record: record,
        haveRecord: true
      })
    } else {
      that.setData({
        haveRecord: false
      })
    }

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

})
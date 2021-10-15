// subpackages/order/pages/feedback/feedback.js
var that

Page({

  /**
   * 页面的初始数据
   */
  data: {
    record:{},
    haveRecord:false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    var record = JSON.parse(options.record)
    var haveRecord = options.haveRecord
    that.setData({
      record : record,
      haveRecord : haveRecord
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

})
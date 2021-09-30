// pages/notice_detail/notice_detail.js
var that
const db = wx.cloud.database()

Page({
  data: {
    notice: {}
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    var id = options.id
    //读取id对应公告数据
    db.collection('notices').doc(id).get()
      .then(res => {
        that.setData({
          notice: res.data
        })
      })
  }
})
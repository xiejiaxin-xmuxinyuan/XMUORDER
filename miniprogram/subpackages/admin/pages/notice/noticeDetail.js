// subpackages/admin/pages/notice/noticeDetail.js
const app = getApp()
var that

Page({
  data: {
    notice: {}
  },

  onLoad: function (options) {
    that = this
    var index = options.index
    //读取公告详情
    that.setData({
      notice: app.globalData.notices[index]
    })
  }
})
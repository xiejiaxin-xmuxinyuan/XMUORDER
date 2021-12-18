// subpackages/admin/pages/notice/noticeDetail.js
const app = getApp()
var that

Page({
  data: {
    notice: {}
  },

  onLoad: function (options) {
    that = this
    const notice = JSON.parse(options.notice)
    //读取公告详情
    that.setData({
      notice: notice
    })
  }
})
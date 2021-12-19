// subpackages/admin/pages/notice/noticeDetail.js
const app = getApp()
var that

Page({
  data: {
    notice: {},
    content: []
  },

  onLoad: function (options) {
    that = this
    const notice = JSON.parse(options.notice)
    var content = notice.content.split('\n')

    //读取公告详情
    that.setData({
      notice: notice,
      content
    })
  }
})
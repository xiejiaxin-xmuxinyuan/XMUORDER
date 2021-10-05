// subpackages/admin/pages/notice/notice.js
const app = getApp()
var that

Page({


  data: {
    noticeTypes: ['公共', '翔安', '思明', '海韵'],
    noticeCurrType: "公共"
  },

  onLoad: function (options) {
    that = this
    that.setData({
      notices: app.globalData.notices
    })
  },
  noticeTypeSelect: function (e) {
    that.setData({
      noticeCurrType: e.currentTarget.dataset.name
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
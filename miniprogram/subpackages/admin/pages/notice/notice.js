// subpackages/admin/pages/notice/notice.js
const db = wx.cloud.database()
const util = require('../../../../utils/util.js')
var that

Page({
  data: {
    noticeTypes: ['公共', '翔安', '思明', '海韵'],
    noticeCurrType: "公共",
    noticeCurrPage: 1,
    noticeTotalPage: 0,
    noticeTotalCount: 0,
    notices: [],
    noticeCurrTypeNum: 0,
    currPage: 0,
    totalPage: 1,
    loaded: false
  },

  onLoad: function (options) {
    that = this
  },
  onShow: function (options) {
    util.showLoading('加载中')
    that.getUserNotices().then(() => {
      wx.hideLoading()
    })
  },
  noticeTypeSelect: function (e) {
    const noticeCurrType = e.currentTarget.dataset.name
    that.setData({
      noticeCurrType: noticeCurrType,
      notices: []
    })
    util.showLoading('加载中')
    that.getUserNotices().then(() => {
      wx.hideLoading()
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
      var newType = that.data.noticeTypes[newIndex]
      that.setData({
        noticeCurrType: newType,
        notices: []
      })
      //加载当前类型的公告
      util.showLoading('加载中')
      that.getUserNotices().then(() => {
        wx.hideLoading()
      })
    }
  },
  delNotices: function (e) {
    var index0 = e.currentTarget.dataset.index
    var notice = that.data.notices[index0]
    wx.showModal({
      title: '提示',
      content: '确认删除吗？',
      success(res) {
        if (res.confirm) {
          util.showLoading('正在删除公告')
          let _id = notice._id
          wx.cloud.callFunction({
              name: 'dbMove',
              data: {
                table: 'notices',
                _id: _id
              }
            })
            .then(res => {
              if (res.result.success) {
                that.data.notices.splice(index0, 1)
                setTimeout(function () {
                  wx.hideLoading()
                  that.setData({
                    notices: that.data.notices
                  })
                  util.showToast('删除成功', 'success', 1500)
                }, 1100)
              } else {
                wx.hideLoading()
                util.showToast('数据提交失败', 'error', 2000)
              }
            })
            .catch(error => {
              wx.hideLoading()
              util.showToast('数据提交失败', 'error', 2000)
            })
        } else if (res.cancel) {
          util.showToast('操作已取消')
        }
      }
    })
  },
  showNoticeDetail: function (event) {
    //保存当前notice详情到全局
    var index = event.currentTarget.dataset.index
    wx.navigateTo({
      url: './noticeDetail?index=' + index
    })
  },
  getUserNotices: function (noticeCurrPage = 1, pageSize = 3) {
    return new Promise(async (resolve, reject) => {
      const noticeCurrType = that.data.noticeCurrType

      const countResult = await db.collection('notices').where({
        type: noticeCurrType,
        hidden: false
      }).count()

      const noticeTotalCount = countResult.total
      const noticeTotalPage = noticeTotalCount === 0 ? 0 : noticeTotalCount <= pageSize ? 1 : Math.ceil(noticeTotalCount / pageSize)

      if (noticeTotalPage === 0) { //如果没有任何记录
        that.setData({
          notices: [],
          noticeCurrPage: noticeCurrPage,
          noticeTotalPage: noticeTotalPage,
          noticeTotalCount: noticeTotalCount,
        })
        resolve()
      }

      db.collection('notices').where({
          type: noticeCurrType,
          hidden: false
        })
        .orderBy('top', 'desc')
        .orderBy('date', 'desc')
        .skip((noticeCurrPage - 1) * pageSize).limit(pageSize)
        .get().then(res => {
          that.setData({
            notices: res.data,
            noticeCurrPage: noticeCurrPage,
            noticeTotalPage: noticeTotalPage,
            noticeTotalCount: noticeTotalCount,
          })
          resolve()
        })
    })
  },
  toAddNotices: function (e) {
    wx.navigateTo({
      url: './addNotices',
    })
  },
  editNotices: function (e) {
    var index0 = e.currentTarget.dataset.index
    wx.navigateTo({
      url: './editNotices?index0=' + index0,
    })
  },
  noticeChangePage: function (e) {
    const currPage = that.data.noticeCurrPage
    const totalPage = that.data.noticeTotalPage

    if ('add' in e.currentTarget.dataset) { //增加
      if (currPage <= totalPage - 1) {
        util.showLoading('加载中')
        that.getUserNotices(currPage + 1).then(() => {
          wx.hideLoading()
        })
      } else {
        util.showToast('已经是最后一页啦')
      }
    } else { //减少
      if (currPage > 1) {
        util.showLoading('加载中')
        that.getUserNotices(currPage - 1).then(() => {
          wx.hideLoading()
        })
      } else {
        util.showToast('已经是第一页啦')
      }
    }
  }
})
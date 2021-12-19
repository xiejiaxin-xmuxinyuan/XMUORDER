// subpackages/admin/pages/notice/notice.js
const db = wx.cloud.database()
const util = require('../../../../utils/util.js')
const app = getApp()
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
  delNotice: function (e) {
    var index0 = e.currentTarget.dataset.index
    var notice = that.data.notices[index0]
    var noticeCurrPage = that.data.noticeCurrPage
    wx.showModal({
      title: '提示',
      content: '确认删除吗？',
      success(res) {
        if (res.confirm) {
          util.showLoading('正在删除公告')
          let _id = notice._id
          // 公告数据
          var p0 = wx.cloud.callFunction({
            name: 'dbMove',
            data: {
              table: 'notices',
              _id: _id
            }
          })
          // 公告图片
          var fileIDs = notice.images
          fileIDs.push(notice.coverImg)
          var p1 = wx.cloud.deleteFile({
            fileList: fileIDs,
          })

          Promise.all([p0, p1]).then(res => {
            if (res[0].result.success) {
              that.getUserNotices(noticeCurrPage).then(() => {
                wx.hideLoading()
                util.showToast('删除成功', 'success', 1500)
              })
            } else {
              wx.hideLoading()
              util.showToast('删除失败', 'error', 2000)
            }
          })
        }
      }
    })
  },
  showNoticeDetail: function (event) {
    var index = event.currentTarget.dataset.index
    var notice = that.data.notices[index]
    wx.navigateTo({
      url: './noticeDetail?notice=' + JSON.stringify(notice)
    })
  },
  getUserNotices: function (noticeCurrPage = 1, pageSize = 5) {
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
          noticeCurrPage: 1,
          noticeTotalPage: 0,
          noticeTotalCount: 0,
        })
        resolve()
        return
      }

      if (noticeCurrPage > noticeTotalPage) {
        noticeCurrPage = noticeTotalPage
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
          return
        })
    })
  },
  toAddNotices: function (e) {
    wx.navigateTo({
      url: './addNotices',
    })
  },
  editNotices: function (e) {
    var index = e.currentTarget.dataset.index
    var notice = that.data.notices[index]
    const identity = app.globalData.identity

    if (identity.type !== 'superAdmin') {
      if (identity.cID !== notice.orgID) {
        util.showToast('您没有该公告的编辑权限')
        return
      }
    }

    wx.navigateTo({
      url: './editNotices?notice=' + JSON.stringify(notice)
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
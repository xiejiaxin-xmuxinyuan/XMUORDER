// pages/index/index.js
const app = getApp()
const db = wx.cloud.database()
var that

function userNoticesSort(a, b) { //辅助函数 用于sort排序
  if (a.top !== b.top) {
    return a.top > b.top ? -1 : 1;
  } else if (a.date !== b.date) {
    return a.date > b.date ? -1 : 1;
  } else {
    return 1;
  }
}

Page({
  /**
   * 页面的初始数据
   */
  data: {
    pageCurr: "info",
    name: app.globalData.name,
    phone: app.globalData.phone,
    address: app.globalData.address,
    identity: app.globalData.identity,
    canteen: [],
    notices: [],
    noticeTypes: ['公共', '翔安', '思明', '海韵'],
    noticeCurrType: "公共",
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    if (!app.globalData.isActive) {
      that.goToInform()
      return //中断线程
    }

    wx.showLoading({
      title: '获取信息中',
    })
    var p1 = db.collection("canteen").get()
    var p2 = that.getUserNotices()

    Promise.all([p1, p2]).then(res => {
      wx.hideLoading()
      that.setData({
        canteen: res[0].data, //餐厅数据
        notices: res[1] //公告数据
      })
    })
  },

  showNoticeDetail: function (event) {
    //保存当前notice详情到全局
    app.globalData.notice = event.currentTarget.dataset.notice
    console.log(app.globalData)
    wx.navigateTo({
      url: './noticeDetail'
    })
  },
  onNavChange: function (e) {
    const pageCurr = e.currentTarget.dataset.cur
    if (pageCurr!==that.data.pageCurr){
      that.setData({
        pageCurr
      })
    }
  },
  noticeTypeSelect: function (e) {
    that.setData({
      noticeCurrType: e.currentTarget.dataset.name
    })
  },
  toOrder: function (e) {
    console.log(e)
    if (!app.globalData.isActive) {
      that.goToInform()
    } else {
      app.globalData.canteen = e.currentTarget.dataset.canteen
      wx.navigateTo({
        url: '../canteen/canteen',
      })
    }
  },
  goToInform: function () {
    wx.showModal({
      title: '请完善信息',
      showCancel: true,
      success: val => {
        // 用户点击确认
        if (val.confirm) {
          wx.navigateTo({
            url: '../infoForm/infoForm',
          })
        }
      },
      fail: err => console.error(err)
    })
  },
  toAdmin: function () {
    wx.navigateTo({
      url: '../../../../subpackages/admin/pages/index/index',
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
  },
  getUserNotices: async function () {
    const countResult = await db.collection('notices').where({
      hidden: false
    }).count()

    const total = countResult.total
    // 计算需分几次取
    const MAX_LIMIT = 20
    const batchTimes = Math.ceil(total / MAX_LIMIT)
    const tasks = []
    for (let i = 0; i < batchTimes; i++) {
      let promise = db.collection('notices').where({
        hidden: false
      }).skip(i * MAX_LIMIT).limit(MAX_LIMIT).get()
      tasks.push(promise)
    }

    const res = (await Promise.all(tasks)).reduce((acc, cur) => {
      return {
        notices: acc.data.concat(cur.data)
      }
    })
    res.data.sort(userNoticesSort)
    return res.data //返回排序后数据
  }

})
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
    canteens: [],
    notices: [],
    noticeTypes: ['公共', '翔安', '思明', '海韵'],
    noticeCurrType: "公共",
    intCurTime: 600 // 6:00
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
      var canteens = res[0].data
      that.setData({
        notices: res[1], //公告数据
        name: app.globalData.name,
        phone: app.globalData.phone,
        address: app.globalData.address,
        identity: app.globalData.identity
      })

      //当前时间
      let date = new Date()
      let h = date.getHours().toString().padStart(2, '0')
      let m = date.getMinutes().toString().padStart(2, '0')
      let intCurTime = parseInt(h + m)

      //canteens 营业时间计算
      canteens.forEach((info, index) => {
        let breakfast = info.breakfast
        let beginTime = breakfast.substring(0, breakfast.indexOf('-'))
        let intBeginTime = parseInt(beginTime.replace(':', ''))

        let dinner = info.dinner
        let endTime = dinner.substring(dinner.indexOf('-') + 1)
        let intEndTime = parseInt(endTime.replace(':', ''))

        canteens[index].beginTime = beginTime
        canteens[index].intBeginTime = intBeginTime
        canteens[index].endTime = endTime
        canteens[index].intEndTime = intEndTime
      });

      that.setData({
        canteens: canteens, //餐厅数据
        intCurTime: intCurTime //当前int格式时间
      })
      app.globalData.canteens = canteens //同步到全局变量
    })
  },

  showNoticeDetail: function (event) {
    //保存当前notice详情到全局
    app.globalData.notice = event.currentTarget.dataset.notice
    wx.navigateTo({
      url: './noticeDetail'
    })
  },
  onNavChange: function (e) {
    const pageCurr = e.currentTarget.dataset.cur
    if (pageCurr !== that.data.pageCurr) {
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
    if (!app.globalData.isActive) {
      that.goToInform()
    } else {
      var myDate = new Date()
      var myTime = that.formatDate(myDate)
      var index = e.currentTarget.dataset.index
      var canteen = that.data.canteens[index]
      var endTime = canteen.endTime
      // if(endTime < myTime){
      //   wx.showToast({
      //     title: '不在营业时间',
      //     icon:'error'
      //   })
      // }else{
      wx.navigateTo({
        url: '../canteen/canteen?index=' + index,
      })
      // }
    }
  },
  goToInform: function () {
    wx.showModal({
      title: '请完善信息',
      showCancel: false,
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
  },
  toRecord: function (e) {
    wx.navigateTo({
      url: '../record/record',
    })
  },
  toFeedback: function (e) {
    wx.navigateTo({
      url: '../feedback/feedback',
    })
  },
  toSetting: function (e) {
    wx.showToast({
      title: '功能未开放',
      icon: 'none'
    })
  },
  formatDate: function (inputTime) { //该函数用于格式化时间戳
    var date = new Date(inputTime);
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    m = m < 10 ? ('0' + m) : m;
    var d = date.getDate();
    d = d < 10 ? ('0' + d) : d;
    var h = date.getHours();
    h = h < 10 ? ('0' + h) : h;
    var minute = date.getMinutes();
    var second = date.getSeconds();
    minute = minute < 10 ? ('0' + minute) : minute;
    second = second < 10 ? ('0' + second) : second;
    return h + ':' + minute;
  }
})
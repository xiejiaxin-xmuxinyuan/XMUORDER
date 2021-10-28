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
    name: '',
    nickName: '',
    phone: '',
    address: '',
    identity: '',
    canteens: [],
    notices: [],
    noticeTypes: ['公共', '翔安', '思明', '海韵'],
    noticeCurrType: "公共",
    noticeCurrTypeNum: 0,
    intCurTime: null,
    isLoaded: false
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
      mask: true
    })
    var p1 = db.collection("canteen").get()
    var p2 = that.getUserNotices()

    Promise.all([p1, p2]).then(res => {
      wx.hideLoading()
      var notices = res[1]
      var noticeCurrTypeNum = 0
      notices.forEach(element => {
        if (element.type === that.data.noticeCurrType) {
          noticeCurrTypeNum++
        }
      })

      var canteens = res[0].data
      that.setData({
        notices: notices, //公告数据
        noticeCurrTypeNum: noticeCurrTypeNum,
        name: app.globalData.name,
        nickName: app.globalData.nickName,
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
      })

      app.globalData.canteens = canteens //同步到全局变量
      that.setData({
        canteens: canteens, //餐厅数据
        intCurTime: intCurTime, //当前int格式时间
        isLoaded: true // 表示加载完毕
      })
    })
  },

  onShow: () => {
    if (that.data.isLoaded) { //再次显示主页时触发
      that.setData({
        canteens: app.globalData.canteens, //餐厅数据
      })
    }
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
    const noticeCurrType = e.currentTarget.dataset.name
    var noticeCurrTypeNum = 0
    var notices = that.data.notices
    notices.forEach(element => {
      if (element.type === noticeCurrType) {
        noticeCurrTypeNum++
      }
    })
    that.setData({
      noticeCurrType: noticeCurrType,
      noticeCurrTypeNum: noticeCurrTypeNum
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

      var newType = that.data.noticeTypes[newIndex]
      var noticeCurrTypeNum = 0
      var notices = that.data.notices
      notices.forEach(element => {
        if (element.type === newType) {
          noticeCurrTypeNum++
        }
      })

      that.setData({
        noticeCurrType: newType,
        noticeCurrTypeNum: noticeCurrTypeNum
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
      url: '../feedback/index',
    })
  },
  toSetting: function (e) {
    wx.showToast({
      title: '功能未开放',
      icon: 'none'
    })
  },
  getUserProfile: function (e) {
    wx.showLoading({
      title: '加载中',
      mask: true
    })
    wx.getUserProfile({
        desc: '用于完善会员资料'
      })
      .then(res => {
        let userInfo = res.userInfo
        //更新数据库内信息
        wx.cloud.callFunction({
            name: "userUpdate",
            data: {
              formData: {
                nickName: userInfo.nickName
              }
            }
          })
          .then(res => {
            wx.hideLoading()
            if (res.result.success) {
              app.globalData.nickName = userInfo.nickName
              that.setData({
                nickName: userInfo.nickName,
                // avatarUrl: userInfo.avatarUrl
              })
            } else {
              wx.showToast({
                title: '更新信息失败',
                icon: 'error',
                duration: 2000
              })
            }
          })
          .catch(e => {
            wx.hideLoading()
            wx.showToast({
              title: '更新信息失败',
              icon: 'error',
              duration: 2000
            })
          })
      })
      .catch(erro => {
        wx.hideLoading()
        wx.showToast({
          title: '更新信息失败',
          icon: 'error',
          duration: 2000
        })
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
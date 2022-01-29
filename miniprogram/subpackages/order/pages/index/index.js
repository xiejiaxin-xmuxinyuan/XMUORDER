// pages/index/index.js
const app = getApp()
const db = wx.cloud.database()
const util = require('../../../../utils/util.js')
var that


Page({
  /**
   * 页面的初始数据
   */
  data: {
    pageCurr: "info",
    canteens: [],
    notices: [],
    noticeTypes: ['公共', '翔安', '思明', '海韵'],
    noticeCurrType: "公共",
    noticeCurrPage: 1,
    noticeTotalPage: 0,
    noticeTotalCount: 0,
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
      return
    }

    util.showLoading('加载中')
    var p0 = that.getCanteens()
    var p1 = that.getUserNotices()

    Promise.all([p0, p1]).then(res => {
      wx.hideLoading()
      that.setData({
        isLoaded: true, // 表示加载完毕
        //用户信息
        user:{
          name: app.globalData.name,
          nickName: app.globalData.nickName,
          phone: app.globalData.phone,
          address: app.globalData.address,
          identity: app.globalData.identity,
          img: app.globalData.img
        }
      })
    })
  },

  onShow: () => {
    if (that.data.isLoaded) { //再次显示主页时触发
      that.canteenInBusiness(app.globalData.canteens)
    }
  },
  showNoticeDetail: function (event) {
    var index = event.currentTarget.dataset.index
    var notice = that.data.notices[index]
    wx.navigateTo({
      url: './noticeDetail?notice=' + JSON.stringify(notice)
    })
  },
  onNavChange: function (e) {
    const pageCurr = e.currentTarget.dataset.cur

    if (pageCurr !== that.data.pageCurr) {
      //再次切换到info时进行刷新
      if (pageCurr === 'info') {
        util.showLoading('加载中')
        that.getUserNotices().then(() => {
          wx.hideLoading()
        })
      }

      that.setData({
        pageCurr
      })
    }
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
  toCanteen: function (e) {
    const index = e.currentTarget.dataset.index
    if (!app.globalData.isActive) {
      that.goToInform()
    } else {
      const businessTime = that.data.canteens[index].businessTime

      //当前时间
      let date = new Date()
      let h = date.getHours().toString().padStart(2, '0')
      let m = date.getMinutes().toString().padStart(2, '0')
      let intCurTime = parseInt(h + m)

      for (let i = 0; i < businessTime.length; i++) {
        const time = businessTime[i];
        if (intCurTime > parseInt(time[0]) && intCurTime < parseInt(time[1])) {
          that.setData({
            intCurTime,
            ['canteens[' + index + '].inBusiness']: true
          })
          wx.navigateTo({
            url: '../canteen/canteen?index=' + index,
          })
          return
        }
      }

      util.showToast('不在营业时间', 'error')
      that.setData({
        intCurTime,
        ['canteens[' + index + '].inBusiness']: false
      })
    }
  },
  goToInform: function () {
    wx.showModal({
      title: '请完善用户信息',
      showCancel: false,
      success: val => {
        // 用户点击确认
        if (val.confirm) {
          wx.navigateTo({
            url: '../infoForm/infoForm',
          })
        }
      }
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
    const moveX = e.changedTouches[0].pageX - that.startPageX
    if (Math.abs(moveX) < 150) { //小于150不触发
      return
    }

    //获取滑动后的类型
    const noticeCurrType = that.data.noticeCurrType
    const noticeTypes = that.data.noticeTypes
    var index = -1
    for (let i = 0; i < noticeTypes.length; i++) {
      if (noticeTypes[i] === noticeCurrType) {
        index = i
        break
      }
    }
    var newIndex = index
    var maxPage = that.data.noticeTypes.length - 1;
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
  },
  canteenInBusiness: function (canteens) { // 为canteen加上inBusiness字段，并保存本地和全局
    //当前时间
    let date = new Date()
    let h = date.getHours().toString().padStart(2, '0')
    let m = date.getMinutes().toString().padStart(2, '0')
    var intCurTime = parseInt(h + m)

    canteens.forEach(canteen => {
      for (let i = 0; i < canteen.businessTime.length; i++) {
        const time = canteen.businessTime[i];
        if (intCurTime > parseInt(time[0]) && intCurTime < parseInt(time[1])) {
          canteen.inBusiness = true
          break
        }
      }
    })
    app.globalData.canteens = canteens //同步到全局变量

    that.setData({
      canteens, //餐厅数据
      intCurTime, //当前int格式时间
    })
  },
  getCanteens: function (pageSize = 20) { //获取所有餐厅
    return new Promise(async (resolve, reject) => {
      const countRes = await db.collection("canteen").count()
      const totalCount = countRes.total
      const totalPage = totalCount === 0 ? 0 : totalCount <= pageSize ? 1 : Math.ceil(totalCount / pageSize)

      var proList = []
      for (let currPage = 1; currPage <= totalPage; currPage++) {
        proList.push(
          db.collection("canteen")
          .skip((currPage - 1) * pageSize).limit(pageSize).get()
        )
      }
      
      Promise.all(proList).then(res=>{
        var canteens = []
        res.forEach(r => {
          canteens.push(...r.data)
        });
        that.canteenInBusiness(canteens)
        resolve()
      })
    })
  },
  getUserNotices: function (noticeCurrPage = 1, pageSize = 5) {
    return new Promise(async (resolve, reject) => {
      if (noticeCurrPage < 1) {
        noticeCurrPage = 1
      }
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
    wx.navigateTo({
      url: '../setting/setting',
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
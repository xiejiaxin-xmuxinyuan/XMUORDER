// subpackages/admin/pages/notice/notice.js
const app = getApp()
const db = wx.cloud.database()
var that
// 获取公告的排序函数
function userNoticesSort(a, b) { 
  if (a.top !== b.top) {
    return a.top > b.top ? -1 : 1;
  } else if (a.date !== b.date) {
    return a.date > b.date ? -1 : 1;
  } else {
    return 1;
  }
}
Page({
  data: {
    noticeTypes: ['公共', '翔安', '思明', '海韵'],
    noticeCurrType: "公共",
    notices:[],
    noticeCurrTypeNum: 0,
    currPage: 0,
    totalPage: 1,
    loaded: false
  },

  onLoad: function (options) {
    that = this
    var p1 = db.collection("canteen").get()
    var p2 = that.getUserNotices()
    Promise.all([p1, p2]).then(res =>{
      var notices = res[1]
      var noticeCurrTypeNum = 0
      notices.forEach(element => {
        if (element.type === that.data.noticeCurrType) {
          noticeCurrTypeNum++
        }
      })
      that.setData({
        notices: notices, //公告数据
        noticeCurrTypeNum: noticeCurrTypeNum,
      })
    })
  },
  onShow: function (options) {
    that = this
    var p1 = db.collection("canteen").get()
    var p2 = that.getUserNotices()
    Promise.all([p1, p2]).then(res =>{
      var notices = res[1]
      that.setData({
        notices: notices, //公告数据
      })
    })
  },
  NoticePageChange: (idx ,notice, currPage, totalPage) => {
    let path = 'notices[' + idx + '].notice'
    app.globalData.notices[idx] = notice
    that.setData({
      currPage: currPage,
      totalPage: totalPage,
      [path]: notice,
      loaded: true
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
  },
  delNotices: function(e){
    var index0 = e.currentTarget.dataset.index
    var notice  = that.data.notices[index0]
    console.log(notice)
    wx.showModal({
      title: '提示', 
     content: '确认删除吗？', 
     success(res){
       if(res.confirm){
         //云函数数据库更新 pull
         wx.showLoading({
          title: '正在删除公告',
          mask: true
        })
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
                notices : that.data.notices
              })
              that.showT('删除成功', 'success', 1500)
            }, 1100)
          } else {
            wx.hideLoading()
            that.showT('数据提交失败', 'error', 2000)
          }
        })
        .catch(error => {
          wx.hideLoading()
          that.showT('数据提交失败', 'error', 2000)
        })
     } else if (res.cancel) {
      that.showT('操作已取消')
    }
  }
   })
  },
  showNoticeDetail: function (event) {
    
    //保存当前notice详情到全局
    app.globalData.notice = event.currentTarget.dataset.notice
    wx.navigateTo({
      url: './noticeDetail'
    })
  },
  showT: (title, icon = 'none', duration = 1000) => {
    wx.showToast({
      title: title,
      icon: icon,
      duration: duration
    })
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
  toAddNotices: function(e){
    wx.navigateTo({
      url: './addNotices',
    })
  },
  editNotices: function(e){
    var index0 = e.currentTarget.dataset.index
    wx.navigateTo({
      url: './editNotices?index0=' + index0,
    })
  }
  
  
})
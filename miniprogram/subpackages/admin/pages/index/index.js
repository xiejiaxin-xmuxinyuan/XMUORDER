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
  data: {
    pageCurr: "admin",
    iconList: [{
      icon: 'noticefill',
      color: 'yellow',
      name: '公告',
      path: '../notice/notice'
    }, {
      icon: 'friendfill',
      color: 'grey',
      name: '员工管理',
      path: ''
    }, {
      icon: 'taoxiaopu',
      color: 'blue',
      name: '商店信息',
      path: ''
    }, {
      icon: 'goodsnewfill',
      color: 'orange',
      name: '商品管理',
      path: '../goods/goods'
    }, {
      icon: 'rankfill',
      color: 'red',
      name: '统计',
      path: ''
    }, {
      icon: 'settingsfill',
      color: 'olive',
      name: '设置',
      path: ''
    }, {
      icon: 'questionfill',
      color: 'black',
      name: '帮助',
      path: ''
    }]
  },

  onLoad: function (options) {
    that = this
    wx.showLoading({
      title: '获取信息中',
      mask: true
    })
    var p1 = db.collection("canteen").get()
    var p2 = that.getUserNotices()

    Promise.all([p1, p2]).then(res => {
      wx.hideLoading()
      that.setData({
        name: app.globalData.name,
        phone: app.globalData.phone,
        address: app.globalData.address,
        identity: app.globalData.identity
      })
      //放入全局变量
      let canteen = res[0].data //餐厅数据
      let notices = res[1] //公告数据
      app.globalData.canteen = canteen
      app.globalData.notices = notices
    })
  },
  onNavChange: function (e) {
    const pageCurr = e.currentTarget.dataset.cur
    that.setData({
      pageCurr
    })
  },
  toPage: function (e) {
    if (e.currentTarget.dataset.path) {
      wx.navigateTo({
        url: e.currentTarget.dataset.path,
      })
    } else {
      wx.showToast({
        title: '功能未开放',
        icon: 'none'
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
// pages/index/index.js
const app = getApp()
const db = wx.cloud.database()
const util = require('../../../../utils/util.js')

var that
var watcher //订单监听

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
    watchOrderFlag: false,
    iconList: [{
        icon: 'noticefill',
        color: 'yellow',
        name: '公告',
        path: '../notice/notice'
      }, {
        icon: 'commentfill',
        color: 'brown',
        name: '反馈',
        path: '../feedback/feedback'
      },
      {
        icon: 'friendfill',
        color: 'grey',
        name: '员工管理',
        path: ''
      }, {
        icon: 'taoxiaopu',
        color: 'blue',
        name: '商店信息',
        path: '../shop/shop'
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
      }
    ]
  },

  onLoad: function (options) {
    that = this
    util.showLoading('获取信息中')

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
      util.showToast('功能未开放')
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
  watchOrder: function (e) { //订单监听
    var watchOrderFlag = e.detail.value

    if (watchOrderFlag) {
      util.showLoading('开启订单推送')

      let cID = that.data.identity.cID
      watcher = db.collection('orders')
        .where({
          'goodsInfo.shopInfo.cID': cID, //所属餐厅（同时是数据库安全权限内容）
          'orderInfo.orderState': 'NOTCONFIRM' // 仅监听未确认状态的订单
        })
        .watch({
          onChange: function (snapshot) {
            if (snapshot.type === 'init') {
              wx.hideLoading()
              util.showToast('订单推送已开启', 'success', 2000)
              that.setData({
                watchOrderFlag: watchOrderFlag
              })
            } else {
              console.log(snapshot)
            }
          },
          onError: function (err) {
            wx.hideLoading()
            util.showToast('订单推送异常', 'error', 2000)
            that.setData({
              watchOrderFlag: false
            })
          }
        })
    }
  }
})
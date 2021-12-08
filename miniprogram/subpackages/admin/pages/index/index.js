// pages/index/index.js
const app = getApp()
const db = wx.cloud.database()
const _ = db.command
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
    user: {},
    intCurTime: 0,
    orders: {
      newOrders: [],
      finishedOrdersCount: 0
    },
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
    util.showLoading('获取信息中')
    that = this

    const identity = app.globalData.identity
    //当前时间
    let date = new Date()
    let h = date.getHours().toString().padStart(2, '0')
    let m = date.getMinutes().toString().padStart(2, '0')
    var intCurTime = parseInt(h + m)

    that.setData({
      user: {
        name: app.globalData.name,
        phone: app.globalData.phone,
        address: app.globalData.address,
        identity,
        intCurTime
      }
    })

    var p1, p2, p3, p4
    if (identity.type !== 'superAdmin') {
      p1 = db.collection("canteen").where({
        cID: identity.cID
      }).get()
    } else {
      p1 = db.collection("canteen").get()
    }

    p2 = that.getUserNotices()

    if (identity.type !== 'superAdmin') {
      p3 = that.getFinishedOrdersCount()
      p4 = that.getNewOrders()
    }

    Promise.all([p1, p2]).then(res => {

      //放入全局变量
      var canteens = res[0].data //餐厅数据
      var notices = res[1] //公告数据
      app.globalData.canteen = canteens
      app.globalData.notices = notices

      if (identity.type !== 'superAdmin') {
        var canteen = canteens[0]
        canteen.inBusiness = false
        for (let i = 0; i < canteen.businessTime.length; i++) {
          const time = canteen.businessTime[i];
          if (intCurTime > parseInt(time[0]) && intCurTime < parseInt(time[1])) {
            canteen.inBusiness = true
            break
          }
        }
        that.setData({
          intCurTime,
          canteen,
          pageCurr: 'order'
        })

        Promise.all([p3, p4]).then(res => {
          that.setData({
            'orders.finishedOrdersCount': res[0],
            'orders.newOrders': res[1]
          })
          wx.hideLoading()
        })
      } else {
        wx.hideLoading()
      }
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

      let cID = that.data.user.identity.cID
      watcher = db.collection('orders')
        .where({
          'goodsInfo.shopInfo.cID': cID, //所属餐厅（同时是数据库安全权限内容）
          'orderInfo.orderState': 'NOTCONFIRM' // 仅监听未确认状态的订单
        })
        .watch({
          onChange: function (snapshot) {
            if (snapshot.type === 'init') {
              wx.hideLoading()
              util.showToast('订单推送已开启', 'success', 1500)
              that.setData({
                watchOrderFlag: true
              })
            } else {
              console.log(snapshot)
            }
          },
          onError: function (err) {
            wx.hideLoading()
            util.showToast('订单推送异常', 'error', 1500)
            that.setData({
              watchOrderFlag: false
            })
          }
        })
    } else {
      util.showLoading('关闭订单推送')
      watcher.close().then(res => {
        wx.hideLoading()
        util.showToast('订单推送已关闭', 'success', 1500)
        that.setData({
          watchOrderFlag: false
        })
      }).catch(e => {
        wx.hideLoading()
      })
    }
  },
  getFinishedOrdersCount: function () {
    const cID = that.data.user.identity.cID
    return new Promise((resolve, reject) => {
      db.collection('orders')
        .where({
          'goodsInfo.shopInfo.cID': cID, //所属餐厅（同时是数据库安全权限内容）
          'orderInfo.orderState': 'SUCCESS',
          'orderInfo.timeInfo.endTime': _.gte(getTodayDateTime())
        }).count().then(res => {
          resolve(res.total)
        }).catch(e => {
          reject(e)
        })
    })
  },
  getNewOrders: function(){
    const cID = that.data.user.identity.cID
    return new Promise((resolve, reject) => {
      db.collection('orders')
      .where({
        'goodsInfo.shopInfo.cID': cID, //所属餐厅（同时是数据库安全权限内容）
        'orderInfo.orderState': 'NOTCONFIRM',
      }).get().then(res => {
        resolve(res.data)
      }).catch(e => {
        reject(e)
      })
    })
  }
})

function getTodayDateTime() {
  var date = new Date()
  let year = date.getFullYear()
  let month = (date.getMonth() + 1).toString().padStart(2, '0')
  let day = date.getDate().toString().padStart(2, '0')
  return year + month + day + '000000'
}
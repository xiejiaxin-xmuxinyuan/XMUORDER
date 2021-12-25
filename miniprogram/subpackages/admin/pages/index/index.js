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

function newOrdersSort(a, b) {
  return a.orderInfo.timeInfo.createTime > b.orderInfo.timeInfo.createTime ? 1 : -1;
}

//返回14位字符串日期20210102030405
function getStrDate(date) {
  let year = date.getFullYear()
  let month = (date.getMonth() + 1).toString().padStart(2, '0')
  let day = date.getDate().toString().padStart(2, '0')
  let hour = date.getHours().toString().padStart(2, '0')
  let min = date.getMinutes().toString().padStart(2, '0')
  let sec = date.getSeconds().toString().padStart(2, '0')
  return year + month + day + hour + min + sec
}

Page({
  data: {
    pageCurr: "admin",
    watchOrderFlag: false,
    user: {},
    intCurTime: 0,
    orders: {
      newOrders: [],
      acceptedOrdersCount: 0
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
        path: '../staff/staff'
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

    var proList = []

    // 餐厅信息
    if (identity.type !== 'superAdmin') {
      proList.push(
        db.collection("canteen").where({
          cID: identity.cID
        }).get()
      )
    } else {
      proList.push(
        db.collection("canteen").get()
      )
    }

    // 未处理订单相关信息
    if (identity.type !== 'superAdmin') {
      proList.push(
        that.getAcceptedOrdersCount(),
        that.getNewOrders()
      )
    }

    Promise.all(proList).then(res => {

      //放入全局变量
      var canteens = res[0].data //餐厅数据
      app.globalData.canteen = canteens

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
          pageCurr: 'order',
          'orders.acceptedOrdersCount': res[1],
          'orders.newOrders': res[2].record,
          'orders.currPage': res[2].currPage,
          'orders.totalPage': res[2].totalPage,
          'orders.totalCount': res[2].totalCount,
        })
      }
      wx.hideLoading()
    })
  },
  onUnload: function () {
    if (that.data.watchOrderFlag) {
      watcher.close().then(res => {
        util.showToast('订单推送已关闭')
      })
    }
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
  watchOrder: function (e, flag = null) { //订单监听
    var watchOrderFlag
    if (flag !== null) {
      watchOrderFlag = flag
    } else {
      watchOrderFlag = e.detail.value
    }

    if (watchOrderFlag) {
      util.showLoading('开启订单推送')
      let cID = that.data.user.identity.cID
      watcher = db.collection('orders')
        .where({
          'goodsInfo.shopInfo.cID': cID, //所属餐厅（同时是数据库安全权限内容）
          'orderInfo.orderState': 'NOTCONFIRM' // 仅监听未确认状态的订单
        })
        .orderBy('orderInfo.timeInfo.createTime', 'desc')
        .watch({
          onChange: function (snapshot) {
            var newOrders = snapshot.docs
            var totalCount = newOrders.length
            var totalPage = totalCount === 0 ? 0 : totalCount <= 5 ? 1 : Math.ceil(totalCount / 5)
            newOrders.sort(newOrdersSort) //排序
            newOrders.forEach(order => {
              order.userInfo.phoneEnd = order.userInfo.phone.slice(-4)
            })
            var setData = {
              'orders.newOrders': newOrders,
              'orders.totalCount': totalCount,
              'orders.totalPage': totalPage,
              'orders.currPage': totalPage,
            }
            if (snapshot.type === 'init') {
              wx.hideLoading()
              util.showToast('订单推送已开启', 'success', 1500)
              setData.watchOrderFlag = true
            } else {
              var newCount = 0 //新增订单数
              for (let i = 0; i < snapshot.docChanges.length; i++) {
                const change = snapshot.docChanges[i];
                if ('updatedFields' in change && 'orderInfo.orderState' in change.updatedFields) {
                  if (change.updatedFields['orderInfo.orderState'] === 'NOTCONFIRM') {
                    newCount += 1
                  }
                  that.getAcceptedOrdersCount().then(res => {
                    that.setData({
                      'orders.acceptedOrdersCount': res,
                    })
                  })
                }
              }

              if (newCount) {
                wx.vibrateShort({
                  type: 'medium'
                })
                util.showToast('你有' + newCount + '条新订单啦，请及时在首页处理', 'none', 2000)
              }
            }
            // 保存
            that.setData(setData)
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
  getAcceptedOrdersCount: function () {
    const cID = that.data.user.identity.cID
    return new Promise((resolve, reject) => {
      db.collection('orders')
        .where({
          'goodsInfo.shopInfo.cID': cID, //所属餐厅（同时是数据库安全权限内容）
          'orderInfo.orderState': 'ACCEPT',
        }).count().then(res => {
          resolve(res.total)
          return
        }).catch(e => {
          reject(e)
          return
        })
    })
  },
  getNewOrders: function (currPage = 1) {
    const cID = that.data.user.identity.cID
    return new Promise((resolve, reject) => {
      // 统计订单数
      db.collection('orders')
        .where({
          'goodsInfo.shopInfo.cID': cID, //所属餐厅（同时是数据库安全权限内容）
          'orderInfo.orderState': 'NOTCONFIRM',
        }).count().then(res => {
          const totalCount = res.total
          const totalPage = totalCount === 0 ? 0 : totalCount <= 5 ? 1 : Math.ceil(totalCount / 5)

          if (currPage > totalPage) {
            resolve({
              record: [],
              currPage: currPage,
              totalPage: totalPage,
              totalCount: totalCount,
            })
            return
          }
          // 读取当前页订单
          db.collection('orders')
            .where({
              'goodsInfo.shopInfo.cID': cID, //所属餐厅（同时是数据库安全权限内容）
              'orderInfo.orderState': 'NOTCONFIRM',
            })
            .skip((currPage - 1) * 5)
            .limit(5)
            .get().then(res => {
              res.data.forEach(order => {
                order.userInfo.phoneEnd = order.userInfo.phone.slice(-4)
              });
              resolve({
                record: res.data,
                currPage: currPage,
                totalPage: totalPage,
                totalCount: totalCount,
              })
              return
            }).catch(e => {
              reject()
              return
            })
        })
        .catch(e => {
          reject()
        })
    })
  },
  onReachBottom() {
    const pageCurr = that.data.pageCurr
    if (pageCurr === 'order') {
      const totalPage = that.data.orders.totalPage
      var watchOrderFlag = that.data.watchOrderFlag
      var currPage = that.data.orders.currPage
      if (currPage < totalPage && !watchOrderFlag) {
        util.showLoading('加载中')
        that.getNewOrders(currPage + 1).then(res => {
          var newOrders = that.data.orders.newOrders
          that.setData({
            'orders.newOrders': newOrders.concat(res.record),
            'orders.currPage': res.currPage,
            'orders.totalPage': res.totalPage,
            'orders.totalCount': res.totalCount,
          })
          wx.hideLoading()
        }).catch(e => {
          wx.hideLoading()
        })
      }
    }
  },
  rejectOrder: function (e) {
    if (!that.data.watchOrderFlag) {
      wx.showModal({
        title: '提示',
        content: '请先开启订单推送！',
        confirmText: '开启',
      }).then(res => {
        if (res.confirm) {
          that.watchOrder(null, true)
        }
      })
      return
    }
    wx.showModal({
      title: '提示',
      content: '确定拒单？'
    }).then(res => {
      if (res.confirm) {

        const index = e.currentTarget.dataset.index
        const outTradeNo = that.data.orders.newOrders[index].orderInfo.outTradeNo

        util.showLoading('拒单请求中')
        wx.cloud.callFunction({
            name: 'payOrderCancel',
            data: {
              outTradeNo: outTradeNo,
              rejectOrder: true
            }
          }).then(res => {
            util.hideLoading()
            if (res.result.success) {
              util.showToast('拒单成功', 'success')
            } else {
              util.showToast('拒单失败', 'error')
            }
          })
          .catch(e => {
            util.hideLoading()
            util.showToast('拒单失败', 'error')
          })
      }
    })
  },
  acceptOrder: function (e) {
    if (!that.data.watchOrderFlag) {
      wx.showModal({
        title: '提示',
        content: '请先开启订单推送！',
        confirmText: '开启',
      }).then(res => {
        if (res.confirm) {
          that.watchOrder(null, true)
        }
      })
      return
    }

    wx.showModal({
      title: '提示',
      content: '确定接单？',
    }).then(res => {
      if (res.confirm) {
        const index = e.currentTarget.dataset.index
        const order = that.data.orders.newOrders[index]
        //接单请求
        util.showLoading('接单请求中')
        wx.cloud.callFunction({
            name: 'dbUpdate',
            data: {
              table: 'orders',
              _id: order._id,
              formData: {
                'orderInfo.orderState': 'ACCEPT',
                'orderInfo.orderStateMsg': '已受理',
                'orderInfo.timeInfo.confirmTime': getStrDate(new Date())
              }
            }
          }).then(res => {
            util.hideLoading()
            if (res.result.success && res.result.res.stats.updated === 1) {
              util.showToast('接单成功', 'success')
            } else {
              util.showToast('接单失败', 'error')
            }
          })
          .catch(e => {
            util.hideLoading()
            util.showToast('接单失败', 'error')
          })
      }
    })
  },
  toAccept: function () {
    wx.navigateTo({
      url: '../order/accept',
    })
  }
})
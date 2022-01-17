// subpackages/admin/pages/shop/shop.js
const app = getApp()
const db = wx.cloud.database()
const util = require('../../../../utils/util.js')
var that
Page({
  data: {
    identity: '',
    canteens: [],
    canteenCurrPage: 1,
    canteenTotalPage: 0,
    canteenTotalCount: 0,
    isLoaded: false
  },
  onLoad: function (options) {
    that = this
  },
  onShow: () => {
    util.showLoading('加载中')
    var p = that.getCanteens()
    Promise.all([p]).then(res => {
      wx.hideLoading()
      var canteens = res.data
      that.setData({
        canteens: canteens, //餐厅数据
        isLoaded: true, // 表示加载完毕
        identity: app.globalData.identity
      })
    })
    wx.hideLoading()
  },
  delShop(e) {
    var index0 = e.currentTarget.dataset.index
    var canteen = that.data.canteens[index0]
    var canteenCurrPage = that.data.canteenCurrPage
    const identity = app.globalData.identity
    if (identity.type !== 'superAdmin') {
      util.showToast('您没有该餐厅的删除权限')
      return
    }
    wx.showModal({
      title: '提示',
      content: '确认删除吗？',
      success(res) {
        if (res.confirm) {
          util.showLoading('正在删除餐厅')
          let _id = canteen._id
          // 商店数据
          var p0 = wx.cloud.callFunction({
            name: 'dbMove',
            data: {
              table: 'canteen',
              _id: _id
            }
          })
          // 商店图片
          var fileIDs = canteen.image
          fileIDs.push(canteen.thumb)
          //云函数无视权限删除图片
          var p1 = wx.cloud.callFunction({
            name: 'cloudFilesDelete',
            data: {
              fileIDs
            }
          })
          Promise.all([p0, p1]).then(res => {
            // 不考虑图片删除结果
            if (res[0].result.success) {
              that.getCanteens(canteenCurrPage).then(() => {
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
  canteenChangePage: function (e) {
    const currPage = that.data.canteenCurrPage
    const totalPage = that.data.canteenTotalPage
    if ('add' in e.currentTarget.dataset) { //增加
      if (currPage <= totalPage - 1) {
        util.showLoading('加载中')
        that.getCanteens(currPage + 1).then(() => {
          wx.hideLoading()
        })
      } else {
        util.showToast('已经是最后一页啦')
      }
    } else { //减少
      if (currPage > 1) {
        util.showLoading('加载中')
        that.getCanteens(currPage - 1).then(() => {
          wx.hideLoading()
        })
      } else {
        util.showToast('已经是第一页啦')
      }
    }
  },
  getCanteens: function (canteenCurrPage = 1, pageSize = 5) {
    return new Promise(async (resolve, reject) => {
      if (canteenCurrPage < 1) {
        canteenCurrPage = 1
      }
      const countResult = await db.collection('canteen').count()
      const canteenTotalCount = countResult.total
      const canteenTotalPage = canteenTotalCount === 0 ? 0 : canteenTotalCount <= pageSize ? 1 : Math.ceil(canteenTotalCount / pageSize)
      if (canteenTotalCount === 0) { //如果没有任何记录
        that.setData({
          canteens: [],
          canteenCurrPage: 1,
          canteenTotalPage: 0,
          canteenTotalCount: 0,
        })
        resolve()
        return
      }
      if (canteenCurrPage > canteenTotalPage) {
        canteenCurrPage = canteenTotalPage
      }
      db.collection('canteen')
        .skip((canteenCurrPage - 1) * pageSize).limit(pageSize)
        .get().then(res => {
          that.setData({
            canteens: res.data,
            canteenCurrPage: canteenCurrPage,
            canteenTotalPage: canteenTotalPage,
            canteenTotalCount: canteenTotalCount,
          })
          resolve()
          return
        })
    })
  },
  editShop: function (e) {
    var index = e.currentTarget.dataset.index
    var canteen = that.data.canteens[index]
    const identity = app.globalData.identity
    if (identity.type !== 'superAdmin') {
      if (identity.cID !== canteen.cID) {
        util.showToast('您没有该商店的编辑权限')
        return
      }
    }
    wx.navigateTo({
      url: './editShop ? canteen=' + JSON.stringify(canteen)
    })
  },
  toAddShop: function (e) {
    const identity = app.globalData.identity
    if (identity.type !== 'superAdmin') {
      util.showToast('您没有该餐厅的删除权限')
      return
    }
    wx.navigateTo({
      url: './addShop',
    })
  },


})
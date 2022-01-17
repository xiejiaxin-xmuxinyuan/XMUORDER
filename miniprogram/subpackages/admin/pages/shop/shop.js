// subpackages/admin/pages/shop/shop.js
const app = getApp()
const db = wx.cloud.database()
const util = require('../../../../utils/util.js')
var that
Page({
  data: {
    identity: {},
    canteens: [],
    canteenCurrPage: 1,
    canteenTotalPage: 0,
    canteenTotalCount: 0,
  },
  onLoad: function (options) {
    that = this
  },
  onShow(){
    that = this
    util.showLoading('加载中')
    that.getCanteens(that.data.canteenCurrPage).then(() => {
      util.hideLoading()
      that.setData({
        identity: app.globalData.identity
      })
    })
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
  editShop: function (e) {
    var index = e.currentTarget.dataset.index
    var canteen = that.data.canteens[index]
    const identity = that.data.identity
    if (identity.type !== 'superAdmin') {
      if (identity.cID !== canteen.cID) {
        util.showToast('您没有该商店的编辑权限')
        return
      }
    }
    wx.navigateTo({
      url: './editShop?canteen=' + JSON.stringify(canteen)
    })
  },
  toAddShop: function (e) {
    const identity = that.data.identity
    if (identity.type !== 'superAdmin') {
      util.showToast('您没有新增餐厅的权限')
      return
    }
    wx.navigateTo({
      url: './addShop',
    })
  },


})
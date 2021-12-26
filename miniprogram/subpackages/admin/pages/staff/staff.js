// subpackages/admin/pages/staff/staff.js
const util = require('../../../../utils/util.js')
const app = getApp()
var that

Page({
  data: {
    identity: {},
    canteens: [],
    shopPickerList: [],
    users: [],
    staffList: [],
    shopPickerIndex: null,
    currPage: 0,
    totalPage: 1,
  },

  onLoad: function (options) {
    that = this
    var canteens = app.globalData.canteens
    const identity = app.globalData.identity
    var shopPickerList = [] //餐厅名列表

    canteens.forEach((canteen, index) => {
      shopPickerList.push(canteen.name)
      // 身份所属餐厅
      if (identity.type !== 'superAdmin') {
        if (canteen.cID === identity.cID) {
          that.shopPickerChange(index)
        }
      }
    })

    that.setData({
      canteens,
      shopPickerList,
      identity: identity
    })
  },
  shopPickerChange: function (e) {
    if (typeof (e) === "number") {
      var shopIndex = e
    } else {
      //若选择项不变
      if (that.data.shopPickerIndex === e.detail.value) {
        return
      }
      var shopIndex = e.detail.value
    }
    //加载对应餐厅员工（第一页）
    that.loadPage(shopIndex)
  },
  loadPage: (shopIndex, currPage = 1, pageSize = 5) => {
    util.showLoading('加载中')
    const cID = app.globalData.canteens[shopIndex].cID
    wx.cloud.callFunction({
        name: 'getCanteenStaff',
        data: {
          cID,
          currPage,
          pageSize
        }
      }).then(res => {
        wx.hideLoading()
        if (res.result.success) {
          //保存page信息和员工列表
          var data = {
            currPage: res.result.currPage,
            totalPage: res.result.totalPage,
            staffList: res.result.staff
          }
          //是否修改商店选项
          if (that.data.shopPickerIndex !== shopIndex) {
            data.shopPickerIndex = shopIndex
          }
          that.setData(data)
          return
        } else {
          util.showToast('加载失败', 'error')
          return
        }
      })
      .catch(e => {
        wx.hideLoading()
        util.showToast('加载失败', 'error')
        return
      })
  },
  changePage: function (e) {
    const dataset = e.currentTarget.dataset
    const shopIndex = that.data.shopPickerIndex
    var currPage = that.data.currPage
    var totalPage = that.data.totalPage
    if ('add' in dataset) { //增加
      if (currPage <= totalPage - 1) {
        that.loadPage(shopIndex, currPage + 1)
      } else {
        util.showToast('已经是最后一页啦')
      }
    } else { //减少
      if (currPage > 1) {
        that.loadPage(shopIndex, currPage - 1)
      } else {
        util.showToast('已经是第一页啦')
      }
    }
  },
  delStaff: function (e) {
    var index = e.currentTarget.dataset.index
    const staff = that.data.staffList[index]
    const shopIndex = that.data.shopPickerIndex
    const currPage = that.data.currPage

    wx.showModal({
      title: '是否移除该员工？',
      content: '移除员工：' + staff.name,
      success(res) {
        if (res.confirm) {
          //云函数数据库更新 pull
          util.showLoading('删除中')
          wx.cloud.callFunction({
              name: 'dbUpdate',
              data: {
                table: 'users',
                _id: staff._id,
                set: true,
                path: 'identity',
                formData: {
                  type: 'user'
                }
              }
            })
            .then(res => {
              if (res.result.success) {
                wx.hideLoading()
                util.showToast('删除成功', 'success', 1500)
              } else {
                wx.hideLoading()
                util.showToast('删除失败', 'error', 2000)
              }
              setTimeout(() => {
                that.loadPage(shopIndex, currPage)
              }, 1500)
            })
            .catch(e => {
              wx.hideLoading()
              util.showToast('删除失败', 'error', 2000)
              console.error(e)
              setTimeout(() => {
                that.loadPage(shopIndex, currPage)
              }, 2000)
            })
        } else {
          util.showToast('操作已取消')
        }
      }
    })
  },
  toAddStaff: function (e) {
    const shopIndex = that.data.shopPickerIndex
    var currPage = that.data.currPage
    wx.navigateTo({
      url: './addStaff',
      events: {
        refresh: function () {
          that.loadPage(shopIndex, currPage)
        }
      }
    })
  },
})
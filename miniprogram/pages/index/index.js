// pages/welcome/welcome.js
var that
const app = getApp()

Page({

  data: {
    identity: null
    //null说明是新用户
    //user说明是已注册用户
    // 管理员admin 员工staff
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    wx.showLoading({
      title: '获取信息中',
    })
    app.init()
      .then(globalData => {
        that.setData({
          identity: globalData.identity
        })
        wx.hideLoading()
      })
      .catch(err => {
        wx.hideLoading()
        console.error(err)
      })
  },
  redictoUser: function (e) {
    wx.redirectTo({
      url: '../../subpackages/order/pages/index/index',
    })
  },
  redictoAdmin: function (e) {
    wx.navigateTo({
      url: '../../subpackages/admin/pages/index/index',
    })
  }
})
//app.js
App({
  init: function () {
    var that = this
    that.globalData.isActive = false
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
          name: "checkLogin"
        })
        .then(res => {
          that.globalData.isActive = res.result.isActive
          // 如果已登录，在本地保存用户信息
          if (that.globalData.isActive) {
            that.globalData.phone = res.result.phone
            that.globalData.name = res.result.name,
            that.globalData.address = res.result.address,
            that.globalData.identity = res.result.identity
            that.globalData.nickName = res.result.nickName
          }
          else{
            that.globalData.identity = 'unregistered' //标注未注册身份
          }
          resolve(that.globalData)
        })
        .catch(err => {
          reject(err)
        })
    })
  },
  onLaunch: function () {
    this.globalData = {}
    wx.getSystemInfo({
      success: e => {
        this.globalData.StatusBar = e.statusBarHeight;
        let custom = wx.getMenuButtonBoundingClientRect();
        this.globalData.Custom = custom;
        this.globalData.CustomBar = custom.bottom + custom.top - e.statusBarHeight;
      }
    })
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-4g4b6j139b4e50e0',
        traceUser: true,
      })
    }
  }
})
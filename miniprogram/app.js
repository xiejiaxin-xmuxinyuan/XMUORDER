//app.js
App({
  init: function () {
    var that = this
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
          name: "checkLogin"
        })
        .then(res => {
          if (res.result.isActive) {
            for (const k in res.result) {
              const v = res.result[k];
              that.globalData[k] = v
            }
          } else {
            that.globalData.isActive = false
            that.globalData.identity = 'unregistered' //标注未注册身份
          }
          resolve()
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
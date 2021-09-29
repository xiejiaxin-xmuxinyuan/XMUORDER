//app.js
App({
  onLaunch: async function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-4g4b6j139b4e50e0',
        traceUser: true,
      })
    }
    this.globalData = {}
    this.globalData.isActive = false
    wx.getSystemInfo({
      success: e => {
        this.globalData.StatusBar = e.statusBarHeight;
        let custom = wx.getMenuButtonBoundingClientRect();
        this.globalData.Custom = custom;  
        this.globalData.CustomBar = custom.bottom + custom.top - e.statusBarHeight;
      }
    })
    await wx.cloud.callFunction({name: "checkLogin"})
    .then(res => {
      this.globalData.isActive = res.result.isActive
      // 如果已登录，在本地保存用户信息
      if (this.globalData.isActive) {
        this.globalData.phone = res.result.phone
        this.globalData.name = res.result.name,
        this.globalData.address = res.result.address
      }
    })
    .catch(err => {
      console.error(err)
    })
  }
})

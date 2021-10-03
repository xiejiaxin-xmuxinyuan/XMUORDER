// pages/index/index.js
const app = getApp()
var that


Page({
  data: {
    pageCurr: "admin",
    name: app.globalData.name,
    phone: app.globalData.phone,
    address: app.globalData.address,
    identity: app.globalData.identity,
    //管理员、员工（staff）


    //可以考虑在里面加上页面路径键值对
    iconList: [{
      icon: 'noticefill',
      color: 'yellow',
      name: '公告'
    }, {
      icon: 'friendfill',
      color: 'grey',
      name: '员工管理'
    }, {
      icon: 'taoxiaopu',
      color: 'blue',
      name: '商店信息'
    }, {
      icon: 'goodsnewfill',
      color: 'orange',
      name: '商品管理'
    }, {
      icon: 'rankfill',
      color: 'red',
      name: '统计'
    }, {
      icon: 'settingsfill',
      color: 'olive',
      name: '设置'
    }, {
      icon: 'questionfill',
      color: 'black',
      name: '帮助'
    }]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
  },
  onNavChange: function (e) {
    const pageCurr = e.currentTarget.dataset.cur
    that.setData({
      pageCurr
    })
  }

})
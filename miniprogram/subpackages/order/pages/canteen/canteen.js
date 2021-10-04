// pages/canteen/canteen.js
var that
const db = wx.cloud.database()
const app = getApp()
Page({
  /**
   * 页面的初始数据
   */
  data: {
    canteen: {},
    TabCur: 0,
    MainCur: 0,
    VerticalNavTop: 0,
    load: true,
    showInfo: false,
    list: [] //foodList
  },

  // onPullDownRefresh 之后考虑下拉刷新数据

  onLoad: function (options) {
    that = this
    var list = app.globalData.canteen.foodList
    for (let i = 0; i < list.length; i++) {
      list[i].id = i;
    }
    that.setData({
      list: list,
      listCur: list[0],
      canteen: app.globalData.canteen
    })
  },

  tabSelect(e) {
    this.setData({
      TabCur: e.currentTarget.dataset.id,
      MainCur: e.currentTarget.dataset.id,
      VerticalNavTop: (e.currentTarget.dataset.id - 1) * 50
    })
  },
  VerticalMain(e) {
    let that = this;
    let list = this.data.list;
    let tabHeight = 0;
    if (this.data.load) {
      for (let i = 0; i < list.length; i++) {
        let view = wx.createSelectorQuery().select("#main-" + list[i].id);
        view.fields({
          size: true
        }, data => {
          list[i].top = tabHeight;
          tabHeight = tabHeight + data.height;
          list[i].bottom = tabHeight;
        }).exec();
      }
      that.setData({
        load: false,
        list: list
      })
    }
    let scrollTop = e.detail.scrollTop + 20;
    for (let i = 0; i < list.length; i++) {
      if (scrollTop > list[i].top && scrollTop < list[i].bottom) {
        that.setData({
          VerticalNavTop: (list[i].id - 1) * 50,
          TabCur: list[i].id
        })
        return false
      }
    }
  },
  //餐厅信息折叠
  toggleInfo: function (event) {
    this.setData({
      showInfo: !that.data.showInfo
    })
  },
  foodOrderNumAdd: function (e) {
    let index1 = e.currentTarget.dataset.index1
    let index2 = e.currentTarget.dataset.index2
    const food = that.data.list[index1].food[index2]
    let orderNum = 1
    if (food.orderNum) { //如果有这个键或者值非0
      orderNum = food.orderNum + 1
    }

    //判断库存是否足够
    if (food.curNum >= orderNum) {
      // list[index1].food[index2].orderNum
      let s = 'list[' + index1 + '].food[' + index2 + '].orderNum'
      that.setData({
        [s]: orderNum
      })
    } else {
      wx.showToast({
        title: '库存不足',
        icon: 'none',
        duration: 500
      })
    }
  },
  foodOrderNumDec: function (e) {
    let index1 = e.currentTarget.dataset.index1
    let index2 = e.currentTarget.dataset.index2
    const food = that.data.list[index1].food[index2]
    if (food.orderNum >= 1) {
      let orderNum = food.orderNum - 1

      // list[index1].food[index2].orderNum
      let s = 'list[' + index1 + '].food[' + index2 + '].orderNum'
      that.setData({
        [s]: orderNum
      })
    }
  }
})
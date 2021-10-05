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
    list: [], //foodList
    money: 0,
    orderList: {
      length: 0
    }, //已点食物的访问坐标数组 {index1|index2: [数量,index1,index2]}
    showShoppingCart: false
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
    var money = that.data.money
    var orderList = that.data.orderList

    let orderNum = 1
    if (food.orderNum) { //如果有这个键或者值非0
      orderNum = food.orderNum + 1
    }

    //判断库存是否足够，是否允许增加数量
    if (food.curNum >= orderNum) {
      //计算合计价格
      let price = food.price
      money += price
      //添加到购物车列表
      let orderItem = [orderNum, index1, index2]
      let temp = index1.toString() + '|' + index2.toString()
      orderList[temp] = orderItem
      orderList.length = Object.keys(orderList).length - 1 //减掉length本身
      //计算该类别已点数量
      let tpyeOrderNum = that.data.list[index1].tpyeOrderNum
      tpyeOrderNum = tpyeOrderNum > 0 ? tpyeOrderNum + 1 : orderNum

      // list[index1].food[index2].orderNum
      let s1 = 'list[' + index1 + '].food[' + index2 + '].orderNum'
      // list[index1].tpyeOrderNum
      let s2 = 'list[' + index1 + '].tpyeOrderNum'
      that.setData({
        [s1]: orderNum,
        [s2]: tpyeOrderNum,
        orderList: orderList,
        money: money
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
    var money = that.data.money
    var orderList = that.data.orderList

    if (food.orderNum >= 1) {
      let orderNum = food.orderNum - 1
      //计算合计价格
      let price = food.price
      money -= price
      //添加到购物车列表
      let temp = index1.toString() + '|' + index2.toString() //合并为字符串key
      if (orderNum == 0) {
        delete orderList[temp]
      } else { //删除键值对
        let orderItem = [orderNum, index1, index2]
        orderList[temp] = orderItem
      }
      //更新length
      orderList.length = Object.keys(orderList).length - 1 //减掉length属性本身
      //计算该类别已点数量
      let tpyeOrderNum = that.data.list[index1].tpyeOrderNum
      tpyeOrderNum = tpyeOrderNum > 0 ? tpyeOrderNum - 1 : orderNum

      // list[index1].food[index2].orderNum
      let s1 = 'list[' + index1 + '].food[' + index2 + '].orderNum'
      // list[index1].tpyeOrderNum
      let s2 = 'list[' + index1 + '].tpyeOrderNum'
      that.setData({
        [s1]: orderNum,
        [s2]: tpyeOrderNum,
        orderList: orderList,
        money: money
      })
    }
  },
  showShoppingCart: e => {
    that.setData({
      showShoppingCart: true
    })
  },
  hideShoppingCart: e => {
    that.setData({
      showShoppingCart: false
    })
  },
  toSettlement: function(e){
    var orderList = that.data.orderList
    if (orderList.length>0){
      let settlement = {
        orderList: that.data.orderList,
        list: that.data.list,
        canteen: that.data.canteen,
        money: that.data.money
      }
      app.globalData.settlement = settlement
      wx.navigateTo({
        url: './settlement',
      })
    }else{
      wx.showToast({
        title: '请选择要购买的商品',
        icon: 'none',
        duration: 500
      })
    }
  },
  blocking: e => {} //什么也不做
})
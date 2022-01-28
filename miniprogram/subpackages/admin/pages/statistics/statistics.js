const util = require('../../../../utils/util.js')
var wxCharts = require('../../../../utils/wxcharts.js')
const db = wx.cloud.database()
const app = getApp()
var that
// 柱状图
var orderColumnChart = null
var feeColumnChart = null
var orderColumnChartData = {
  main: {
    title: '订单数量',
    data: [],
    categories: ['本月', '本周', '当天']
  },
};
var feeColumnChartData = {
  main: {
    title: '营业额',
    data: [],
    categories: ['本月', '本周', '当天']
  },
};
// 曲线图
var lineChart = null
var startPos = null

Page({
  data: {
    orderType: "订单数量",
    feeType: "营业额",
    informTypes: ['订单数量', '营业额'],
    informCurrType: "订单数量",
    orders: [],
    cID: '',
    totalOrder: 0, // 订单数量
    dayOrder: 0,
    weekOrder: 0,
    monthOrder: 0,
    weekFee: 0, // 营业额
    monthFee: 0,
    dayFee: 0,
    year: 0, // 当前的年-月-周-日
    day: 0,
    month: 0,
    week: 0,
    dayInMonthOrder: [],
    dayInWeekOrder: []
  },
  onLoad: function (options) {
    that = this
    var nowDate = new Date()
    var year = nowDate.getFullYear()
    var day = nowDate.getDate()
    var month = nowDate.getMonth()
    month += 1
    var week = 1
    for (var i = 1; i <= day; i++) {
      if (i % 7 == 0)
        week += 1
    }
    var dayInMonthOrder = that.data.dayInMonthOrder
    var dayInWeekOrder = that.data.dayInWeekOrder
    var date = new Date()
    var d = date.getDay()
    if (d === 0) {
      d = 7
    }
    for (var i = 0; i <= day; i++) {
      dayInMonthOrder.push(0)
    }
    for (var i = 0; i <= d; i++) {
      dayInWeekOrder.push(0)
    }
    that.setData({
      cID: app.globalData.identity.cID,
      year,
      day,
      month,
      week,
      dayInMonthOrder,
      dayInWeekOrder
    })
  },
  onShow: function () {
    util.showLoading('加载中')
    that.getOrder().then(() => {
      var orders = that.data.orders
      for (var i = 0; i < orders.length; i++) {
        that.calculate(orders[i].orderInfo.timeInfo.createTime, orders[i].payInfo.feeInfo.totalFee)
      }
      if (orderColumnChartData.main.data.length == 0) {
        var dayOrder = that.data.dayOrder
        var weekOrder = that.data.weekOrder
        var monthOrder = that.data.monthOrder
        orderColumnChartData.main.data.push(monthOrder, weekOrder, dayOrder)
      }
      if (feeColumnChartData.main.data.length == 0) {
        var dayFee = that.data.dayFee
        var weekFee = that.data.weekFee
        var monthFee = that.data.monthFee
        feeColumnChartData.main.data.push(monthFee, weekFee, dayFee)
      }
      that.makeOrderColumnChart()
      that.makeFeeColumnChart()
      that.makeScrollLine()
      util.hideLoading()
    })
  },
  touchHandler: function (e) {
    lineChart.scrollStart(e);
  },
  moveHandler: function (e) {
    lineChart.scroll(e);
  },
  touchEndHandler: function (e) {
    lineChart.scrollEnd(e);
    lineChart.showToolTip(e, {
      format: function (item, category) {
        return category + ' ' + item.name + ':' + item.data
      }
    });
  },

  createSimulationData: function () {
    var categories = []
    var data = []
    var dayInMonthOrder = that.data.dayInMonthOrder
    var day = that.data.day
    var month = that.data.month
    for (var i = 1; i <= day; i++) {
      categories.push(month + '月' + i + '日')
      data.push(dayInMonthOrder[i])
    }
    return {
      categories: categories,
      data: data
    }
  },
  makeScrollLine() {
    var windowWidth = 320;
    try {
      var res = wx.getSystemInfoSync();
      windowWidth = res.windowWidth;
    } catch (e) {
      console.error('getSystemInfoSync failed!');
    }
    var simulationData = this.createSimulationData()
    lineChart = new wxCharts({
      canvasId: 'lineCanvas',
      type: 'line',
      categories: simulationData.categories,
      animation: false,
      series: [{
        name: '月订单数量',
        data: simulationData.data,
        format: function (val, name) {
          return val.toFixed(0) + '单';
        }
      }],
      xAxis: {
        disableGrid: false
      },
      yAxis: {
        title: '数量',
        format: function (val) {
          return val.toFixed(0);
        },
        min: 0
      },
      width: windowWidth,
      height: 200,
      dataLabel: true,
      dataPointShape: true,
      enableScroll: true,
      extra: {
        lineStyle: 'curve'
      }
    });
  },
  informTypeSelect: function (e) {
    const informCurrType = e.currentTarget.dataset.name
    that.setData({
      informCurrType: informCurrType,
    })
    util.showLoading('加载中')
    setTimeout(() => {
      that.makeOrderColumnChart()
      that.makeFeeColumnChart()
      that.makeScrollLine()
      util.hideLoading()
    }, 1500);
  },
  makeFeeColumnChart() {
    var windowWidth = 320
    var maxFeeNum = Math.max.apply(null, feeColumnChartData.main.data)
    try {
      var res = wx.getSystemInfoSync()
      windowWidth = res.windowWidth;
    } catch (e) {
      console.error('getSystemInfoSync failed!');
    }
    feeColumnChart = new wxCharts({
      canvasId: 'feeColumnCanvas',
      type: 'column',
      animation: true,
      categories: feeColumnChartData.main.categories,
      series: [{
        name: '营业额',
        data: feeColumnChartData.main.data,
        format: function (val, name) {
          return val.toFixed(2) + '元';
        }
      }],
      yAxis: {
        format: function (val) {
          return val + '元';
        },
        title: '金额',
        min: 0,
        max: maxFeeNum
      },
      xAxis: {
        disableGrid: false,
        type: 'calibration'
      },
      extra: {
        column: {
          width: 15
        }
      },
      width: windowWidth,
      height: 200,
    })
  },
  makeOrderColumnChart() {
    var windowWidth = 320
    var maxOrderNum = Math.max.apply(null, orderColumnChartData.main.data)
    while (maxOrderNum % 5 != 0) {
      maxOrderNum += 1
    }
    try {
      var res = wx.getSystemInfoSync()
      windowWidth = res.windowWidth;
    } catch (e) {
      console.error('getSystemInfoSync failed!');
    }
    orderColumnChart = new wxCharts({
      canvasId: 'orderColumnCanvas',
      type: 'column',
      animation: true,
      categories: orderColumnChartData.main.categories,
      series: [{
        name: '订单数量',
        data: orderColumnChartData.main.data,
        format: function (val, name) {
          return val.toFixed(0) + '单';
        }
      }],
      yAxis: {
        format: function (val) {
          return val + '单';
        },
        title: '数量',
        min: 0,
        max: maxOrderNum
      },
      xAxis: {
        disableGrid: false,
        type: 'calibration'
      },
      extra: {
        column: {
          width: 15
        }
      },
      width: windowWidth,
      height: 200,
    })
  },
  calculate(timeStr, fee) {
    var y = parseInt(timeStr.substring(0, 4))
    var m = parseInt(timeStr.substring(4, 6))
    var d = parseInt(timeStr.substring(6, 8))
    var w = 1
    for (var i = 1; i <= d; i++) {
      if (i % 7 == 0)
        w += 1
    }
    var date = new Date()
    var today = date.getDay()
    if (today === 0) {
      today = 7
    }
    var year = that.data.year
    var month = that.data.month
    var day = that.data.day
    var week = that.data.week
    var monthOrder = that.data.monthOrder
    var weekOrder = that.data.weekOrder
    var dayOrder = that.data.dayOrder
    var monthFee = that.data.monthFee
    var weekFee = that.data.weekFee
    var dayFee = that.data.dayFee
    var dayInMonthOrder = that.data.dayInMonthOrder
    var dayInWeekOrder = that.data.dayInWeekOrder
    if (y === year) {
      if (month === m && w === week && d === day) {
        dayOrder += 1
        weekOrder += 1
        monthOrder += 1
        dayFee += fee
        weekFee += fee
        monthFee += fee
      } else if (month === m && w === week) {
        dayInWeekOrder[today] += 1
        weekOrder += 1
        monthOrder += 1
        weekFee += fee
        monthFee += fee
      } else if (month === m) {
        dayInMonthOrder[d] += 1
        monthOrder += 1
        monthFee += fee
      }
    }
    that.setData({
      dayOrder,
      weekOrder,
      monthOrder,
      dayFee,
      weekFee,
      monthFee
    })

  },
  getOrder: async function () {
    util.showLoading('加载中')
    try {
      const cID = that.data.cID
      var countRes = await db.collection('orders').where({
        'goodsInfo.shopInfo.cID': cID, //所属餐厅（同时是数据库安全权限内容）
        'orderInfo.orderState': 'SUCCESS' //成功状态的订单
      }).count()
      const totalOrder = countRes.total
      if (totalOrder === 0) { //如果没有任何记录
        util.hideLoading()
        that.setData({
          orders: [],
          totalOrder: totalOrder,
        })
        return
      }
      var orderRes = await db.collection('orders').where({
        'goodsInfo.shopInfo.cID': cID, //所属餐厅（同时是数据库安全权限内容）
        'orderInfo.orderState': 'SUCCESS' // 成功状态的订单
      }).get()
      util.hideLoading()
      that.setData({
        orders: orderRes.data,
        totalOrder: totalOrder,
      })
      return
    } catch (e) {
      util.hideLoading()
      util.showToast('加载失败', 'error')
    }
  },


})
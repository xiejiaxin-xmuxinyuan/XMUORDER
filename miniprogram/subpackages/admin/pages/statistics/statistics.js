const util = require('../../../../utils/util.js')
var wxCharts = require('../../../../utils/wxcharts.js')
const db = wx.cloud.database()
const app = getApp()
var that
// 柱状图所用全局变量，在make...Chart()中使用
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
// 曲线图所用全局变量，在make...Chart()中使用
var orderMonthLineChart = null
var orderWeekLineChart = null
var feeMonthLineChart = null
var feeWeekLineChart = null
Page({
  data: {
    dayInMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], // 每月天数
    orderType: "订单数量",
    feeType: "营业额",
    informTypes: ['订单数量', '营业额'],
    informCurrType: "订单数量",
    orders: [],
    cID: '',
    totalOrder: 0, // 订单数量（本月，本周，当天）
    dayOrder: 0,
    weekOrder: 0,
    monthOrder: 0,
    weekFee: 0, // 营业额（本月，本周，当天）
    monthFee: 0,
    dayFee: 0,
    dayInMonthOrder: [], // 详细订单数
    dayInWeekOrder: [],
    dayInMonthFee: [], // 详细营业额
    dayInWeekFee: [],
    date: '', // 今天日期
  },
  onLoad: function (options) {
    that = this
    var dayInMonthOrder = that.data.dayInMonthOrder
    var dayInWeekOrder = that.data.dayInWeekOrder
    var dayInMonth = that.data.dayInMonth
    var dayInMonthFee = that.data.dayInMonthFee
    var dayInWeekFee = that.data.dayInWeekFee
    if (that.judgeLeapYear())
      dayInMonth[1] += 1 // 闰年2月天数+1
    // 初始化
    for (var i = 0; i <= 30; i++)
      dayInMonthOrder.push(0)
    for (var i = 0; i <= 7; i++)
      dayInWeekOrder.push(0)
    for (var i = 0; i <= 30; i++)
      dayInMonthFee.push(0)
    for (var i = 0; i <= 7; i++)
      dayInWeekFee.push(0)
    that.setData({
      cID: app.globalData.identity.cID,
      dayInMonthOrder,
      dayInWeekOrder,
      dayInMonthFee,
      dayInWeekFee,
      dayInMonth
    })
  },
  onShow: function () {
    util.showLoading('加载中')
    that.getOrder().then(() => { // 加载订单
      var orders = that.data.orders
      for (var i = 0; i < orders.length; i++) {
        // 计算 ..Order, ..Fee, dayInMonth.., dayInWeek..
        that.calculate(orders[i].date, orders[i].orderCount, orders[i].orderMoney)
      }
      if (orderColumnChartData.main.data.length === 0) {
        var dayOrder = that.data.dayOrder
        var weekOrder = that.data.weekOrder
        var monthOrder = that.data.monthOrder
        orderColumnChartData.main.data.push(monthOrder, weekOrder, dayOrder)
      }
      if (feeColumnChartData.main.data.length === 0) {
        var dayFee = that.data.dayFee
        var weekFee = that.data.weekFee
        var monthFee = that.data.monthFee
        feeColumnChartData.main.data.push(monthFee, weekFee, dayFee)
      }
      // 画图表
      that.makeOrderColumnChart()
      that.makeFeeColumnChart()
      that.makeOrderMonthScrollLine()
      that.makeOrderWeekScrollLine()
      that.makeFeeMonthScrollLine()
      that.makeFeeWeekScrollLine()
      util.hideLoading()
    })
  },
  // 判断闰年
  judgeLeapYear() {
    var date = new Date()
    var year = date.getFullYear()
    if (year % 4 == 0 && year % 100 != 0 || year % 400 == 0) {
      return true
    }
    return false
  },
  // 切换订单数量与营业额
  informTypeSelect: function (e) {
    const informCurrType = e.currentTarget.dataset.name
    that.setData({
      informCurrType: informCurrType,
    })
    util.showLoading('加载中')
    setTimeout(() => {
      that.makeOrderColumnChart()
      that.makeFeeColumnChart()
      that.makeOrderMonthScrollLine()
      that.makeOrderWeekScrollLine()
      that.makeFeeMonthScrollLine()
      that.makeFeeWeekScrollLine()
      util.hideLoading()
    }, 1500);
  },

  // 画4个曲线图，每个曲线图共有5个函数
  // 前3个函数为拉伸曲线图的函数

  // 画月订单曲线图 : 134 - 223
  orderMonthTouchHandler: function (e) {
    orderMonthLineChart.scrollStart(e)
  },
  orderMonthMoveHandler: function (e) {
    orderMonthLineChart.scroll(e)
  },
  orderMonthTouchEndHandler: function (e) {
    orderMonthLineChart.scrollEnd(e);
    orderMonthLineChart.showToolTip(e, {
      format: function (item, category) {
        return category + ' ' + item.name + ':' + item.data
      }
    });
  },
  // ...CreateSimulationData 计算图中横轴与坐标数值
  orderMonthCreateSimulationData: function () {
    var categories = []
    var data = []
    var dayInMonthOrder = that.data.dayInMonthOrder
    var dayInMonth = that.data.dayInMonth // 每月天数
    var now = that.data.date
    var preDate = that.getDate(30)
    // 计算月份与具体某一天
    var dm1 = parseInt(now.substring(4, 6))
    var dm2 = parseInt(preDate.substring(4, 6))
    var dd1 = parseInt(now.substring(6, 8))
    var dd2 = parseInt(preDate.substring(6, 8))
    if (dm1 === dm2) { // 月份相同
      for (var i = dd2; i <= dd1; i++) {
        categories.push(dm1 + '月' + i + '日')
        data.push(dayInMonthOrder[i])
      }
    } else { // 月份不同
      var dl = dayInMonth[dm2 - 1]
      var cnt = 0
      for (var i = dd2; i <= dl; i++) {
        categories.push(dm2 + '月' + i + '日')
        data.push(dayInMonthOrder[cnt])
        cnt += 1
      }
      for (var i = 1; i <= dd1; i++) {
        categories.push(dm1 + '月' + i + '日')
        data.push(dayInMonthOrder[cnt])
        cnt += 1
      }
    }
    return {
      categories: categories,
      data: data
    }
  },
  // make...ScrollLine 为画图函数
  makeOrderMonthScrollLine() {
    var windowWidth = 320;
    try {
      var res = wx.getSystemInfoSync();
      windowWidth = res.windowWidth;
    } catch (e) {
      console.error('getSystemInfoSync failed!');
    }
    var simulationData = that.orderMonthCreateSimulationData()
    orderMonthLineChart = new wxCharts({
      canvasId: 'orderMonthLineCanvas',
      type: 'line',
      categories: simulationData.categories,
      animation: false,
      series: [{
        name: '月订单数量',
        data: simulationData.data,
        format: function (val, name) {
          return val.toFixed(0) + '单'; // toFixed为控制小数点位置
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
  // 画周订单曲线图: 225 - 316
  orderWeekTouchHandler: function (e) {
    orderWeekLineChart.scrollStart(e)
  },
  orderWeekMoveHandler: function (e) {
    orderWeekLineChart.scroll(e)
  },
  orderWeekTouchEndHandler: function (e) {
    orderWeekLineChart.scrollEnd(e);
    orderWeekLineChart.showToolTip(e, {
      format: function (item, category) {
        return category + ' ' + item.name + ':' + item.data
      }
    });
  },
  orderWeekCreateSimulationData: function () {
    var categories = []
    var data = []
    var dayInWeekOrder = that.data.dayInWeekOrder
    var dayInMonth = that.data.dayInMonth
    var now = that.data.date
    var preDate = that.getDate(7)
    var dm1 = parseInt(now.substring(4, 6))
    var dm2 = parseInt(preDate.substring(4, 6))
    var dd1 = parseInt(now.substring(6, 8))
    var dd2 = parseInt(preDate.substring(6, 8))
    if (dm1 === dm2) {
      var cnt = 0
      for (var i = dd2; i <= dd1; i++) {
        categories.push(dm1 + '月' + i + '日')
        data.push(dayInWeekOrder[cnt])
        cnt += 1
      }
    } else {
      var dl = dayInMonth[dm2 - 1]
      var cnt = 0
      for (var i = dd2; i <= dl; i++) {
        categories.push(dm2 + '月' + i + '日')
        data.push(dayInWeekOrder[cnt])
        cnt += 1
      }
      for (var i = 1; i <= dd1; i++) {
        categories.push(dm1 + '月' + i + '日')
        data.push(dayInWeekOrder[cnt])
        cnt += 1
      }
    }
    return {
      categories: categories,
      data: data
    }
  },
  makeOrderWeekScrollLine() {
    var windowWidth = 320;
    try {
      var res = wx.getSystemInfoSync();
      windowWidth = res.windowWidth;
    } catch (e) {
      console.error('getSystemInfoSync failed!');
    }
    var simulationData = that.orderWeekCreateSimulationData()
    orderWeekLineChart = new wxCharts({
      canvasId: 'orderWeekLineCanvas',
      type: 'line',
      categories: simulationData.categories,
      animation: false,
      series: [{
        name: '周订单数量',
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
  // 画月营业额曲线图: 318 - 407
  feeMonthTouchHandler: function (e) {
    feeMonthLineChart.scrollStart(e)
  },
  feeMonthMoveHandler: function (e) {
    feeMonthLineChart.scroll(e)
  },
  feeMonthTouchEndHandler: function (e) {
    feeMonthLineChart.scrollEnd(e);
    feeMonthLineChart.showToolTip(e, {
      format: function (item, category) {
        return category + ' ' + item.name + ':' + item.data
      }
    });
  },
  feeMonthCreateSimulationData: function () {
    var categories = []
    var data = []
    var dayInMonthFee = that.data.dayInMonthFee
    var dayInMonth = that.data.dayInMonth
    var now = that.data.date
    var preDate = that.getDate(30)
    var dm1 = parseInt(now.substring(4, 6))
    var dm2 = parseInt(preDate.substring(4, 6))
    var dd1 = parseInt(now.substring(6, 8))
    var dd2 = parseInt(preDate.substring(6, 8))
    if (dm1 === dm2) {
      for (var i = dd2; i <= dd1; i++) {
        categories.push(dm1 + '月' + i + '日')
        data.push(dayInMonthFee[i])
      }
    } else {
      var dl = dayInMonth[dm2 - 1]
      var cnt = 0
      for (var i = dd2; i <= dl; i++) {
        categories.push(dm2 + '月' + i + '日')
        data.push(dayInMonthFee[cnt])
        cnt += 1
      }
      for (var i = 1; i <= dd1; i++) {
        categories.push(dm1 + '月' + i + '日')
        data.push(dayInMonthFee[cnt])
        cnt += 1
      }
    }
    return {
      categories: categories,
      data: data
    }
  },
  makeFeeMonthScrollLine() {
    var windowWidth = 320;
    try {
      var res = wx.getSystemInfoSync();
      windowWidth = res.windowWidth;
    } catch (e) {
      console.error('getSystemInfoSync failed!');
    }
    var simulationData = that.feeMonthCreateSimulationData()
    feeMonthLineChart = new wxCharts({
      canvasId: 'feeMonthLineCanvas',
      type: 'line',
      categories: simulationData.categories,
      animation: false,
      series: [{
        name: '月营业额',
        data: simulationData.data,
        format: function (val, name) {
          return val.toFixed(2) + '元';
        }
      }],
      xAxis: {
        disableGrid: false
      },
      yAxis: {
        title: '金额',
        format: function (val) {
          return val.toFixed(2);
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
  // 画周营业额曲线图: 409 - 500
  feeWeekTouchHandler: function (e) {
    feeWeekLineChart.scrollStart(e)
  },
  feeWeekMoveHandler: function (e) {
    feeWeekLineChart.scroll(e)
  },
  feeWeekTouchEndHandler: function (e) {
    feeWeekLineChart.scrollEnd(e);
    feeWeekLineChart.showToolTip(e, {
      format: function (item, category) {
        return category + ' ' + item.name + ':' + item.data
      }
    });
  },
  feeWeekCreateSimulationData: function () {
    var categories = []
    var data = []
    var dayInWeekFee = that.data.dayInWeekFee
    var dayInMonth = that.data.dayInMonth
    var now = that.data.date
    var preDate = that.getDate(7)
    var dm1 = parseInt(now.substring(4, 6))
    var dm2 = parseInt(preDate.substring(4, 6))
    var dd1 = parseInt(now.substring(6, 8))
    var dd2 = parseInt(preDate.substring(6, 8))
    if (dm1 === dm2) {
      var cnt = 0
      for (var i = dd2; i <= dd1; i++) {
        categories.push(dm1 + '月' + i + '日')
        data.push(dayInWeekFee[cnt])
        cnt += 1
      }
    } else {
      var dl = dayInMonth[dm2 - 1]
      var cnt = 0
      for (var i = dd2; i <= dl; i++) {
        categories.push(dm2 + '月' + i + '日')
        data.push(dayInWeekFee[cnt])
        cnt += 1
      }
      for (var i = 1; i <= dd1; i++) {
        categories.push(dm1 + '月' + i + '日')
        data.push(dayInWeekFee[cnt])
        cnt += 1
      }
    }
    return {
      categories: categories,
      data: data
    }
  },
  makeFeeWeekScrollLine() {
    var windowWidth = 320;
    try {
      var res = wx.getSystemInfoSync();
      windowWidth = res.windowWidth;
    } catch (e) {
      console.error('getSystemInfoSync failed!');
    }
    var simulationData = that.feeWeekCreateSimulationData()
    feeWeekLineChart = new wxCharts({
      canvasId: 'feeWeekLineCanvas',
      type: 'line',
      categories: simulationData.categories,
      animation: false,
      series: [{
        name: '周营业额',
        data: simulationData.data,
        format: function (val, name) {
          return val.toFixed(2) + '元';
        }
      }],
      xAxis: {
        disableGrid: false
      },
      yAxis: {
        title: '金额',
        format: function (val) {
          return val.toFixed(2);
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
  // 画营业额柱状图
  makeFeeColumnChart() {
    var windowWidth = 320
    var maxFeeNum = that.data.monthFee
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
  // 画订单数量柱状图
  makeOrderColumnChart() {
    var windowWidth = 320
    var maxOrderNum = that.data.monthOrder
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
  // 主要计算函数
  calculate(date, orderCount, orderMoney) {
    var now = that.data.date
    var dayInMonth = that.data.dayInMonth
    var dm1 = parseInt(now.substring(4, 6)) // 月份
    var dm2 = parseInt(date.substring(4, 6))
    var dd1 = parseInt(now.substring(6, 8)) // 天数
    var dd2 = parseInt(date.substring(6, 8))
    var d = 0 // 天数差值
    if (dm1 === dm2) {
      d = dd1 - dd2
    } else {
      d = dd1 + (dayInMonth[dm2 - 1] - dd2)
    }

    var monthOrder = that.data.monthOrder
    var weekOrder = that.data.weekOrder
    var dayOrder = that.data.dayOrder
    var monthFee = that.data.monthFee
    var weekFee = that.data.weekFee
    var dayFee = that.data.dayFee
    var dayInMonthOrder = that.data.dayInMonthOrder
    var dayInWeekOrder = that.data.dayInWeekOrder
    var dayInMonthFee = that.data.dayInMonthFee
    var dayInWeekFee = that.data.dayInWeekFee

    monthOrder += orderCount
    monthFee += orderMoney
    if (d <= 6) { // 相差一周
      weekOrder += orderCount
      weekFee += orderMoney
    } else if (d === 0) { // 当天
      dayOrder += orderCount
      dayFee += orderMoney
    }

    dayInMonthOrder[30 - d] += orderCount
    dayInMonthFee[30 - d] += orderMoney
    if (d <= 6) {
      dayInWeekOrder[7 - d] += orderCount
      dayInWeekFee[7 - d] += orderMoney
    }

    that.setData({
      dayOrder,
      weekOrder,
      monthOrder,
      dayFee,
      weekFee,
      monthFee,
      dayInMonthOrder,
      dayInWeekOrder,
      dayInMonthFee,
      dayInWeekFee
    })

  },
  //返回14位字符串日期
  getStrDate(date) {
    let year = date.getFullYear()
    let month = (date.getMonth() + 1).toString().padStart(2, '0')
    let day = date.getDate().toString().padStart(2, '0')
    let hour = date.getHours().toString().padStart(2, '0')
    let min = date.getMinutes().toString().padStart(2, '0')
    let sec = date.getSeconds().toString().padStart(2, '0')
    return year + month + day + hour + min + sec
  },
  //获取 days 天前的字符串日期
  getDate(days) {
    var myDate = new Date()
    var lw = new Date(myDate - 1000 * 60 * 60 * 24 * days) //最后一个数字days代表几天前
    var date = that.getStrDate(lw)
    var startDate = date.substring(0, 8)
    return startDate
  },
  // 获取订单信息
  getOrder: async function () {
    util.showLoading('加载中')
    const cID = that.data.cID
    var preDate = that.getDate(30)
    var date = new Date()
    date = that.getStrDate(date)
    date = date.substring(0, 8)
    try {
      const _ = db.command
      var countRes = await db.collection('statistics').where({
        cID: cID, //所属餐厅
        date: _.gt(preDate)
      }).count()
      const totalOrder = countRes.total
      if (totalOrder === 0) { //如果没有任何记录
        util.hideLoading()
        that.setData({
          orders: [],
          totalOrder: totalOrder,
          date: date
        })
        return
      }
      var orderRes = await db.collection('statistics').where({
        cID: cID, //所属餐厅
        date: _.gt(preDate)
      }).get()
      util.hideLoading()
      that.setData({
        orders: orderRes.data,
        totalOrder: totalOrder,
        date: date
      })
      return
    } catch (e) {
      util.hideLoading()
      util.showToast('加载失败', 'error')
    }
  },
})
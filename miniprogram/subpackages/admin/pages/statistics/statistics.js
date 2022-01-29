const util = require('../../../../utils/util.js')
var wxCharts = require('../../../../utils/wxcharts.js')
const db = wx.cloud.database()
const app = getApp()
var that

// 交易笔数的绘图数据
var statisCountChartData = {
  column: {
    chart: undefined,
    day: 0,
    week: 0,
    month: 0
  },
  line: {
    week: {
      chart: undefined,
      date: [],
      val: []
    },
    month: {
      chart: undefined,
      date: [],
      val: []
    }
  }
}

// 交易额的绘图数据
var statisFeeChartData = {
  column: {
    chart: undefined,
    day: 0,
    week: 0,
    month: 0
  },
  line: {
    week: {
      chart: undefined,
      date: [],
      val: []
    },
    month: {
      chart: undefined,
      date: [],
      val: []
    }
  }
}
// 图像宽度
var canvaWidth = 300

Page({
  data: {
    informTypes: ['交易笔数', '交易额'],
    informCurrType: "交易笔数",
    shopPickerList: [],
    shopPickerIndex: null,
    identity: {}
  },
  onLoad: function (options) {
    that = this
    // 图像宽度计算
    try {
      var res = wx.getSystemInfoSync()
      canvaWidth = res.windowWidth - 50
    } catch (e) {
      console.error('无法获取屏幕宽度')
    }

    var canteens = app.globalData.canteens
    const identity = app.globalData.identity
    var shopPickerList = [] //餐厅名列表

    canteens.forEach((canteen, index) => {
      shopPickerList.push(canteen.name)
      // 身份所属餐厅
      if (identity.type !== 'superAdmin') {
        if (canteen.cID === identity.cID) {
          that.shopPickerChange(index)
          that.setData({
            shopPickerList,
            shopPickerIndex: index,
            identity
          })
          return
        }
      }
    })

    that.setData({
      shopPickerList,
      shopPickerIndex: 0,
      identity
    })
    that.shopPickerChange(0)
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

    that.setData({
      informCurrType: '交易笔数',
    }, () => {
      //加载对应的统计数据
      const cID = app.globalData.canteens[shopIndex].cID
      var statisMap = that.statisMapInit()
      const strPreDate = [...statisMap.keys()][0]
      that.getStatis(cID, strPreDate).then(statisList => {
        statisList.forEach(element => {
          var obj = statisMap.get(element.date)
          obj.orderCount = element.orderCount
          obj.orderMoney = element.orderMoney / 100
        })

        // 计算所有需要的数据
        that.calChartData(statisMap)

        // 绘图
        that.drawColumnChart('count')
        that.drawScrollLine('count', 'week')
        that.drawScrollLine('count', 'month')
      })
    })
  },
  // 切换交易笔数与交易额
  informTypeSelect: function (e) {
    const informCurrType = e.currentTarget.dataset.name
    if (informCurrType === '交易笔数') {
      that.drawColumnChart('count')
      that.drawScrollLine('count', 'week')
      that.drawScrollLine('count', 'month')
    } else {
      that.drawColumnChart('fee')
      that.drawScrollLine('fee', 'week')
      that.drawScrollLine('fee', 'month')
    }
    that.setData({
      informCurrType,
    })
  },
  statisMapInit: function () {
    var statisMap = new Map()
    for (let i = 29; i >= 0; i--) {
      statisMap.set(that.getStrPreDate(i), {
        orderCount: 0,
        orderMoney: 0
      })
    }
    return statisMap
  },
  //计算并保存绘图数据
  calChartData: function (statisMap) {
    var monthStatisList = [...statisMap]
    var weekStatisList = monthStatisList.slice(-7)
    var dayStatisList = monthStatisList.slice(-1)
    const allData = {
      day: dayStatisList,
      week: weekStatisList,
      month: monthStatisList
    }

    // 累加函数
    const sum = (list, type) => {
      var num = 0
      list.forEach(element => {
        num += element[1][type]
      })
      return num
    }
    // 横、纵坐标计算函数
    const get = (list, type) => {
      var out = {
        date: [],
        val: []
      }
      list.forEach(element => {
        const date = element[0]
        out.date.push(date.slice(4, 6) + '月' + date.slice(6, 8) + '日')
        out.val.push(element[1][type])
      })
      return out
    }

    ['day', 'week', 'month'].forEach(key => {
      // 计算累加数据
      statisCountChartData.column[key] = sum(allData[key], 'orderCount')
      statisFeeChartData.column[key] = sum(allData[key], 'orderMoney')
      if (key !== 'day') {
        // 填充横、纵坐标
        statisCountChartData.line[key] = get(allData[key], 'orderCount')
        statisFeeChartData.line[key] = get(allData[key], 'orderMoney')
      }
    })
  },
  // 画柱状图
  drawColumnChart(type) {
    if (type === 'count') {
      var columnData = statisCountChartData.column
      var format = function (val) {
        return val.toFixed(0) + '笔';
      }
      var yMax = Math.ceil(columnData.month * 1.2) // y坐标长度
    } else {
      var columnData = statisFeeChartData.column
      var format = function (val) {
        return val.toFixed(2) + '元';
      }
      var yMax = Math.ceil(columnData.month * 1.2) // y坐标长度
    }

    const yList = [columnData.day, columnData.week, columnData.month] //纵坐标

    columnData.chart = new wxCharts({
      canvasId: type + 'ColumnCanvas',
      type: 'column',
      animation: true,
      categories: ['当天', '近7天', '近30天'],
      series: [{
        name: type === 'count' ? '交易笔数' : '交易额',
        data: yList,
        format: format
      }],
      yAxis: {
        title: type === 'count' ? '交易笔数/笔' : '交易额/元',
        format: format,
        min: 0,
        max: yMax
      },
      xAxis: {
        disableGrid: false,
        type: 'calibration'
      },
      extra: {
        column: {
          width: 25
        }
      },
      width: canvaWidth,
      height: 200,
    })
  },

  // 画折线图
  drawScrollLine(type, dateType) {
    if (type === 'count') {
      var lineData = statisCountChartData.line[dateType]
      var format = function (val) {
        return val.toFixed(0) + '笔';
      }
    } else {
      var lineData = statisFeeChartData.line[dateType]
      var format = function (val) {
        return val.toFixed(2) + '元';
      }
    }

    lineData.chart = new wxCharts({
      canvasId: type + dateType[0].toUpperCase() + dateType.substr(1) + 'LineCanvas',
      type: 'line',
      categories: lineData.date,
      animation: false,
      series: [{
        name: (dateType === 'week' ? '近7天' : '近30天') + (type === 'count' ? '交易笔数' : '交易额'),
        data: lineData.val,
        format
      }],
      xAxis: {
        disableGrid: false
      },
      yAxis: {
        title: type === 'count' ? '交易笔数/笔' : '交易额/元',
        format,
        min: 0
      },
      width: canvaWidth,
      height: 200,
      dataLabel: true,
      dataPointShape: true,
      enableScroll: true,
      extra: {
        lineStyle: 'curve'
      }
    });
  },

  //返回14位字符串日期
  getStrDateNotime(date) {
    let year = date.getFullYear()
    let month = (date.getMonth() + 1).toString().padStart(2, '0')
    let day = date.getDate().toString().padStart(2, '0')
    return year + month + day
  },
  //获取 days 天前的字符串日期
  getStrPreDate(days) {
    var preDate = new Date(new Date() - 1000 * 60 * 60 * 24 * days) //最后一个数字days代表几天前
    return that.getStrDateNotime(preDate)
  },
  // 获取统计信息
  getStatis: function (cID, strPreDate) {
    return new Promise(async (resolve, reject) => {
      util.showLoading('加载中')
      try {
        const _ = db.command
        var countRes = await db.collection('statistics').where({
          cID,
          date: _.gte(strPreDate)
        }).count()
        const totalCount = countRes.total

        if (totalCount === 0) { //如果没有任何记录
          util.hideLoading()
          resolve([])
          return
        }

        var proList = []
        proList.push(
          db.collection('statistics').where({
            cID,
            date: _.gte(strPreDate)
          }).limit(20).get()
        )

        if (totalCount > 20) { //超过20则再获取一次
          db.collection('statistics').where({
            cID,
            date: _.gte(strPreDate)
          }).skip(20).limit(10).get()
        }

        Promise.all(proList).then(statisRes => {
          var statisList = []
          statisRes.forEach(res => {
            statisList.push(...res.data)
          })
          util.hideLoading()
          resolve(statisList)
          return
        })
      } catch {
        util.hideLoading()
        util.showToast('加载失败', 'error')
        return []
      }
    })
  },


  // -------------拖动折线图触发函数-------------
  countMonthTouchHandler: function (e) {
    statisCountChartData.line.month.chart.scrollStart(e)
  },
  countMonthMoveHandler: function (e) {
    statisCountChartData.line.month.chart.scroll(e)
  },
  countMonthTouchEndHandler: function (e) {
    statisCountChartData.line.month.chart.scrollEnd(e);
    statisCountChartData.line.month.chart.showToolTip(e, {
      format: function (item, category) {
        return category + ' ' + item.name + ':' + item.data
      }
    });
  },
  countWeekTouchHandler: function (e) {
    statisCountChartData.line.week.chart.scrollStart(e)
  },
  countWeekMoveHandler: function (e) {
    statisCountChartData.line.week.chart.scroll(e)
  },
  countWeekTouchEndHandler: function (e) {
    statisCountChartData.line.week.chart.scrollEnd(e);
    statisCountChartData.line.week.chart.showToolTip(e, {
      format: function (item, category) {
        return category + ' ' + item.name + ':' + item.data
      }
    });
  },
  feeMonthTouchHandler: function (e) {
    statisFeeChartData.line.month.chart.scrollStart(e)
  },
  feeMonthMoveHandler: function (e) {
    statisFeeChartData.line.month.chart.scroll(e)
  },
  feeMonthTouchEndHandler: function (e) {
    statisFeeChartData.line.month.chart.scrollEnd(e);
    statisFeeChartData.line.month.chart.showToolTip(e, {
      format: function (item, category) {
        return category + ' ' + item.name + ':' + item.data
      }
    });
  },
  feeWeekTouchHandler: function (e) {
    statisFeeChartData.line.week.chart.scrollStart(e)
  },
  feeWeekMoveHandler: function (e) {
    statisFeeChartData.line.week.chart.scroll(e)
  },
  feeWeekTouchEndHandler: function (e) {
    statisFeeChartData.line.week.chart.scrollEnd(e);
    statisFeeChartData.line.week.chart.showToolTip(e, {
      format: function (item, category) {
        return category + ' ' + item.name + ':' + item.data
      }
    });
  },
})
const util = require('../../../../utils/util.js')
const app = getApp()
const db = wx.cloud.database()

var that

Page({
  data: {
    identity: {},
    canteens: [],
    shopPickerList: [],
    foodTypePickerList: [],
    shopPickerIndex: null,
    foodTypePickerIndex: null,
    intCurTime: 0,
    currPage: 0,
    totalPage: 1
  },

  onLoad: function (option) {
    that = this
    var canteens = app.globalData.canteens
    const identity = app.globalData.identity
    var shopPickerList = []
    var intCurTime = getIntCurTime() //当前时间

    //setData数据对象
    var formData = {
      intCurTime,
      shopPickerList,
      identity
    }

    canteens.forEach((canteen, index) => {
      shopPickerList.push(canteen.name)
      // 身份所属餐厅
      if (identity.type !== 'superAdmin') {
        if (canteen.cID === identity.cID) {
          that.shopPickerChange(index)
        }
      }

      //canteens 是否营业中
      for (let i = 0; i < canteen.businessTime.length; i++) {
        const time = canteen.businessTime[i];
        if (intCurTime > parseInt(time[0]) && intCurTime < parseInt(time[1])) {
          canteen.inBusiness = true
        } else {
          canteen.inBusiness = false
        }
      }
    })
    formData.canteens = canteens
    that.setData(formData)
  },
  refresh: function () {
    const shopPickerIndex = that.data.shopPickerIndex
    const foodTypePickerIndex = that.data.foodTypePickerIndex
    if (shopPickerIndex === null || foodTypePickerIndex === null) {
      return
    }
    const cID = that.data.canteens[shopPickerIndex].cID
    const typeName = that.data.foodTypePickerList[foodTypePickerIndex]
    const currPage = that.data.currPage
    that.loadPage(shopPickerIndex, foodTypePickerIndex, cID, typeName, currPage)
  },
  shopPickerChange: function (e) {
    //若选择项不变
    if (typeof (e) === "number") {
      var index = e
    } else {
      if (that.data.shopPickerIndex === e.detail.value) {
        return
      }
      var index = e.detail.value
    }

    var foodList = app.globalData.canteens[index].foodList
    var foodTypePickerList = []
    foodList.forEach(element => {
      foodTypePickerList.push(element.name)
    })

    that.setData({
      shopPickerIndex: index,
      foodTypePickerIndex: null,
      foodTypePickerList: foodTypePickerList
    })
  },
  foodTypePickerChange: function (e) {
    //选择项不变
    if (that.data.foodTypePickerIndex === e.detail.value) {
      return
    }
    const shopPickerIndex = that.data.shopPickerIndex
    const foodTypePickerIndex = e.detail.value
    const cID = that.data.canteens[shopPickerIndex].cID
    const typeName = that.data.foodTypePickerList[foodTypePickerIndex]

    //加载第一页的
    that.loadPage(shopPickerIndex, foodTypePickerIndex, cID, typeName, 1)
  },
  foodTypePageChange: (shopIndex, foodTypeIndex, food, currPage, totalPage) => {
    let path = 'canteens[' + shopIndex + '].foodList[' + foodTypeIndex + '].food'
    app.globalData.canteens[shopIndex].foodList[foodTypeIndex].food = food
    that.setData({
      currPage: currPage,
      totalPage: totalPage,
      [path]: food
    })
  },
  loadPage: (shopPickerIndex, foodTypePickerIndex, cID, typeName, currPage = 1, pageSize = 5) => {
    util.showLoading('加载中')
    wx.cloud.callFunction({
        name: 'getCanteenFoodByType',
        data: {
          cID: cID,
          typeName: typeName,
          currPage: currPage,
          pageSize: pageSize
        }
      }).then(res => {
        wx.hideLoading()
        if (res.result.success) {
          let currPage = res.result.currPage
          let totalPage = res.result.totalPage
          let food = res.result.food
          //修改当前页数据和当前canteens显示的食物列表
          that.foodTypePageChange(shopPickerIndex, foodTypePickerIndex, food, currPage, totalPage)
          //保存page信息和类型选项
          that.setData({
            currPage: currPage,
            totalPage: totalPage,
            foodTypePickerIndex: foodTypePickerIndex
          })
          return
        } else {
          util.showToast('加载失败', 'error')
          return
        }
      })
      .catch(e => {
        wx.hideLoading()
        util.showToast('加载失败', 'error')
        console.error(e)
      })
  },
  changePage: function (e) {
    const dataset = e.currentTarget.dataset
    var currPage = that.data.currPage
    var totalPage = that.data.totalPage
    var shopPickerIndex = that.data.shopPickerIndex
    var foodTypePickerIndex = that.data.foodTypePickerIndex
    var typeName = that.data.foodTypePickerList[foodTypePickerIndex]
    const cID = that.data.canteens[shopPickerIndex].cID

    if ('add' in dataset) { //增加
      if (currPage <= totalPage - 1) {
        that.loadPage(shopPickerIndex, foodTypePickerIndex, cID, typeName, currPage + 1)
      } else {
        util.showToast('已经是最后一页啦')
      }
    } else { //减少
      if (currPage > 1) {
        that.loadPage(shopPickerIndex, foodTypePickerIndex, cID, typeName, currPage - 1)
      } else {
        util.showToast('已经是第一页啦')
      }
    }
  },
  toAddGoods: function (e) {
    var url = './addGoods'
    const foodTypePickerIndex = that.data.foodTypePickerIndex
    if (that.data.foodTypePickerIndex !== null) {
      const shopPickerIndex = that.data.shopPickerIndex
      url = url + '?shopPickerIndex=' + shopPickerIndex + '&foodTypePickerIndex=' + foodTypePickerIndex
    }
    wx.navigateTo({
      url,
      events: {
        refresh: function () {
          that.refresh()
        }
      }
    })
  },
  editGoods: function (e) {
    var index0 = that.data.shopPickerIndex
    var index1 = that.data.foodTypePickerIndex
    var index2 = e.currentTarget.dataset.index
    wx.navigateTo({
      url: './editGoods?index0=' + index0 + '&index1=' + index1 + '&index2=' + index2,
      events: {
        refresh: function () {
          that.refresh()
        }
      }
    })
  },
  delGoods: function (e) {
    var index0 = that.data.shopPickerIndex
    var index1 = that.data.foodTypePickerIndex
    var index2 = e.currentTarget.dataset.index

    //营业期间禁止删除商品（避免点餐页刷新时商品排序错乱）
    if (!that.data.canteens[index0].inBusiness) {
      var food = that.data.canteens[index0].foodList[index1].food[index2]
      wx.showModal({
        title: '是否要删除商品？',
        content: '删除商品：' + food.name,
        success(res) {
          if (res.confirm) {
            //云函数数据库更新 pull
            util.showLoading('正在删除商品')
            let _id = food._id
            wx.cloud.callFunction({
                name: 'dbMove',
                data: {
                  table: 'food',
                  _id: _id
                }
              })
              .then(res => {
                if (res.result.success) {
                  //云函数删除云储存文件
                  var fileIDs = food.detailImgs
                  fileIDs.push(food.coverImg)
                  wx.cloud.callFunction({
                      name: 'cloudFilesDelete',
                      data: {
                        fileIDs
                      }
                    })
                    .then(res => {
                      setTimeout(() => {
                        that.refresh()
                      }, 1100)
                    })
                } else {
                  util.hideLoading()
                  util.showToast('删除失败', 'error', 2000)
                }
              })
              .catch(error => {
                util.hideLoading()
                util.showToast('删除失败', 'error', 2000)
              })
          } else if (res.cancel) {
            util.showToast('操作已取消')
          }
        }
      })
    } else {
      util.showToast('营业期间不允许删除商品')
    }

  },
  getCurrCanteenFoodTypes: () => {
    let shopPickerIndex = that.data.shopPickerIndex
    let _id = that.data.canteens[shopPickerIndex]._id
    db.collection('canteen').doc(_id).get()
      .then(res => {
        let canteen = res.data
        var foodTypePickerList = []
        canteen.foodList.forEach(element => {
          foodTypePickerList.push(element.name)
        })

        let path = 'canteens[' + shopPickerIndex + '].foodList'
        app.globalData.canteens[shopPickerIndex].foodList = canteen.foodList
        that.setData({
          foodTypePickerIndex: null,
          foodTypePickerList: foodTypePickerList,
          [path]: canteen.foodList
        })
      })
  }
})

function getIntCurTime() {
  var date = new Date()
  var h = date.getHours().toString().padStart(2, '0')
  var m = date.getMinutes().toString().padStart(2, '0')
  return parseInt(h + m)
}
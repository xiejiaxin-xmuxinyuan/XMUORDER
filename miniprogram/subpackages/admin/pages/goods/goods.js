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
    totalPage: 1,
    loaded: false
  },

  onLoad: function (option) {
    that = this

    var canteens = app.globalData.canteen
    const identity = app.globalData.identity
    var shopPickerList = []
    var intCurTime = getIntCurTime() //当前时间

    canteens.forEach((canteen, index) => {
      shopPickerList.push(canteen.name)
      // 身份所属餐厅
      if (identity.type === 'admin' || identity.type === 'member') {
        if (canteen.cID === identity.cID) {
          that.shopPickerChange(null, index)
        }
      }
      //canteens 营业时间计算
      let breakfast = canteen.breakfast
      let beginTime = breakfast.substring(0, breakfast.indexOf('-'))
      let intBeginTime = parseInt(beginTime.replace(':', ''))

      let dinner = canteen.dinner
      let endTime = dinner.substring(dinner.indexOf('-') + 1)
      let intEndTime = parseInt(endTime.replace(':', ''))

      canteens[index].beginTime = beginTime
      canteens[index].intBeginTime = intBeginTime
      canteens[index].endTime = endTime
      canteens[index].intEndTime = intEndTime
    })

    that.setData({
      canteens: canteens,
      shopPickerList: shopPickerList,
      identity: identity,
      intCurTime: intCurTime, //当前int格式时间
    })
  },

  onShow: function (options) {
    that = this
    if (that.data.loaded) {
      const shopPickerIndex = that.data.shopPickerIndex
      const foodTypePickerIndex = that.data.foodTypePickerIndex
      if (shopPickerIndex === null || foodTypePickerIndex === null) {
        return
      }
      const cID = that.data.canteens[shopPickerIndex].cID
      const typeName = that.data.foodTypePickerList[foodTypePickerIndex]
      const currPage = that.data.currPage
      that.loadPage(shopPickerIndex, foodTypePickerIndex, cID, typeName, currPage)
    }
  },
  shopPickerChange: function (e, setIndex = -1) {
    //若选择项不变
    if (that.data.shopPickerIndex === e.detail.value) {
      return
    }

    if (setIndex >= 0) {
      var index = setIndex
    } else {
      var index = e.detail.value
    }

    var foodList = app.globalData.canteen[index].foodList
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
    // 可以接.then().catch()
  },
  foodTypePageChange: (shopIndex, foodTypeIndex, food, currPage, totalPage) => {
    let path = 'canteens[' + shopIndex + '].foodList[' + foodTypeIndex + '].food'
    app.globalData.canteen[shopIndex].foodList[foodTypeIndex].food = food
    that.setData({
      currPage: currPage,
      totalPage: totalPage,
      [path]: food,
      loaded: true
    })
  },
  loadPage: (shopPickerIndex, foodTypePickerIndex, cID, typeName, currPage = 1, pageSize = 5) => {
    return new Promise((resolve, reject) => {
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
          util.hideLoading()
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
            resolve() //结束
          } else {
            util.showToast('加载失败', 'error')
            reject() //结束
          }
        })
        .catch(e => {
          util.hideLoading()
          util.showToast('加载失败', 'error')
          reject(e) //结束
        })
    })
  },
  changePage: function (e) {
    const dataset = e.currentTarget.dataset
    let currPage = that.data.currPage
    let totalPage = that.data.totalPage
    let shopPickerIndex = that.data.shopPickerIndex
    let foodTypePickerIndex = that.data.foodTypePickerIndex
    let typeName = that.data.foodTypePickerList[foodTypePickerIndex]
    let cID = that.data.canteens[shopPickerIndex].cID

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
    wx.navigateTo({
      url: './addGoods',
    })
  },
  editGoods: function (e) {
    var index0 = that.data.shopPickerIndex
    var index1 = that.data.foodTypePickerIndex
    var index2 = e.currentTarget.dataset.index
    wx.navigateTo({
      url: './editGoods?index0=' + index0 + '&index1=' + index1 + '&index2=' + index2
    })
  },
  delGoods: function (e) {
    var index0 = that.data.shopPickerIndex
    var index1 = that.data.foodTypePickerIndex
    var index2 = e.currentTarget.dataset.index

    //营业期间禁止删除商品（避免点餐页刷新时商品排序错乱）
    let intCurTime = that.data.intCurTime
    let intBeginTime = that.data.canteens[index0].intBeginTime
    let intEndTime = that.data.canteens[index0].intEndTime

    if (intCurTime < intBeginTime || intCurTime > intEndTime) {
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
                  wx.cloud.callFunction({
                      name: 'cloudFilesDelete',
                      data: {
                        fileIDs: [food.img]
                      }
                    })
                    .then(res => {
                      util.hideLoading()
                      if (!(res.result[0].status)) {
                        util.showToast('删除成功', 'success', 1000)
                      } else {
                        util.showToast('图片删除出错')
                      }
                      //刷新
                      setTimeout(() => {
                        that.onShow()
                      }, 1100)
                    })
                } else {
                  util.hideLoading()
                  util.showToast('数据提交失败', 'error', 2000)
                }
              })
              .catch(error => {
                util.hideLoading()
                util.showToast('数据提交失败', 'error', 2000)
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
  addGoodsType: function (e) {
    let shopPickerIndex = that.data.shopPickerIndex
    if (shopPickerIndex === null) {
      util.showToast('请先选择商店')
      return
    }
    wx.showModal({
      title: that.data.shopPickerList[shopPickerIndex] + ': 添加商品类别',
      confirmText: '添加',
      editable: true,
      placeholderText: '输入新商品类别名称',
      success(res) {
        if (res.confirm) {
          let newTypeName = res.content
          let foodTypePickerList = that.data.foodTypePickerList
          if (foodTypePickerList.indexOf(newTypeName) >= 0) {
            util.showToast('商品类别名称重复')
          } else {
            util.showLoading('上传中')
            let _id = that.data.canteens[shopPickerIndex]._id
            wx.cloud.callFunction({
                name: 'dbUpdate',
                data: {
                  table: 'canteen',
                  _id: _id,
                  path: 'foodList',
                  formData: {
                    name: newTypeName
                  },
                  push: true
                }
              })
              .then(res => {
                util.hideLoading()
                if (res.result.success) {
                  util.showToast('新增成功', 'success', 1500)
                  that.getCurrCanteenFoodTypes()
                } else {
                  util.showToast('数据提交失败', 'error', 1500)
                }
              })
              .catch(e => {
                util.hideLoading()
              })
          }
        } else if (res.cancel) {
          util.showToast('操作已取消')
        }
      }
    })
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
        app.globalData.canteen[shopPickerIndex].foodList = canteen.foodList
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
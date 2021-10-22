// subpackages/admin/pages/goods/goods.js
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
  },

  onShow: function (options) {
    that = this
    that.canteenRefrush()
  },
  canteenRefrush: () => {
    wx.showLoading({
      title: '获取餐厅信息',
    })
    var canteensPromise = []
    var len = app.globalData.canteen.length
    for (let i = 0; i < len; i++) {
      canteensPromise.push(
        wx.cloud.callFunction({
          name: 'getCanteen',
          data: {
            cID: app.globalData.canteen[i].cID
          }
        })
      )
    }
    var canteens = app.globalData.canteen
    Promise.all(canteensPromise)
      .then((res) => {
        wx.hideLoading()
        res.forEach((element, index) => {
          if (element.result.success) {
            canteens[index] = element.result.canteen
          }
        })

        var shopPickerList = []
        const identity = app.globalData.identity

        //当前时间
        var intCurTime = getIntCurTime()

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
        app.globalData.canteens = canteens //同步到全局变量
        that.setData({
          canteens: canteens,
          shopPickerList: shopPickerList,
          identity: identity,
          intCurTime: intCurTime, //当前int格式时间
        })
      })
      .catch(err => {
        wx.hideLoading()
        wx.showToast({
          title: '获取失败',
          icon: 'error',
          duration: 1500
        })
      })
  },
  shopPickerChange: function (e, setIndex = -1) {
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
    that.setData({
      foodTypePickerIndex: e.detail.value
    })
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
            wx.showLoading({
              title: '正在删除商品',
              mask: true
            })
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
                      wx.hideLoading()
                      if (!(res.result[0].status)) {
                        wx.showToast({
                          title: '删除成功',
                          icon: 'success',
                          duration: 1000
                        })
                      } else {
                        wx.showToast({
                          title: '图片删除出错',
                          icon: 'none',
                          duration: 1000
                        })
                      }
                      //刷新商品页
                      setTimeout(() => {
                        that.canteenRefrush()
                      }, 1100)
                    })
                } else {
                  wx.hideLoading()
                  wx.showToast({
                    title: '数据提交失败',
                    icon: 'error',
                    duration: 2000
                  })
                }
              })
              .catch(error => {
                wx.hideLoading()
                wx.showToast({
                  title: '数据提交失败',
                  icon: 'error',
                  duration: 2000
                })
              })
          } else if (res.cancel) {
            wx.showToast({
              title: '操作已取消',
              icon: 'none',
              duration: 1000
            })
          }
        }
      })
    } else {
      wx.showToast({
        title: '营业期间不允许删除商品',
        icon: 'none',
        duration: 1500
      })
    }

  }
})

function getIntCurTime() {
  var date = new Date()
  var h = date.getHours().toString().padStart(2, '0')
  var m = date.getMinutes().toString().padStart(2, '0')
  return parseInt(h + m)
}
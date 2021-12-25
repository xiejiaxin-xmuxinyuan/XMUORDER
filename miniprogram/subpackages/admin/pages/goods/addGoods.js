import WxValidate from '../../../../utils/WxValidate.js'
const util = require('../../../../utils/util.js')
const app = getApp()
const db = wx.cloud.database()
var that

Page({

  data: {
    canteens: [],
    shopPickerList: [],
    foodTypePickerList: [],
    identity: {},
    form: {
      shopPickerIndex: null,
      foodTypePickerIndex: null,
      coverImg: '',
      detailImgs: [],
      name: '',
      content: '',
      price: '',
      allNum: '',
      tag: ''
    }
  },

  onLoad: function (options) {
    that = this
    that.initValidate()

    var canteens = app.globalData.canteens
    var shopPickerList = []
    const identity = app.globalData.identity

    canteens.forEach((canteen, index) => {
      shopPickerList.push(canteen.name)
      if (identity.type !== 'superAdmin' && canteen.cID === identity.cID && !('foodTypePickerIndex' in options)) {
        that.shopPickerChange(index)
      }
    })

    //构建formData对象
    var formData = {
      canteens,
      shopPickerList,
      identity
    }

    //根据传参值选择商品类别
    if ('foodTypePickerIndex' in options) {
      const foodList = app.globalData.canteens[options.shopPickerIndex].foodList
      var foodTypePickerList = []
      foodList.forEach(element => {
        foodTypePickerList.push(element.name)
      })
      formData.foodTypePickerList = foodTypePickerList
      formData['form.shopPickerIndex'] = options.shopPickerIndex
      formData['form.foodTypePickerIndex'] = options.foodTypePickerIndex
    }

    that.setData(formData)
  },
  shopPickerChange: function (e) {
    //触发或调用
    var index = 'detail' in e ? e.detail.value : e

    var foodList = app.globalData.canteens[index].foodList
    var foodTypePickerList = []
    foodList.forEach(element => {
      foodTypePickerList.push(element.name)
    })

    that.setData({
      'form.shopPickerIndex': index,
      'form.foodTypePickerIndex': null,
      foodTypePickerList: foodTypePickerList
    })
  },
  foodTypePickerChange: function (e) {
    that.setData({
      'form.foodTypePickerIndex': e.detail.value
    })
  },
  onPriceInputBlur: function (e) {
    var oldPrice = that.data.form.price
    var price = parseFloat(e.detail.value)
    if (isNaN(price) || price <= 0) {
      that.setData({
        'form.price': oldPrice
      })
    } else {
      price = parseFloat(price.toFixed(2)) //至多2位小数
      that.setData({
        'form.price': price
      })
    }
  },
  chooseCoverImage: function (e) {
    wx.chooseImage({
        count: 1,
        sizeType: ['compressed']
      })
      .then(res => {
        var url = '../../../../pages/index/cropper?src=' + res.tempFilePaths[0]
        url += '&w=300&h=300'
        wx.navigateTo({
          url: url,
          events: {
            saveImg: function (data) {
              that.setData({
                'form.coverImg': data.img,
              })
            }
          }
        })
      })
      .catch(e => {
        util.showToast('图片选择取消')
      })
  },
  chooseImages: function (e) {
    var detailImgs = that.data.form.detailImgs
    wx.chooseImage({
        count: 1,
        sizeType: ['compressed']
      })
      .then(res => {
        var url = '../../../../pages/index/cropper?src=' + res.tempFilePaths[0]
        url += '&w=600&h=325'
        wx.navigateTo({
          url: url,
          events: { //回调
            saveImg: function (data) {
              if (detailImgs.length != 0) {
                detailImgs.push(data.img)
              } else {
                detailImgs = [data.img]
              }
              that.setData({
                'form.detailImgs': detailImgs,
              })
            }
          }
        })
      })
      .catch(err => {
        util.showToast('图片选择取消')
      })
  },
  viewImage: function (e) {
    var img
    if ('index' in e.currentTarget.dataset) {
      img = that.data.form.detailImgs[e.currentTarget.dataset.index]
    } else {
      img = that.data.form.coverImg
    }
    wx.previewImage({
      urls: [img],
    });
  },
  delImg: function (e) {
    wx.showModal({
      title: '移除图片',
      content: '确定要移除这张图片吗',
      cancelText: '否',
      confirmText: '是',
      success: res => {
        if (res.confirm) {
          var form = that.data.form
          if ('index' in e.currentTarget.dataset) {
            const index = e.currentTarget.dataset.index
            form.detailImgs.splice(index, 1)
            that.setData({
              'form.detailImgs': form.detailImgs,
            })
          } else {
            that.setData({
              'form.coverImg': '',
            })
          }
        }
      }
    })
  },
  getRandomPath: (params, img) => { //储存路径：餐厅图片/地区名/餐厅名/food/商品类型名_商品名_时间戳.图片格式
    const canteens = that.data.canteens
    const shopPickerList = that.data.shopPickerList
    const foodTypePickerList = that.data.foodTypePickerList

    const addressToPlaceName = {
      XA: '翔安',
      SM: '思明',
      HY: '海韵'
    }
    const placeName = addressToPlaceName[canteens[params.shopPickerIndex].address]
    const shopName = shopPickerList[params.shopPickerIndex]
    const typeName = foodTypePickerList[params.foodTypePickerIndex]
    const foodName = params.name
    const randomStr = (new Date().getTime()).toString() + Math.random().toString(36).slice(-4)

    var path = '餐厅图片/' + placeName + '/' + shopName + '/商品/'
    path += typeName + '_' + foodName + '_' + randomStr + img.match('.[^.]+?$')[0]
    return path
  },
  addGoodsSubmit: function (e) {
    //表单验证
    var form = that.data.form
    const params = Object.assign(form, e.detail.value)
    if (!that.WxValidate.checkForm(params)) {
      const error = that.WxValidate.errorList[0]
      util.showToast(error.msg)
    } else {
      //上传图片
      util.showLoading('图片上传中')
      var proList = []

      //封面
      proList.push(
        wx.cloud.uploadFile({
          cloudPath: that.getRandomPath(params, params.coverImg),
          filePath: params.coverImg
        })
      )

      //详情图片
      params.detailImgs.forEach(img => {
        proList.push(
          wx.cloud.uploadFile({
            cloudPath: that.getRandomPath(params, img),
            filePath: img
          })
        )
      })

      const cID = that.data.canteens[params.shopPickerIndex].cID
      const typeName = that.data.foodTypePickerList[params.foodTypePickerIndex]
      Promise.all(proList).then(res => {
          const coverImg = res[0].fileID
          var detailImgs = []
          for (let i = 1; i < res.length; i++) {
            detailImgs.push(res[i].fileID)
          }
          //上传数据库 food
          var newForm = {
            allNum: parseInt(params.allNum),
            curNum: parseInt(params.allNum),
            cID,
            coverImg,
            detailImgs,
            typeName,
            content: params.content,
            name: params.name,
            price: params.price,
            tag: params.tag
          }
          db.collection('food').add({
              data: newForm
            }).then(res => {
              wx.hideLoading()
              util.showToast('提交成功', 'success', 1500)
              // 返回上一页
              setTimeout(() => {
                const eventChannel = that.getOpenerEventChannel()
                eventChannel.emit('refresh')
                wx.navigateBack()
              }, 1500);
            })
            .catch(e => {
              wx.hideLoading()
              console.error(e)
              util.showToast('上传失败', 'error', 2000)
            })
        })
        .catch(e => {
          wx.hideLoading()
          console.error(e)
          util.showToast('图片上传失败', 'error', 2000)
        })
    }
  },
  initValidate() { //表单验证规则和提示语
    const rules = {
      shopPickerIndex: {
        required: true,
        digits: true
      },
      foodTypePickerIndex: {
        required: true,
        digits: true
      },
      name: {
        required: true
      },
      content: {
        required: true
      },
      price: {
        required: true,
        number: true
      },
      allNum: {
        required: true,
        digits: true
      },
      coverImg: {
        required: true
      },
      detailImgs: {
        required: true
      },
      tag: {
        maxlength: 4
      }
    }

    const messages = {
      shopPickerIndex: {
        required: '请选择所在商店',
        digits: '请选择所在商店'
      },
      foodTypePickerIndex: {
        required: '请选择商品类型',
        digits: '请选择商品类型'
      },
      name: {
        required: '请输入商品名'
      },
      content: {
        required: '请输入商品内容'
      },
      price: {
        required: '请输入价格',
        number: '请输入正确格式的价格'
      },
      allNum: {
        required: '请输入库存',
        digits: '请输入非负整数的库存'
      },
      coverImg: {
        required: '请添加商品封面图片'
      },
      detailImgs: {
        required: '请添加商品详情图片'
      },
      tag: {
        maxlength: '标签最长4个字符'
      }
    }
    that.WxValidate = new WxValidate(rules, messages)
  }
})
import WxValidate from '../../../../utils/WxValidate.js'

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
      foodImg: '',
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
    var canteens = app.globalData.canteen
    var shopPickerList = []
    const identity = app.globalData.identity

    canteens.forEach((canteen, index) => {
      shopPickerList.push(canteen.name)
      if (identity.type === 'admin' || identity.type === 'member') {
        if (canteen.cID === identity.cID) {
          that.shopPickerChange(null, index)
        }
      }
    })

    that.setData({
      canteens: canteens,
      shopPickerList: shopPickerList,
      identity: identity
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
      ['form.shopPickerIndex']: index,
      ['form.foodTypePickerIndex']: null,
      foodTypePickerList: foodTypePickerList
    })
  },
  foodTypePickerChange: function (e) {
    that.setData({
      ['form.foodTypePickerIndex']: e.detail.value
    })
  },
  onPriceInputBlur: function (e) {
    var oldPrice = that.data.form.price
    var price = parseFloat(e.detail.value)
    if (isNaN(price) || price <= 0) {
      that.setData({
        ['form.price']: oldPrice
      })
    } else {
      price = parseFloat(price.toFixed(2)) //至多2位小数
      that.setData({
        ['form.price']: price
      })
    }
  },
  ChooseImage: function (e) {
    wx.chooseImage({
        count: 1, //默认9
        sizeType: 'compressed'
      })
      .then(res => {
        // TODO: 使用canvas进行压缩
        that.setData({
          ['form.foodImg']: res.tempFilePaths[0]
        })
      })
      .catch(res => {
        wx.showToast({
          title: '图片选择取消',
          icon: 'none',
          duration: 1000
        })
      })
  },
  ViewImage: function (e) {
    wx.previewImage({
      urls: [that.data.form.foodImg],
    });
  },
  DelImg: function (e) {
    wx.showModal({
      title: '移除图片',
      content: '确定要移除这张图片吗',
      cancelText: '否',
      confirmText: '是',
      success: res => {
        if (res.confirm) {
          that.setData({
            ['form.foodImg']: ''
          })
        }
      }
    })
  },
  addGoodsSubmit: function (e) {
    //表单验证
    let form = that.data.form
    const params = Object.assign(form, e.detail.value)
    if (!that.WxValidate.checkForm(params)) {
      const error = that.WxValidate.errorList[0]
      wx.showToast({
        title: error.msg,
        icon: 'none',
        duration: 1000
      })
    } else {
      wx.showLoading({
        title: '上传中',
        mask: true
      })
      //上传图片
      let canteens = that.data.canteens
      let shopPickerList = that.data.shopPickerList
      let foodTypePickerList = that.data.foodTypePickerList

      let cloudPath = '餐厅图片/'
      let address = canteens[params.shopPickerIndex].address
      let shopName = shopPickerList[params.shopPickerIndex]
      let typeName = foodTypePickerList[params.foodTypePickerIndex]

      //储存路径：餐厅图片/地区名/餐厅名/food/商品类型名_商品名_时间戳.图片格式
      cloudPath = cloudPath + ({
          XA: '翔安',
          SM: '思明',
          HY: '海韵'
        })[address] + '/' + shopName + '/food/' + typeName + '_' + params.name + '_' +
        new Date().getTime() + params.foodImg.match('.[^.]+?$')[0]

      wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: params.foodImg, // 文件路径
        }).then(res => {
          //上传数据库 food
          var newForm = {
            allNum: params.allNum,
            curNum: params.allNum,
            cID: canteens[params.shopPickerIndex].cID,
            content: params.content,
            img: res.fileID,
            name: params.name,
            price: params.price,
            typeName: typeName,
            tag: params.tag
          }
          db.collection('food').add({
              data: newForm
            }).then(res => {
              wx.hideLoading()
              wx.showToast({
                title: '提交成功',
                icon: 'success',
                duration: 1500
              })
              //返回上一页
              setTimeout(() => {
                wx.navigateBack()
              }, 1600);
            })
            .catch(error => {
              wx.hideLoading()
              wx.showToast({
                title: '数据提交失败',
                icon: 'error',
                duration: 2000
              })
            })
        })
        .catch(error => {
          wx.hideLoading()
          wx.showToast({
            title: '数据提交失败',
            icon: 'error',
            duration: 2000
          })
        })
        .catch(error => {
          wx.hideLoading()
          wx.showToast({
            title: '图片上传失败',
            icon: 'error',
            duration: 2000
          })
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
      foodImg: {
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
        number: '请输入正确价格'
      },
      allNum: {
        required: '请输入库存',
        digits: '请输入非负整数'
      },
      foodImg: {
        required: '请添加商品图片'
      },
      tag: {
        maxlength: '标签最长4个字符'
      }
    }
    this.WxValidate = new WxValidate(rules, messages)
  }
})
// subpackages/admin/pages/goods/addGood.js
import WxValidate from '../../../../utils/WxValidate.js'

const app = getApp()
const db = wx.cloud.database()
var that

Page({

  data: {
    canteens: [],
    shopPickerList: [],
    foodTypePickerList: ['请先选择所在商店'],
    form: {
      shopPickerIndex: null,
      foodTypePickerIndex: null,
      foodImg: '',
      name: '',
      content: '',
      price: ''
    }
  },

  onLoad: function (options) {
    that = this
    that.initValidate()
    var canteens = app.globalData.canteen
    var shopPickerList = []
    for (const key in canteens) {
      let canteen = canteens[key];
      shopPickerList.push(canteen.name)
    }
    that.setData({
      canteens: canteens,
      shopPickerList: shopPickerList
    })
  },
  shopPickerChange: function (e) {
    var index = e.detail.value
    var foodList = that.data.canteens[index].foodList
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
      sizeType: 'compressed', //压缩图
      success: (res) => {
        that.setData({
          ['form.foodImg']: res.tempFilePaths[0]
        })
      }
    });
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
      console.log(params)
      //上传图片

      //上传数据库 food 和 canteen
    }

  },
  initValidate() {
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
      foodImg: {
        required: true
      },
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
      foodImg: {
        required: '请添加商品图片'
      },
    }
    this.WxValidate = new WxValidate(rules, messages)
  }
})
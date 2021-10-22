import WxValidate from '../../../../utils/WxValidate.js'
const app = getApp()
var that

Page({
  data: {
    canteen: {},
    identity: {},
    food: {},
    index1: null,
    index2: null,
    oldImg: ''
  },

  onLoad: function (options) {
    that = this
    that.initValidate()

    let index0 = options.index0
    let index1 = options.index1
    let index2 = options.index2

    var canteen = app.globalData.canteens[index0]
    const identity = app.globalData.identity
    var food = canteen.foodList[index1].food[index2]
    that.setData({
      canteen,
      identity,
      food,
      index1,
      index2
    })
  },
  ChooseImage: function (e) {
    wx.chooseImage({
        count: 1, //默认9
        sizeType: 'compressed'
      })
      .then(res => {
        // TODO: 使用canvas进行压缩
        that.setData({
          ['food.img']: res.tempFilePaths[0],
        })
      })
      .catch(res => {
        that.showT('图片选择取消')
      })
  },
  ViewImage: function (e) {
    wx.previewImage({
      urls: [that.data.food.img],
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
            ['food.img']: '',
            oldImg: that.data.food.img
          })
        }
      }
    })
  },
  onPriceInputBlur: function (e) {
    var oldPrice = that.data.food.price
    var price = parseFloat(e.detail.value)
    if (isNaN(price) || price <= 0) {
      that.setData({
        ['food.price']: oldPrice
      })
    } else {
      price = parseFloat(price.toFixed(2)) //至多2位小数
      that.setData({
        ['food.price']: price
      })
    }
  },
  editGoodsSubmit: function (e) {
    var food = that.data.food
    var params = Object.assign(food, e.detail.value)
    //表单验证
    if (!that.WxValidate.checkForm(params)) {
      const error = that.WxValidate.errorList[0]
      that.showT(error.msg)
    } else {
      wx.showLoading({
        title: '上传中',
        mask: true
      })

      //若有更换图片则先上传新图片，然后修改为新img值，再删除原来的云储存图片, 最后修改数据库
      if (that.data.oldImg) {
        //上传图片
        let canteen = that.data.canteen

        let cloudPath = '餐厅图片/'
        let address = canteen.address
        let shopName = canteen.name
        let foodType = params.type

        //储存路径：餐厅图片/地区名/餐厅名/food/商品类型_商品名_时间戳.图片格式
        cloudPath = cloudPath + ({
            XA: '翔安',
            SM: '思明',
            HY: '海韵'
          })[address] + '/' + shopName + '/food/' + foodType + '_' + params.name + '_' +
          new Date().getTime() + params.img.match('.[^.]+?$')[0]

        wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: params.img, // 文件路径
          })
          .then(res => {
            //修改为云图片路径
            params.img = res.fileID

            //删除原图片
            wx.cloud.callFunction({
                name: 'cloudFilesDelete',
                data: {
                  fileIDs: [that.data.oldImg]
                }
              })
              .then(res => {
                if (res.result[0].status) {
                  wx.hideLoading()
                  that.showT('原图片删除出错')
                } else {
                  //更新数据库
                  wx.cloud.callFunction({
                      name: 'dbUpdate',
                      data: {
                        table: 'food',
                        _id: food._id,
                        formData: params,
                        set: true
                      }
                    })
                    .then(res => {
                      wx.hideLoading()
                      if (res.result.success) {
                        that.showT('保存成功', 'success', 1500)
                        //返回上一页
                        setTimeout(() => {
                          wx.navigateBack()
                        }, 1600);
                      } else {
                        that.showT('数据提交失败', 'error', 1500)
                      }
                    })
                    .catch(e => {
                      that.showT('数据提交失败', 'error', 1500)
                    })
                }
              })
              .catch(res => {
                wx.hideLoading()
                that.showT('图片删除出错')
              })
          })
          .catch(e => {
            wx.hideLoading()
            that.showT('图片上传失败', 'error', 1500)
          })
      } else {
        //否则直接更新数据库
        wx.cloud.callFunction({
            name: 'dbUpdate',
            data: {
              table: 'food',
              _id: food._id,
              formData: params,
              set: true
            }
          })
          .then(res => {
            wx.hideLoading()
            if (res.result.success) {
              that.showT('保存成功', 'success', 1500)
              //返回上一页
              setTimeout(() => {
                wx.navigateBack()
              }, 1600);
            } else {
              that.showT('数据提交失败', 'error', 1500)
            }
          })
          .catch(e => {
            that.showT('数据提交失败', 'error', 1500)
          })
      }
    }
  },
  showT: (title, icon = 'none', duration = 1000) => {
    wx.showToast({
      title: title,
      icon: icon,
      duration: duration
    })
  },
  initValidate() { //表单验证规则和提示语
    const rules = {
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
      img: {
        required: true
      },
      tag: {
        maxlength: 4
      }
    }

    const messages = {
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
      img: {
        required: '请添加商品图片'
      },
      tag: {
        maxlength: '标签最长4个字符'
      }
    }
    this.WxValidate = new WxValidate(rules, messages)
  }
})
// subpackages/admin/pages/shop/addShop.js
import WxValidate from '../../../../utils/WxValidate.js'
const util = require('../../../../utils/util.js')
const db = wx.cloud.database()
const app = getApp()
var that
Page({
  data: {
    maxImgnum: 5,
    imageNum: 0,
    timePeriodNum: 1, // 时间段
    identity: {},
    typePickerIndex: null,
    foodTypePickerIndex: null,
    show: false,
    TypeToaddress: {
      翔安: 'XA',
      思明: 'SM',
      海韵: 'HY'
    },
    addressToType: {
      XA: '翔安',
      SM: '思明',
      HY: '海韵'
    },
    typePicker: ['翔安', '思明', '海韵'],
    business: [], // 存储form.businessTime中字符串转化的时间
    beginTime: '06:00',
    endTime: '20:00',
    form: {
      name: '',
      address: '',
      fulAddress: '',
      cID: '',
      thumb: '',
      image: [],
      businessTime: [],
      foodList: [],
      info: '',
      favor: 0,
      bad: 0,
    }
  },
  onLoad: function (options) {
    that = this
    that.initValidate()
    const identity = app.globalData.identity
    var canteens = app.globalData.canteens
    var form = that.data.form
    form.foodList.push({
      name: "默认"
    })
    form.businessTime.push(["0600", "2000"])
    that.timeExchange()
    that.setData({
      identity,
      form
    })
  },
  getStrDate(date) {
    let year = date.getFullYear()
    let month = (date.getMonth() + 1).toString().padStart(2, '0')
    let day = date.getDate().toString().padStart(2, '0')
    let hour = date.getHours().toString().padStart(2, '0')
    let min = date.getMinutes().toString().padStart(2, '0')
    let sec = date.getSeconds().toString().padStart(2, '0')
    return year + month + day + hour + min + sec
  },
  // 返回长度为4位的随机字母字符串
  getRandomStr() {
    return Math.random().toString(36).slice(-4)
  },
  addBussinessTime(e) {
    that.setData({
      show: true
    })
  },
  addTimePeriods(e) {
    var timePeriodNum = that.data.timePeriodNum
    timePeriodNum += 1
    if (timePeriodNum > 3) {
      util.showToast('时间段数量已满', 'error')
      that.setData({
        show: false
      })
      return
    }
    var show = false
    var beginTime = that.data.beginTime
    var endTime = that.data.endTime

    var bIimeStr = beginTime.substring(0, 2) + beginTime.substring(3, 5)
    var eTimeStr = endTime.substring(0, 2) + endTime.substring(3, 5)

    if (parseInt(eTimeStr) <= parseInt(bIimeStr)) {
      util.showToast('开始时间不得超过结束时间')
      return
    }
    var businessTime = that.data.form.businessTime
    businessTime.push([
      bIimeStr, eTimeStr
    ])
    that.timeExchange()
    that.setData({
      show: show,
      'form.businessTime': businessTime,
      timePeriodNum: timePeriodNum
    })
  },
  timeExchange(e) {
    var business = []
    var businessTime = that.data.form.businessTime
    var n = that.data.form.businessTime.length
    for (var i = 0; i < n; i++) {
      business.push([businessTime[i][0].substring(0, 2), businessTime[i][0].substring(2, 4),
        businessTime[i][1].substring(0, 2), businessTime[i][1].substring(2, 4)
      ])
    }
    that.setData({
      business
    })
  },
  delTime(e) {
    var index = e.currentTarget.dataset.index
    var business = that.data.business
    var businessTime = that.data.form.businessTime
    var timePeriodNum = that.data.timePeriodNum
    business.splice(index, 1)
    businessTime.splice(index, 1)
    timePeriodNum -= 1
    that.setData({
      business: business,
      'form.businessTime': businessTime,
      timePeriodNum: timePeriodNum
    })
  },
  beginTimeChange(e) {
    that.setData({
      beginTime: e.detail.value
    })
  },
  endTimeChange(e) {
    that.setData({
      endTime: e.detail.value
    })
  },
  addFoodType: function (e) {
    wx.showModal({
      title: '添加商品类别',
      confirmText: '添加',
      editable: true,
      placeholderText: '输入新商品类别名称',
      success(res) {
        if (res.confirm) {
          var newTypeName = res.content
          var foodList = that.data.form.foodList
          var flag = false
          for (var i = 0; i < foodList.length; i++) {
            if (foodList[i].name.indexOf(newTypeName) >= 0) {
              flag = true
              break
            }
          }
          if (flag) {
            util.showToast('商品类别名称重复')
          } else {
            foodList.push({
              name: newTypeName
            })
            that.setData({
              'form.foodList': foodList
            })
          }
        }
        else {
          util.showToast('操作已取消')
        }
      }
    })
  },
  editFoodType(e) {
    var index = e.currentTarget.dataset.index
    var foodList = that.data.form.foodList
    var foodtype = foodList[index]
    wx.showModal({
      title: '修改商品类别',
      content: foodtype.name,
      confirmText: '确认修改',
      editable: true,
      success(res) {
        if (res.confirm) {
          var newTypeName = res.content
          if (newTypeName === '') {
            util.showToast('类别名不可为空')
            return
          }
          foodList[index].name = newTypeName
          that.setData({
            'form.foodList': foodList
          })
        } else {
          util.showToast('操作已取消')
        }
      }
    })

  },
  delFoodType: function (e) {
    var index = e.currentTarget.dataset.index
    var foodList = that.data.form.foodList
    var foodtype = foodList[index]
    if( foodtype.name === '默认' ) 
    {
       util.showToast('默认类别无法删除')
       return
    }
    foodList.splice(index, 1)
    that.setData({
      'form.foodList': foodList
    })
  },
  typePickerChange: function (e) {
    var index = e.detail.value
    var type = that.data.typePicker[index]
    var address = that.data.TypeToaddress[type]
    that.setData({
      typePickerIndex: index,
      'form.address': address
    })
  },
  chooseThumb: function (e) {
    wx.chooseImage({
        count: 1, //默认9
        sizeType: ['compressed']
      })
      .then(res => {
        var url = '../../../../pages/index/cropper?src=' + res.tempFilePaths[0]
        url += '&w=480&h=360'
        wx.navigateTo({
          url: url,
          events: {
            saveImg: function (data) {
              that.setData({
                'form.thumb': data.img,
              })
            }
          }
        })
      })
      .catch(error => {
        util.showToast('图片选择取消')
      })
  },
  chooseImage: function (e) {
    var imageNum = that.data.imageNum
    var form = that.data.form
    wx.chooseImage({
        count: 1,
        sizeType: ['compressed']
      })
      .then(res => {
        var url = '../../../../pages/index/cropper?src=' + res.tempFilePaths[0]
        url += '&w=600&h=300'
        wx.navigateTo({
          url: url,
          events: { //回调
            saveImg: function (data) {
              if (form.image.length != 0) {
                that.setData({
                  'form.image': form.image.concat(data.img),
                  imageNum: imageNum + 1
                })
              } else {
                that.setData({
                  'form.image': [data.img],
                  imageNum: imageNum + 1
                })
              }
            }
          }
        })
      })
      .catch(err => {
        util.showToast('图片选择取消')
      })
  },
  viewImage: function (e) {
    var id = e.currentTarget.dataset.index
    wx.previewImage({
      urls: [that.data.form.image[id]],
    });
  },
  delImg: function (e) {
    var index = e.currentTarget.dataset.index
    var form = that.data.form
    var imageNum = that.data.imageNum
    wx.showModal({
      title: '移除图片',
      content: '确定要移除这张图片吗',
      cancelText: '否',
      confirmText: '是',
      success: res => {
        if (res.confirm) {
          form.image.splice(index, 1)
          imageNum -= 1
          that.setData({
            'form.image': form.image,
            imageNum: imageNum
          })
        }
      }
    })
  },
  viewThumb: function (e) {
    wx.previewImage({
      urls: [that.data.form.thumb],
    });
  },
  delThumb: function (e) {
    wx.showModal({
      title: '移除图片',
      content: '确定要移除这张图片吗',
      cancelText: '否',
      confirmText: '是',
      success: res => {
        if (res.confirm) {
          that.setData({
            ['form.thumb']: '',
          })
        }
      }
    })
  },
  getRandomPath: (img, address) => { //储存路径：餐厅图片/地区名/餐厅名/时间戳_4位随机数.图片格式
    var date = new Date()
    var type = that.data.addressToType[address]
    const randomStr = date.getTime() + '_' + Math.random().toString(36).slice(-4)
    return '餐厅图片/' + type + '/' + randomStr + img.match('.[^.]+?$')[0]
  },
  addNoticesSubmit: function (e) {
    var form = that.data.form
    var params = Object.assign(form, e.detail.value)
    //表单验证
    if (!that.WxValidate.checkForm(params)) {
      const error = that.WxValidate.errorList[0]
      util.showToast(error.msg)
    } else {
      //先传图片
      util.showLoading('图片上传中')
      var proList = []
      // 封面
      proList.push(
        wx.cloud.uploadFile({
          cloudPath: that.getRandomPath(params.thumb, params.address),
          filePath: params.thumb
        })
      )
      //其他图片
      params.image.forEach(img => {
        proList.push(
          wx.cloud.uploadFile({
            cloudPath: that.getRandomPath(img, params.address),
            filePath: img
          })
        )
      })
      Promise.all(proList).then(res => {
        util.showLoading('上传商店信息中')
        var image = []
        for (let i = 1; i < res.length; i++) {
          const imgRes = res[i];
          image.push(imgRes.fileID)
        }
        //图片上传成功再提交数据
        //构建表单
        var date = new Date()
        var cID = that.getStrDate(date) + that.getRandomStr()
        var newForm = Object.assign(params, {
          image: image,
          thumb: res[0].fileID,
          cID: cID
        })
        db.collection('canteen').add({
          data: newForm
        }).then(res => {
          wx.hideLoading()
          util.showToast('提交成功', 'success', 1500)
          // 返回上一页
          setTimeout(() => {
            wx.navigateBack()
          }, 1600);
        }).catch(error => {
          console.error(error)
          wx.hideLoading()
          util.showToast('公告上传失败', 'error', 2000)
        })
      }).catch(error => {
        console.error(error)
        wx.hideLoading()
        util.showToast('图片上传失败', 'error', 2000)
      })
    }
  },
  initValidate() { //表单验证规则和提示语
    const rules = {
      name: {
        required: true
      },
      fulAddress: {
        required: true
      },
      info: {
        required: true,
        maxlength: 50
      },
      thumb: {
        required: true
      },
      image: {
        required: true
      },
      address: {
        required: true
      },
      businessTime: {
        required: true
      }
    }
    const messages = {
      address: {
        required: '请选择餐厅所在地区',
      },
      fulAddress: {
        required: '请输入餐厅地址',
      },
      name: {
        required: '请输入餐厅名称'
      },
      info: {
        required: '请输入餐厅介绍',
        maxlength: '请输入50字符内的餐厅简介'
      },
      thumb: {
        required: '请添加餐厅封面'
      },
      image: {
        required: '请添加餐厅图片'
      },
      businessTime: {
        required: '请添加营业时间'
      }
    }
    that.WxValidate = new WxValidate(rules, messages)
  }
})
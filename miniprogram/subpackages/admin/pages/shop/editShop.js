// subpackages/admin/pages/shop/editShop.js
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
    oldThumb: '',
    oldImage: [],
    typePickerIndex: null,
    show: false,
    delFood: [], // 存储被要被删除的食物
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
    business: [], // 存储businessTime中字符串转化的时间
    canteen: {},
    beginTime: '06:00',
    endTime: '20:00',
  },
  onLoad: function (options) {
    that = this
    that.initValidate()
    const identity = app.globalData.identity
    var canteen = JSON.parse(options.canteen)
    var imageNum = canteen.image.length
    var timePeriodNum = canteen.businessTime.length
    var type = that.data.addressToType[canteen.address]
    var typePickerIndex = 0
    var typePicker = that.data.typePicker
    for (var i = 0; i < typePicker.length; i++) {
      if (type == typePicker[i]) {
        typePickerIndex = i
        break
      }
    }
    that.setData({
      canteen,
      imageNum,
      identity,
      timePeriodNum,
      typePickerIndex
    })
    that.timeExchange()
  },
  timeExchange(e) {
    var business = []
    var businessTime = that.data.canteen.businessTime
    var n = businessTime.length
    for (var i = 0; i < n; i++) {
      business.push([
        businessTime[i][0].substring(0, 2), businessTime[i][0].substring(2, 4),
        businessTime[i][1].substring(0, 2), businessTime[i][1].substring(2, 4)
      ])
    }
    that.setData({
      business
    })
  },
  addBussinessTime(e) {
    that.setData({
      show: true
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
    var businessTime = that.data.canteen.businessTime
    businessTime.push([
      bIimeStr, eTimeStr
    ])
    that.timeExchange()
    that.setData({
      show: show,
      'canteen.businessTime': businessTime,
      timePeriodNum: timePeriodNum
    })
  },
  delTime(e) {
    var index = e.currentTarget.dataset.index
    var business = that.data.business
    var businessTime = that.data.canteen.businessTime
    var timePeriodNum = that.data.timePeriodNum
    business.splice(index, 1)
    businessTime.splice(index, 1)
    timePeriodNum -= 1
    that.setData({
      business: business,
      'canteen.businessTime': businessTime,
      timePeriodNum: timePeriodNum
    })
  },
  getFood: function (cID, typeName) {
    return new Promise(async (resolve, _reject) => {
      db.collection('food').where({
        cID: cID,
        typeName: typeName
      }).get().then(res => {
        that.setData({
          delFood: res.data
        })
        resolve(res.data)
        return
      })
    })
  },
  editFoodType(e) {
    var index = e.currentTarget.dataset.index
    var foodList = that.data.canteen.foodList
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
            'canteen.foodList': foodList
          })
        } else {
          util.showToast('操作已取消')
        }
      }
    })

  },
  delFoodType: function (e) {
    var index = e.currentTarget.dataset.index
    var foodList = that.data.canteen.foodList
    var foodtype = foodList[index]
    if (foodtype.name === '默认') {
      util.showToast('默认类别无法删除')
      return
    }
    wx.showModal({
      title: '提示',
      content: '确认删除该类别吗？',
      success(res) {
        if (res.confirm) {
          util.showLoading('正在删除该类别')
          var canteen = that.data.canteen
          var name = foodtype.name
          wx.cloud.callFunction({
            name: 'dbUpdate',
            data: {
              table: 'canteen',
              _id: canteen._id,
              pull: true,
              path: 'foodList',
              formData: {
                name: name
              }
            }
          })
          var cID = that.data.canteen.cID
          var typeName = '默认'
          that.getFood(cID, foodtype.name).then(res => {
            var n = that.data.delFood.length
            for (var i = 0; i < n; i++) {
              var food = that.data.delFood[i]
              food.typeName = '默认'
              wx.cloud.callFunction({
                name: 'dbUpdate',
                data: {
                  table: 'food',
                  _id: food._id,
                  set: true,
                  path: 'typeName',
                  formData: {
                    typeName
                  }
                }
              })
            }
          })
          foodList.splice(index, 1)
          that.setData({
            'canteen.foodList': foodList
          })
          util.hideLoading()
        } else {
          util.showToast('选择已取消')
        }
      }
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
          if (newTypeName === '') {
            util.showToast('类别名不可为空')
            return
          }
          var foodList = that.data.canteen.foodList
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
              'canteen.foodList': foodList
            })
          }
        }
        else {
          util.showToast('操作已取消')
        }
      }
    })
  },
  typePickerChange: function (e) {
    var index = e.detail.value
    var type = that.data.typePicker[index]
    var address = that.data.TypeToaddress[type]
    that.setData({
      typePickerIndex: index,
      'canteen.address': address
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
                'canteen.thumb': data.img,
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
    var canteen = that.data.canteen
    wx.chooseImage({
        count: 1,
        sizeType: ['compressed']
      }).then(res => {
        var url = '../../../../pages/index/cropper?src=' + res.tempFilePaths[0]
        url += '&w=600&h=300'
        wx.navigateTo({
          url: url,
          events: { //回调
            saveImg: function (data) {
              var image = that.data.canteen.image
              var oldImage = that.data.oldImage
              //构建setData对象
              var formData = {
                imageNum: imageNum + 1
              }
              if (!oldImage.length) { //若从未修改过图片数组
                formData.oldImage = [...image] //复制数组
              }
              if (canteen.image.length !== 0) {
                formData['canteen.image'] = canteen.image.concat(data.img)
              } else {
                formData['canteen.image'] = [data.img]
              }
              that.setData(formData)
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
      urls: [that.data.canteen.image[id]],
    });
  },
  delImg: function (e) {
    var index = e.currentTarget.dataset.index
    var image = that.data.canteen.image
    var imageNum = that.data.imageNum
    var oldImage = that.data.oldImage
    wx.showModal({
      title: '移除图片',
      content: '确定要移除这张图片吗',
      cancelText: '否',
      confirmText: '是',
      success: res => {
        if (res.confirm) {
          if (!oldImage.length) { //若从未修改过图片数组
            oldImage = [...image] //复制数组
          }
          image.splice(index, 1)
          imageNum -= 1
          that.setData({
            'canteen.image': image,
            oldImage,
            imageNum
          })
        }
      }
    })
  },
  viewThumb: function (e) {
    wx.previewImage({
      urls: [that.data.canteen.thumb],
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
            'canteen.thumb': '',
            oldThumb: that.data.canteen.thumb
          })
        }
      }
    })
  },
  getUsersBycID: function (cID) {
    return new Promise(async (resolve, _reject) => {
      db.collection('users').where({
        'identity.cID': cID
      }).get().then(res => {
        that.setData({
          users: res.data
        })
        resolve(res.data)
        return
      })
    })
  },
  delShop(e) {
    var canteen = that.data.canteen
    const identity = app.globalData.identity
    if (identity.type !== 'superAdmin') {
      util.showToast('您没有该餐厅的删除权限')
      return
    }
    wx.showModal({
      title: '提示',
      content: '确认删除该餐厅吗？',
      success(res) {
        if (res.confirm) {
          util.showLoading('正在删除餐厅')
          let _id = canteen._id
          // 商店数据
          var p0 = wx.cloud.callFunction({
            name: 'dbMove',
            data: {
              table: 'canteen',
              _id: _id
            }
          })
          // 商店图片
          var fileIDs = canteen.image
          fileIDs.push(canteen.thumb)
          //云函数无视权限删除图片
          var p1 = wx.cloud.callFunction({
            name: 'cloudFilesDelete',
            data: {
              fileIDs
            }
          })
          var cID = canteen.cID
          that.getUsersBycID(cID).then(res => {
            var n = that.data.users.length
            for (var i = 0; i < n; i++) {
              var user = that.data.users[i]
              wx.cloud.callFunction({
                name: 'dbUpdate',
                data: {
                  table: 'users',
                  _id: user._id,
                  remove: true,
                  path: 'identity.cID',
                }
              })
            }
          })
          Promise.all([p0, p1]).then(res => {
            // 不考虑图片删除结果
            if (res[0].result.success) {
              util.hideLoading()
              util.showToast('删除成功', 'success', '1000')
              setTimeout(() => {
                wx.navigateBack()
              }, 1500);
            } else {
              wx.hideLoading()
              util.showToast('删除失败', 'error', 2000)
            }
          })
        } else {
          util.showToast('选择已取消')
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
  editShopSubmit: function (e) {
    var canteen = that.data.canteen
    var params = Object.assign(canteen, e.detail.value)
    //表单验证
    if (!that.WxValidate.checkForm(params)) {
      const error = that.WxValidate.errorList[0]
      util.showToast(error.msg)
    } else {
      util.showLoading('上传中')
      //若有更换图片则上传新图片，删除原来的云储存图片, 最后修改数据库
      const oldThumb = that.data.oldThumb
      const oldImage = that.data.oldImage
      var proList = []
      var delFileIDs = []
      if (oldThumb) { //有更换封面
        util.showLoading('上传图片中')
        //上传封面
        proList.push(
          wx.cloud.uploadFile({
            cloudPath: that.getRandomPath(params.thumb),
            filePath: params.thumb
          })
        )
        //旧封面id
        delFileIDs.push(oldThumb)
      }
      var newImagesIndexList = [] //需要保存新url的坐标
      if (oldImage.length) { //其他图片若有变化
        //找出需要上传的
        for (let i = 0; i < canteen.image.length; i++) {
          const img = canteen.image[i];
          if (!oldImage.includes(img)) {
            proList.push(
              wx.cloud.uploadFile({
                cloudPath: that.getRandomPath(img),
                filePath: img
              })
            )
            // 保存在canteen.image的坐标，用于接下来更新url
            newImagesIndexList.push(i)
          }
        }
        //找出需要删除的
        for (let i = 0; i < oldImage.length; i++) {
          const img = oldImage[i];
          if (!canteen.image.includes(img)) {
            //需要删除的id
            delFileIDs.push(img)
          }
        }
      }
      // 按需执行删除图片
      if (delFileIDs.length) {
        proList.push(
          wx.cloud.callFunction({
            name: 'cloudFilesDelete',
            data: {
              fileIDs: delFileIDs
            }
          })
        )
      }
      //等待上传和删除完成
      Promise.all(proList).then(res => {
        var resIndex = 0
        //按需修改为新封面url
        if (oldThumb) {
          canteen.thumb = res[resIndex].fileID
          resIndex += 1
        }
        //按需修改为新url
        if (newImagesIndexList.length) {
          for (let i = 0; i < newImagesIndexList.length; i++) {
            const newImagesIndex = newImagesIndexList[i];
            canteen.image[newImagesIndex] = res[resIndex].fileID
            resIndex += 1
          }
        }
        util.showLoading('上传餐厅信息中')
        //更新数据库
        wx.cloud.callFunction({
          name: 'dbUpdate',
          data: {
            table: 'canteen',
            _id: canteen._id,
            formData: canteen,
            set: true
          }
        }).then(res => {
          wx.hideLoading()
          if (res.result.success) {
            util.showToast('保存成功', 'success', 1500)
            //返回上一页
            setTimeout(() => {
              wx.navigateBack()
            }, 1500);
          } else {
            console.error(res.result)
            util.showToast('保存失败', 'error', 1500)
          }
        }).catch(e => {
          wx.hideLoading()
          console.error(e)
          util.showToast('保存失败', 'error', 1500)
        })
      }).catch(e => {
        wx.hideLoading()
        console.error(e)
        util.showToast('图片上传失败', 'error', 1500)
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
        required: true
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
        required: '请输入餐厅介绍'
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
import WxValidate from '../../../../utils/WxValidate.js'
const util = require('../../../../utils/util.js')
const app = getApp()
var that

Page({
  data: {
    canteen: {},
    identity: {},
    food: {},
    index1: null,
    index2: null,
    oldCoverImg: '',
    oldImages: []
  },

  onLoad: function (options) {
    that = this
    that.initValidate()

    let index0 = options.index0
    let index1 = options.index1
    let index2 = options.index2

    var canteen = app.globalData.canteen[index0]
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
              //此处不要保存oldCoverImg
              that.setData({
                'food.coverImg': data.img,
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
    var detailImgs = that.data.food.detailImgs
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
              var oldImages = that.data.oldImages
              if (!oldImages.length) { //若从未修改过图片数组
                oldImages = [...detailImgs] //复制数组
              }

              if (detailImgs.length != 0) {
                detailImgs.push(data.img)
              } else {
                detailImgs = [data.img]
              }

              that.setData({
                'food.detailImgs': detailImgs,
                oldImages
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
      img = that.data.food.detailImgs[e.currentTarget.dataset.index]
    } else {
      img = that.data.food.coverImg
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
          var food = that.data.food
          if ('index' in e.currentTarget.dataset) { // 删除详情图片
            const index = e.currentTarget.dataset.index
            var oldImages = that.data.oldImages
            if (!oldImages.length) { //若从未修改过图片数组
              oldImages = [...food.detailImgs] //复制数组
            }
            food.detailImgs.splice(index, 1)
            that.setData({
              'food.detailImgs': food.detailImgs,
              oldImages
            })
          } else { // 删除封面图片
            that.setData({
              'food.coverImg': '',
              oldCoverImg: food.coverImg
            })
          }
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
  getRandomPath: (params, img) => { //储存路径：餐厅图片/地区名/餐厅名/food/商品类型名_商品名_时间戳.图片格式
    const canteen = that.data.canteen
    const addressToPlaceName = {
      XA: '翔安',
      SM: '思明',
      HY: '海韵'
    }
    const placeName = addressToPlaceName[canteen.address]
    const shopName = canteen.name
    const typeName = params.typeName
    const foodName = params.name
    const randomStr = (new Date().getTime()).toString() + Math.random().toString(36).slice(-4)

    var path = '餐厅图片/' + placeName + '/' + shopName + '/商品/'
    path += typeName + '_' + foodName + '_' + randomStr + img.match('.[^.]+?$')[0]
    return path
  },
  editGoodsSubmit: function (e) {
    var food = that.data.food
    var params = Object.assign(food, e.detail.value)
    //表单验证
    if (!that.WxValidate.checkForm(params)) {
      const error = that.WxValidate.errorList[0]
      util.showToast(error.msg)
      return
    }
    util.showLoading('图片上传中')
    //若有更换图片则先上传新图片，然后修改为新img值，再删除原来的云储存图片, 最后修改数据库

    const oldCoverImg = that.data.oldCoverImg
    const oldImages = that.data.oldImages
    var proList = []
    var delFileIDs = []

    if (oldCoverImg) { //有更换封面
      util.showLoading('上传图片中') //切换loading信息
      //上传封面
      proList.push(
        wx.cloud.uploadFile({
          cloudPath: that.getRandomPath(params, params.coverImg),
          filePath: params.coverImg
        })
      )
      //旧封面id
      delFileIDs.push(oldCoverImg)
    }

    var newImagesIndexList = [] //需要保存新url的坐标
    if (oldImages.length) { //其他图片若有变化
      //找出需要上传的
      for (let i = 0; i < params.detailImgs.length; i++) {
        const img = params.detailImgs[i];
        if (!oldImages.includes(img)) {
          proList.push(
            wx.cloud.uploadFile({
              cloudPath: that.getRandomPath(params, img),
              filePath: img
            })
          )
          // 在params.detailImgs中的坐标，用于接下来更新url
          newImagesIndexList.push(i)
        }
      }
      //找出需要删除的
      for (let i = 0; i < oldImages.length; i++) {
        const img = oldImages[i];
        if (!params.detailImgs.includes(img)) {
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
      if (oldCoverImg) {
        params.coverImg = res[resIndex].fileID
        resIndex += 1
      }

      //按需修改为新url
      if (newImagesIndexList.length) {
        for (let i = 0; i < newImagesIndexList.length; i++) {
          const newImagesIndex = newImagesIndexList[i];
          params.detailImgs[newImagesIndex] = res[resIndex].fileID
          resIndex += 1
        }
      }

      util.showLoading('上传公告中')
      //库存转为数字格式
      params.allNum = parseInt(params.allNum)
      params.curNum = params.allNum

      //更新数据库
      wx.cloud.callFunction({
        name: 'dbUpdate',
        data: {
          table: 'food',
          _id: params._id,
          formData: params,
          set: true
        }
      }).then(res => {
        wx.hideLoading()
        if (res.result.success) {
          util.showToast('保存成功', 'success', 1500)
          //返回上一页
          setTimeout(() => {
            //页面通信进行刷新
            const eventChannel = that.getOpenerEventChannel()
            eventChannel.emit('refresh')
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
    return

    if (that.data.oldImg) {
      //上传图片
      let canteen = that.data.canteen

      let cloudPath = '餐厅图片/'
      let address = canteen.address
      let shopName = canteen.name
      let typeName = params.typeName

      //储存路径：餐厅图片/地区名/餐厅名/food/商品类型_商品名_时间戳.图片格式
      cloudPath = cloudPath + ({
          XA: '翔安',
          SM: '思明',
          HY: '海韵'
        })[address] + '/' + shopName + '/food/' + typeName + '_' + params.name + '_' +
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
                util.showToast('原图片删除出错')
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
                      util.showToast('保存成功', 'success', 1500)
                      //返回上一页
                      setTimeout(() => {
                        const eventChannel = that.getOpenerEventChannel()
                        eventChannel.emit('refresh')
                        wx.navigateBack()
                      }, 1500);
                    } else {
                      util.showToast('数据提交失败', 'error', 1500)
                    }
                  })
                  .catch(e => {
                    util.showToast('数据提交失败', 'error', 1500)
                  })
              }
            })
            .catch(res => {
              wx.hideLoading()
              util.showToast('图片删除出错')
            })
        })
        .catch(e => {
          wx.hideLoading()
          util.showToast('图片上传失败', 'error', 1500)
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
            util.showToast('保存成功', 'success', 1500)
            //返回上一页
            setTimeout(() => {
              const eventChannel = that.getOpenerEventChannel()
              eventChannel.emit('refresh')
              wx.navigateBack()
            }, 1500);
          } else {
            util.showToast('数据提交失败', 'error', 1500)
          }
        })
        .catch(e => {
          util.showToast('数据提交失败', 'error', 1500)
        })
    }

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
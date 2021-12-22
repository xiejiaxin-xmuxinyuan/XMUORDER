import WxValidate from '../../../../utils/WxValidate.js'
const util = require('../../../../utils/util.js')
const app = getApp()
var that

Page({
  data: {
    notice: {},
    oldCoverImg: '',
    oldImages: [],

    maxImgnum: 5,
    imageNum: 0,
    identity: {},
    typePicker: ['公共', '翔安', '思明', '海韵'],
    orgPicker: [],
    typePickerIndex: null,
    orgPickerIndex: null,
  },
  onLoad: function (options) {
    that = this
    that.initValidate()
    const identity = app.globalData.identity
    var notice = JSON.parse(options.notice)
    var imageNum = notice.images.length

    if (identity.type === 'superAdmin') {
      const typePicker = that.data.typePicker
      var typePickerIndex
      for (let i = 0; i < typePicker.length; i++) {
        const typeName = typePicker[i];
        if (typeName === notice.type) {
          typePickerIndex = i
          break
        }
      }

      var canteens = app.globalData.canteen
      var orgPicker = ['点餐项目组']
      var orgPickerIndex
      canteens.forEach(canteen => {
        orgPicker.push(canteen.name)
      })
      for (let i = 0; i < orgPicker.length; i++) {
        const orgName = orgPicker[i];
        if (orgName === notice.org) {
          orgPickerIndex = i
          break
        }
      }

      that.setData({
        orgPicker,
        orgPickerIndex,
        typePickerIndex
      })
    }

    that.setData({
      notice: notice,
      imageNum,
      identity
    })
  },
  onSwitchChange: function (e) {
    that.setData({
      'notice.top': e.detail.value
    })
  },
  typePickerChange: function (e) {
    var index = e.detail.value
    var type = that.data.typePicker[index]
    that.setData({
      typePickerIndex: index,
      'notice.type': type
    })
  },
  orgPickerChange: function (e) {
    var index = e.detail.value
    var org = that.data.orgPicker[index]
    that.setData({
      orgPickerIndex: index,
      'notice.org': org
    })
  },
  chooseCoverImage: function (e) {
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
                'notice.coverImg': data.img,
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
    var notice = that.data.notice
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
              var images = that.data.notice.images
              var oldImages = that.data.oldImages

              //构建setData对象
              var formData = {
                imageNum: imageNum + 1
              }
              if (!oldImages.length) { //若从未修改过图片数组
                formData.oldImages = [...images] //复制数组
              }
              if (notice.images.length !== 0) {
                formData['notice.images'] = notice.images.concat(data.img)
              } else {
                formData['notice.images'] = [data.img]
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
    var index = e.currentTarget.dataset.index
    wx.previewImage({
      urls: [that.data.notice.images[index]],
    });
  },
  delImg: function (e) {
    var index = e.currentTarget.dataset.index
    var images = that.data.notice.images
    var imageNum = that.data.imageNum
    var oldImages = that.data.oldImages

    wx.showModal({
      title: '移除图片',
      content: '确定要移除这张图片吗',
      cancelText: '否',
      confirmText: '是',
      success: res => {
        if (res.confirm) {
          if (!oldImages.length) { //若从未修改过图片数组
            oldImages = [...images] //复制数组
          }
          images.splice(index, 1)
          imageNum -= 1

          that.setData({
            'notice.images': images,
            oldImages,
            imageNum
          })
        }
      }
    })
  },
  viewCoverImage: function (e) {
    wx.previewImage({
      urls: [that.data.notice.coverImg],
    });
  },
  delCoverImg: function (e) {
    wx.showModal({
      title: '移除图片',
      content: '确定要移除这张图片吗',
      cancelText: '否',
      confirmText: '是',
      success: res => {
        if (res.confirm) {
          that.setData({
            'notice.coverImg': '',
            oldCoverImg: that.data.notice.coverImg
          })
        }
      }
    })
  },
  getRandomPath: (img) => { //储存路径：公告图片/时间戳_4位随机数.图片格式
    var date = new Date()
    const randomStr = date.getTime() + '_' + Math.random().toString(36).slice(-4)
    return '公告图片/' + randomStr + img.match('.[^.]+?$')[0]
  },
  editNoticesSubmit: function (e) {
    var notice = that.data.notice
    var params = Object.assign(notice, e.detail.value)
    //表单验证
    if (!that.WxValidate.checkForm(params)) {
      const error = that.WxValidate.errorList[0]
      util.showToast(error.msg)
    } else {
      util.showLoading('上传中')
      //若有更换图片则上传新图片，删除原来的云储存图片, 最后修改数据库

      const oldCoverImg = that.data.oldCoverImg
      const oldImages = that.data.oldImages
      var proList = []
      var delFileIDs = []

      if (oldCoverImg) { //有更换封面
        util.showLoading('上传图片中')
        //上传封面
        proList.push(
          wx.cloud.uploadFile({
            cloudPath: that.getRandomPath(params.coverImg),
            filePath: params.coverImg
          })
        )
        //旧封面id
        delFileIDs.push(oldCoverImg)
      }

      var newImagesIndexList = [] //需要保存新url的坐标
      if (oldImages.length) { //其他图片若有变化
        //找出需要上传的
        for (let i = 0; i < notice.images.length; i++) {
          const img = notice.images[i];
          if (!oldImages.includes(img)) {
            proList.push(
              wx.cloud.uploadFile({
                cloudPath: that.getRandomPath(img),
                filePath: img
              })
            )
            // 保存在notice.images的坐标，用于接下来更新url
            newImagesIndexList.push(i)
          }
        }
        //找出需要删除的
        for (let i = 0; i < oldImages.length; i++) {
          const img = oldImages[i];
          if (!notice.images.includes(img)) {
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
          notice.coverImg = res[resIndex].fileID
          resIndex += 1
        }

        //按需修改为新url
        if (newImagesIndexList.length) {
          for (let i = 0; i < newImagesIndexList.length; i++) {
            const newImagesIndex = newImagesIndexList[i];
            notice.images[newImagesIndex] = res[resIndex].fileID
            resIndex += 1
          }
        }

        util.showLoading('上传公告中')
        //更新数据库
        wx.cloud.callFunction({
          name: 'dbUpdate',
          data: {
            table: 'notices',
            _id: notice._id,
            formData: notice,
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
      title: {
        required: true
      },
      content: {
        required: true
      },
      coverImg: {
        required: true
      },
      images: {
        required: true
      },
      org: {
        required: true
      },
      type: {
        required: true
      },
    }
    const messages = {
      type: {
        required: '请选择发布地区',
      },
      org: {
        required: '请选择公告来源',
      },
      title: {
        required: '请输入公告标题'
      },
      content: {
        required: '请输入公告内容'
      },
      coverImg: {
        required: '请添加公告封面'
      },
      images: {
        required: '请添加公告图片'
      },
    }
    this.WxValidate = new WxValidate(rules, messages)
  },
})
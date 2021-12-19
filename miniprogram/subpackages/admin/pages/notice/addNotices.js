import WxValidate from '../../../../utils/WxValidate.js'
const util = require('../../../../utils/util.js')
const db = wx.cloud.database()
const app = getApp()
var that

Page({
  data: {
    maxImgnum: 5,
    imageNum: 0,
    identity: {},
    typePicker: ['公共', '翔安', '思明', '海韵'],
    orgPicker: [],
    typePickerIndex: null,
    orgPickerIndex: null,
    form: {
      title: '',
      content: '',
      coverImg: '',
      date: '',
      org: '',
      images: [],
      type: '',
      hidden: false,
      top: false,
    }
  },
  onLoad: function (_options) {
    that = this
    that.initValidate()
    const identity = app.globalData.identity
    var canteens = app.globalData.canteen

    //按身份渲染
    if (identity.type !== 'superAdmin') {
      const addressToType = {
        XA: '翔安',
        SM: '思明',
        HY: '海韵'
      }
      for (let i = 0; i < canteens.length; i++) {
        const canteen = canteens[i]
        if (canteen.cID === identity.cID) {
          that.setData({
            'form.org': canteen.name,
            'form.type': addressToType[canteen.address],
            identity
          })
          break
        }
      }
    } else {
      var orgPicker = ['点餐项目组']
      canteens.forEach(canteen => {
        orgPicker.push(canteen.name)
      })
      that.setData({
        orgPicker,
        identity
      })
    }
  },
  onSwitchChange: function (e) {
    that.setData({
      'form.top': e.detail.value
    })
  },
  typePickerChange: function (e) {
    var index = e.detail.value
    var type = that.data.typePicker[index]
    that.setData({
      typePickerIndex: index,
      'form.type': type
    })
  },
  orgPickerChange: function (e) {
    var index = e.detail.value
    var org = that.data.orgPicker[index]
    that.setData({
      orgPickerIndex: index,
      'form.org': org
    })
  },
  chooseCoverImage: function (e) {
    wx.chooseImage({
        count: 1, //默认9
        sizeType: 'compressed'
      })
      .then(res => {
        that.setData({
          'form.coverImg': res.tempFilePaths[0],
        })
      })
      .catch(error => {
        util.showToast('图片选择取消')
      })
  },
  chooseImage: function (e) {
    const maxImgnum = that.data.maxImgnum
    var imageNum = that.data.imageNum
    var form = that.data.form
    wx.chooseImage({
        count: maxImgnum - imageNum, //默认9
        sizeType: 'compressed'
      })
      .then(res => {
        if (form.images.length != 0) {
          that.setData({
            'form.images': form.images.concat(res.tempFilePaths),
            imageNum: imageNum + res.tempFilePaths.length
          })
        } else {
          that.setData({
            'form.images': res.tempFilePaths,
            imageNum: imageNum + res.tempFilePaths.length
          })
        }
      })
      .catch(err => {
        util.showToast('图片选择取消')
      })
  },
  viewImage: function (e) {
    var id = e.currentTarget.dataset.index
    wx.previewImage({
      urls: [that.data.form.images[id]],
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
          form.images.splice(index, 1)
          imageNum -= 1
          that.setData({
            'form.images': form.images,
            imageNum: imageNum
          })
        }
      }
    })
  },
  viewcoverImage: function (e) {
    wx.previewImage({
      urls: [that.data.form.coverImg],
    });
  },
  delcoverImg: function (e) {
    wx.showModal({
      title: '移除图片',
      content: '确定要移除这张图片吗',
      cancelText: '否',
      confirmText: '是',
      success: res => {
        if (res.confirm) {
          that.setData({
            ['form.coverImg']: '',
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
    let form = that.data.form
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
          cloudPath: that.getRandomPath(params.coverImg),
          filePath: params.coverImg
        })
      )
      //其他图片
      params.images.forEach(img => {
        proList.push(
          wx.cloud.uploadFile({
            cloudPath: that.getRandomPath(img),
            filePath: img
          })
        )
      })
      Promise.all(proList).then(res => {
        util.showLoading('上传公告中')
        var images = []
        for (let i = 1; i < res.length; i++) {
          const imgRes = res[i];
          images.push(imgRes.fileID)
        }
        //图片上传成功再提交数据

        // 日期
        let date = new Date()
        let year = date.getFullYear()
        let month = (date.getMonth() + 1).toString().padStart(2, '0')
        let day = date.getDate().toString().padStart(2, '0')
        const dateStr = year + '-' + month + '-' + day

        //构建表单
        var newForm = Object.assign(params, {
          images: images,
          coverImg: res[0].fileID,
          date: dateStr,
        })

        db.collection('notices').add({
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
        digits: '请选择发布地区'
      },
      org: {
        required: '请选择公告来源',
        digits: '请选择公告来源'
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
  }
})
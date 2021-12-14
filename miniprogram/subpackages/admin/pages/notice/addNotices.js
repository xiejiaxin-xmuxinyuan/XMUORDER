// subpackages/admin/pages/notice/editNotices.js
import WxValidate from '../../../../utils/WxValidate.js'
const app = getApp()
const db = wx.cloud.database()
var that

Page({
  data: {
    isonShow : false,
    notices: [],
    maxImgnum: 5,
    imageNum: 0,
    picker: ['公共', '翔安', '思明','海韵'],
    org_picker: ['公共', '翔安', '思明','海韵', '点餐项目组'],
    form: {
      title: '',
      content: '',
      coverImg: '',
      date:'',
      org:'',
      images: [],
      type:'',
      hidden : '',
      icon : '',
      top : '',
      pickerIndex1: null,
      pickerIndex2: null
    }
  },
  onLoad: function (_options) {
    that = this
    that.initValidate()
    var notices = app.globalData.notices
    var imageNum = that.data.imageNum
    that.setData({
      notices: notices,
      imageNum: imageNum,
      'form.hidden' : false,
      'form.icon' : true,
      'form.top' : true
    })
  },
  onShow: function (_options) {
    if(this.data.isonShow){
      this.setData({
        isonShow: false
      })
			return;
    }
  },
  RegionPickerChange : function (e, setIndex = -1) {
    if (setIndex >= 0) {
      var index = setIndex
    } else {
      var index = e.detail.value
    }
    var type = that.data.picker[index]
    that.setData({
      ['form.pickerIndex1']: index,
      'form.type' : type
    })

  },
  OriginPickerChange : function (e, setIndex = -1) {
    if (setIndex >= 0) {
      var index = setIndex
    } else {
      var index = e.detail.value
    }
    var org = that.data.org_picker[index]
    that.setData({
      ['form.pickerIndex2']: index,
      'form.org' : org
    })

  },
  ChoosecoverImage: function (_e) {
    wx.chooseImage({
        count: 1, //默认9
        sizeType: 'compressed'
      })
      .then(res => {
        // TODO: 使用canvas进行压缩
        that.setData({
          ['form.coverImg']: res.tempFilePaths[0],
        })
      })
      .catch(_res => {
        wx.showToast({
          title: '图片选择取消',
          icon: 'none',
          duration: 1000
        })
      })
  },
  ChooseImage: function (_e) {
    that.setData({
      isonShow : true
    })
    var imageNum = that.data.imageNum
    var form = that.data.form
    wx.chooseImage({
        count: 1, //默认9
        sizeType: 'compressed'
      })
      .then(res => {
        // TODO: 使用canvas进行压缩
        imageNum += 1
        form.images.push(res.tempFilePaths[0])
        that.setData({
          form: form,
          imageNum: imageNum,
        })
      })
      .catch(_err => {
        wx.showToast({
          title: '图片选择取消',
          icon: 'none',
          duration: 1000
        })
      })
  },
  ViewImage: function (e) {
    var id = e.currentTarget.dataset.index
    wx.previewImage({
      urls: [that.data.form.images[id]],
    });
  },
  DelImg: function (e) {
    var id = e.currentTarget.dataset.index
    var form = that.data.form
    var imageNum = that.data.imageNum
    wx.showModal({
      title: '移除图片',
      content: '确定要移除这张图片吗',
      cancelText: '否',
      confirmText: '是',
      success: res => {
        if (res.confirm) {
          that.data.form.images.splice(id, 1)
          that.data.imageNum -= 1
          that.setData({
            form: that.data.form,
            imageNum: that.data.imageNum
          })
        }
      }
    })
  },
  ViewcoverImage: function (_e) {
    wx.previewImage({
      urls: [that.data.form.coverImg],
    });
  },
  DelcoverImg: function (_e) {
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
  editNoticesSubmit: function (e) {
    let form = that.data.form
    const params = Object.assign(form, e.detail.value)
    //表单验证
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
      var timestamp = Date.parse(new Date());
      var date = new Date(timestamp);
      //获取年份  
      var year =date.getFullYear();
      //获取月份  
      var month = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1);
      //获取当日日期 
      var day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate(); 
      var date = year.toString() + '-' + month.toString() + '-' + day.toString()
      //上传图片
      let picker = that.data.picker
      let org_picker = that.data.org_picker
      let type = picker[params.pickerIndex1]
      let org = org_picker[params.pickerIndex2]
      let cloudPath1 = '公告图片/'
      let imgtype1 = '封面'
      //储存路径：公告图片/地区名/_/时间戳.图片格式
      cloudPath1 = cloudPath1 + type + '/' +  imgtype1 + '/'  + 
        new Date().getTime() + params.coverImg.match('.[^.]+?$')[0]
        wx.cloud.uploadFile({
            cloudPath: cloudPath1,
            filePath: params.coverImg, // 文件路径
          })
          .then(res => {
            const coverImgID = res.fileID
            let cloudPath2 = '公告图片/'
            let imgtype2 = '内容'
            const images = params.images
            const cloudPath = []
            //储存路径：公告图片/地区名/内容/时间戳_i.图片格式
            images.forEach(function( _item, i) {
              cloudPath.push( cloudPath2 + type + '/' +  imgtype2 + '/'  + 
              new Date().getTime() + '_'  + i + images[i].match('.[^.]+?$')[0] )
            })
            const imagesPath = []
            var UploadImgs = [];
            let promiseArr = [];//创建一个数组来存储一会的promise操作
            for(var i =0; i < images.length ;i++){
              //往数据中push promise操作
              promiseArr.push(new Promise((reslove,reject)=>{
                //一个一个取出图片数组的临时地址
                let item = images[i];
                wx.cloud.uploadFile({
                  cloudPath: cloudPath[i],//上传至云端的路径
                  filePath: item,//小程序临时文件路径
                  success: res =>{
                    //执行成功的吧云存储的地址一个一个push进去
                    UploadImgs.push(res.fileID);
                    //如果执行成功，就执行成功的回调函数
                    reslove();
                      wx.hideLoading();
                      wx.showToast({
                        title: '上传成功',
                      });
                  },
                  fail: res=>{
                    wx.hideLoading()
                    wx.showToast({
                      title: '上传失败',
                    })
                  }
                  })
              }))
            }
            Promise.all(promiseArr).then(res=> { //等promose数组都做完后做then方法
              var newForm = {
                title: params.title,
                content: params.content,
                coverImg: coverImgID,
                date: date,
                org: org,
                images: UploadImgs,
                type: type,
                hidden : params.hidden,
                icon: params.icon,
                top : params.top
              }
              db.collection('notices').add({
                data: newForm
               })
               .then(_res => {
                wx.hideLoading()
                wx.showToast({
                  title: '提交成功',
                  icon: 'success',
                  duration: 1500
                })
                // 返回上一页
                setTimeout(() => {
                  wx.navigateBack()
                }, 1600);
              })
              .catch(_error => {

                wx.hideLoading()
                wx.showToast({
                  title: '数据提交失败',
                  icon: 'error',
                  duration: 2000
                })
              })
            })
          })
          .catch(_error => {
            wx.hideLoading()
            wx.showToast({
              title: '数据提交失败',
              icon: 'error',
              duration: 2000
            })
          })
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
      pickerIndex1: {
        required: true,
        digits: true
      },
      pickerIndex2: {
        required: true,
        digits: true
      },
      title: {
        required: true
      },
      content: {
        required: true
      },
      coverImg: {
        required: true
      },
      images:{
        required: true
      },

    }
    const messages = {
      pickerIndex1: {
        required: '请选择发布地区',
        digits: '请选择发布地区'
      },
      pickerIndex2: {
        required: '请选择发布来源',
        digits: '请选择发布来源'
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
// subpackages/admin/pages/notice/editNotices.js
import WxValidate from '../../../../utils/WxValidate.js'
const app = getApp()
const db = wx.cloud.database()
var that
Page({
  data: {
    notice: {},
    oldImg: '',
    oldImages: [],
    maxImgnum: 5,
    imageNum: 0,
    images: []
  },
  onLoad: function (options) {
    that = this
    that.initValidate()
    let index0 = options.index0
    var notice = app.globalData.notices[index0]
    console.log(notice)
    var imageNum = notice.images.length
    that.setData({
      notice: notice,
      index0: index0,
      imageNum: imageNum
    })
    
  },
  ChoosecoverImage: function (e) {
    wx.chooseImage({
        count: 1, //默认9
        sizeType: 'compressed'
      })
      .then(res => {
        // TODO: 使用canvas进行压缩
        
        that.setData({
          ['notice.coverImg']: res.tempFilePaths[0],
        })
      })
      .catch(res => {
        that.showT('图片选择取消')
      })
  },
  ChooseImage: function (e) {
    var id = e.currentTarget.dataset.idx
    var imageNum = that.data.imageNum
    var notice = that.data.notice
    var images = that.data.notice.images
    console.log(id)
    wx.chooseImage({
        count: 1, //默认9
        sizeType: 'compressed'
      })
      .then(res => {
        // TODO: 使用canvas进行压缩
        that.data.imageNum += 1
        that.data.notice.images.push(res.tempFilePaths[0])
        that.setData({
          notice: that.data.notice,
          images: that.data.notice.images,
          imageNum: that.data.imageNum,
          
        })
      })
      .catch(res => {
        that.showT('图片选择取消')
      })
  },
  ViewImage: function (e) {
    var id = e.currentTarget.dataset.idx
    wx.previewImage({
      urls: [that.data.notice.images[id]],
    });
  },
  DelImg: function (e) {
    var id = e.currentTarget.dataset.idx
    var images = that.data.notice.images
    var notice = that.data.notice
    var imageNum = that.data.imageNum
    console.log(id)
    wx.showModal({
      title: '移除图片',
      content: '确定要移除这张图片吗',
      cancelText: '否',
      confirmText: '是',
      success: res => {
        if (res.confirm) {
          images.splice(id, 1)
          that.data.imageNum -= 1
          that.setData({
            notice: that.data.notice,
            images : that.data.notice.images,
            oldImages: that.data.notice.images,
            imageNum: that.data.imageNum
          })
        }
      }
    })
  },
  ViewcoverImage: function (e) {
    wx.previewImage({
      urls: [that.data.notice.coverImg],
    });
  },
  DelcoverImg: function (e) {
    wx.showModal({
      title: '移除图片',
      content: '确定要移除这张图片吗',
      cancelText: '否',
      confirmText: '是',
      success: res => {
        if (res.confirm) {
          that.setData({
            ['notice.coverImg']: '',
            oldImg: that.data.notice.coverImg
          })
        }
      }
    })
  },
  editNoticesSubmit: function (e) {
    var notice = that.data.notice
    var params = Object.assign(notice, e.detail.value)
    var coverImg = that.data.notice.coverImg
    console.log(params)
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
      // oldImg <-> coverImg
      if (that.data.oldImg) {
        //上传图片
        let cloudPath = '公告图片/'
        let type = notice.type
        let imgtype = '封面'
        //储存路径：公告图片/地区名/封面/时间戳.图片格式
        cloudPath = cloudPath + type + '/' +  imgtype + '/'  + 
        new Date().getTime() + params.coverImg.match('.[^.]+?$')[0]
        wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: params.coverImg, // 文件路径
          })
          .then(res => {
            //修改为云图片路径
            params.coverImg = res.fileID
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
                        table: 'notices',
                        _id: notice._id,
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
      }
      else if(that.data.oldImages.length)
      {
        let cloudPath = '公告图片/'
        let type = notice.type
        let imgtype = '内容'
        //储存路径：公告图片/地区名/封面/时间戳.图片格式
          cloudPath = cloudPath + type + '/' +  imgtype + '/'  + 
          new Date().getTime() + params.images[0].match('.[^.]+?$')[0]
          console.log(params.images)
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: params.images, // 文件路径
          })
          .then(res => {
            if (res.result[0].status) {
              wx.hideLoading()
              that.showT('原图片删除出错')
            } 
            else {
              //更新数据库
              wx.cloud.callFunction({
                  name: 'dbUpdate',
                  data: {
                    table: 'notices',
                    _id: notice._id,
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
        
      }
      
      else 
      {
        //否则直接更新数据库
        wx.cloud.callFunction({
            name: 'dbUpdate',
            data: {
              table: 'notices',
              _id: notice._id,
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
            console.log(11111)
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
      title: {
        required: true
      },
      content: {
        required: true
      },
      coverImg: {
        required: true
      },
      date: {
        required: true
      },
      org:{
        required: true
      },
      images:{
        required: true
      }
    }
    const messages = {
      title: {
        required: '请输入公告标题'
      },
      content: {
        required: '请输入公告内容'
      },
      coverImg: {
        required: '请添加公告封面'
      },
      date: {
        required: '请添加时间'
      },
      images: {
        required: '请添加公告图片'
      },
      org:{
        required: '请添加发布者'
      }
    }
    this.WxValidate = new WxValidate(rules, messages)
  }
})
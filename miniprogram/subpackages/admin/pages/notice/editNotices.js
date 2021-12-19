import WxValidate from '../../../../utils/WxValidate.js'
const util = require('../../../../utils/util.js')
const app = getApp()
var that

Page({
  data: {
    notice: {},
    oldImg: '',
    oldImages: [],
    images: [],

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
    var notice = JSON.parse(options.notice)
    var imageNum = notice.images.length
    that.setData({
      notice: notice,
      imageNum: imageNum
    })
  },
  chooseCoverImage: function (e) {
    wx.chooseImage({
        count: 1, //默认9
        sizeType: 'compressed'
      })
      .then(res => {
        that.setData({
          ['notice.coverImg']: res.tempFilePaths[0],
        })
      })
      .catch(res => {
        util.showToast('图片选择取消')
      })
  },
  ChooseImage: function (e) {
    var id = e.currentTarget.dataset.idx
    var imageNum = that.data.imageNum
    var notice = that.data.notice
    var images = that.data.notice.images
    wx.chooseImage({
        count: 1, //默认9
        sizeType: 'compressed'
      })
      .then(res => {
        // TODO: 使用canvas进行压缩
        that.data.imageNum += 1
        that.data.notice.images.push(res.tempFilePaths[0])
        that.data.images.push(res.tempFilePaths[0])
        that.setData({
          notice: that.data.notice,
          images: that.data.notice.images,
          imageNum: that.data.imageNum,
          oldImages: that.data.notice.images
        })
      })
      .catch(res => {
        util.showToast('图片选择取消')
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
            images: that.data.notice.images,
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
    //表单验证
    if (!that.WxValidate.checkForm(params)) {
      const error = that.WxValidate.errorList[0]
      util.showToast(error.msg)
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
        let imgtype = '封面'
        let type = notice.type
        //储存路径：公告图片/地区名/封面/时间戳.图片格式
        cloudPath = cloudPath + type + '/' + imgtype + '/' +
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
                  util.showToast('封面图片删除出错')
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
                        util.showToast('保存成功', 'success', 1500)
                        //返回上一页
                        setTimeout(() => {
                          wx.navigateBack()
                        }, 1600);
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
      } else if (that.data.oldImages.length) {
        let cloudPath2 = '公告图片/'
        let imgtype2 = '内容'
        let type = notice.type
        const images = params.images
        const cloudPath = []
        //储存路径：公告图片/地区名/封面/时间戳.图片格式
        images.forEach(function (_item, i) {
          cloudPath.push(cloudPath2 + type + '/' + imgtype2 + '/' +
            new Date().getTime() + '_' + i + images[i].match('.[^.]+?$')[0])
        })
        const imagesPath = []
        var UploadImgs = []
        let promiseArr = [] //创建一个数组来存储一会的promise操作
        for (var i = 0; i < params.images.length; i++) {
          //往数据中push promise操作
          //一个一个取出图片数组的临时地址
          let item = params.images[i];
          if (item[0] == 'c') {
            continue
          }
          promiseArr.push(new Promise((reslove, reject) => {
            //一个一个取出图片数组的临时地址
            wx.cloud.uploadFile({
              cloudPath: cloudPath[i], //上传至云端的路径
              filePath: item, //小程序临时文件路径
              success: res => {
                //执行成功的吧云存储的地址一个一个push进去
                UploadImgs.push(res.fileID);
                //如果执行成功，就执行成功的回调函数
                reslove();
                wx.hideLoading();
                wx.showToast({
                  title: '上传成功',
                });
              },
              fail: res => {
                wx.hideLoading()
                wx.showToast({
                  title: '上传失败',
                })
              }
            })
          }))

        }
        Promise.all(promiseArr).then(res => { //等promose数组都做完后做then方法
          var cnt = 0
          for (var i = 0; i < params.images.length; i++) {
            let item = params.images[i]
            if (item[0] == 'c') {
              continue
            } else {
              params.images.splice(i, 1, UploadImgs[cnt])
              cnt++
            }
          }
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
                //返回上一页
                setTimeout(() => {
                  wx.navigateBack()
                }, 1600)
              } else {
                util.showToast('数据提交失败', 'error', 1500)
              }
            })
            .catch(e => {
              util.showToast('数据提交失败', 'error', 1500)
            })
        })


      } else {
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
              util.showToast('保存成功', 'success', 1500)
              //返回上一页
              setTimeout(() => {
                wx.navigateBack()
              }, 1600);
            } else {
              util.showToast('数据提交失败', 'error', 1500)

            }
          })
          .catch(e => {
            util.showToast('数据提交失败', 'error', 1500)
          })
      }
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
      date: {
        required: true
      },
      org: {
        required: true
      },
      images: {
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
      org: {
        required: '请添加发布者'
      }
    }
    this.WxValidate = new WxValidate(rules, messages)
  }
})
// pages/infoForm/infoForm.js
const db = wx.cloud.database()
const app = getApp()
const util = require('../../../../utils/util.js')
var that


import WxValidate from '../../../../utils/WxValidate.js'
Page({
  /**
   * 页面的初始数据
   */
  data: {
    imgs: [],
    tapImgIndex: null,
    img: '',
    nickName: "",
    phoneNumber: "",
    showBox: false
  },

  onLoad: function (options) {
    that = this
    that.initWxValidate()

    // 静默获取头像列表
    db.collection('avatar').get().then(res => {
      var imgs = []
      for (let index = 0; index < res.data.length; index++) {
        const img = res.data[index]['url']
        imgs.push(img)
      }
      that.setData({
        imgs,
        img: imgs[0]
      })
    })
  },
  chooseImg: function (e) {
    that.setData({
      showBox: true
    })
  },
  tapImg: function (e) {
    const index = e.currentTarget.dataset.index
    that.setData({
      tapImgIndex: index
    })
  },
  changeImg: function (e) {
    const tapImgIndex = that.data.tapImgIndex
    const imgs = that.data.imgs
    if (tapImgIndex != null) {
      const img = imgs[tapImgIndex]
      that.setData({
        img,
        showBox: false
      })
    } else {
      util.showToast('请选择你要更换的头像')
    }
  },
  showHideBox: function (e) {
    if (e.type === 'hideBox') {
      that.setData({
        showBox: false
      })
    }
  },
  onSubmit: async function (e) {
    // 如果信息不完整或填写错误
    if (!that.WxValidate.checkForm(e.detail.value)) {
      const errMsg = that.WxValidate.errorList[0].msg
      util.showToast(errMsg)
      return
    }

    const userInfo = {
      name: e.detail.value.name,
      address: e.detail.value.address,
      phone: e.detail.value.phone,
      nickName: that.data.nickName,
      img: that.data.img
    }

    // 提示
    wx.showModal({
      title: '提醒',
      content: '每个微信账号只能绑定一次身份，请确认信息填写正确！',
      showCancel: true,
      success: res => {
        // 用户点击确认
        if (res.confirm) {
          util.showLoading('上传中')
          wx.cloud.callFunction({
            name: 'userRegistration',
            data: {
              isActive: true,
              phone: userInfo.phone,
              name: userInfo.name,
              address: userInfo.address,
              nickName: userInfo.nickName,
              img: userInfo.img,
              identity: {
                type: 'user'
              }
            }
          }).then(res => {
            wx.hideLoading()
            if (res.result.success) {
              for (const k in userInfo) {
                app.globalData[k] = userInfo[k]
              }
              // 更新登录状态
              app.globalData.isActive = true
              util.showToast('上传成功', 'success')
              setTimeout(() => {
                wx.redirectTo({
                  url: '../index/index'
                })
              }, 1000);
            } else {
              util.showToast('上传失败', 'error')
            }
          }).catch(err => {
            console.error(err)
            wx.hideLoading()
            util.showToast('上传失败', 'error')
          })
        }
      }
    })
  },
  getUserProfile: function (e) {
    util.showLoading('加载中')
    wx.getUserProfile({
      desc: '用于完善会员资料'
    }).then(res => {
      wx.hideLoading()
      let userInfo = res.userInfo
      that.setData({
        nickName: userInfo.nickName
      })
    }).catch(erro => {
      wx.hideLoading()
      util.showToast('获取失败', 'error')
    })
  },
  getPhoneNumber: function (e) {
    // 用户拒绝
    if (e.detail.errMsg === "getPhoneNumber:fail user deny") {
      util.showToast('请绑定手机号后使用')
    } else {
      util.showLoading('获取中')
      wx.cloud.callFunction({
        name: "decodePhoneNumber",
        data: {
          phoneNumInfo: wx.cloud.CloudID(e.detail.cloudID),
        }
      }).then(res => {
        wx.hideLoading()
        if (res.result.success) {
          that.setData({
            phoneNumber: res.result.phoneNumber
          })
        } else {
          util.showToast('手机获取失败', 'error')
        }
      }).catch(err => {
        wx.hideLoading()
        util.showToast('手机获取失败', 'error')
      })
    }
  },
  initWxValidate: function () {
    const rules = {
      name: {
        required: true,
        minlength: 2
      },
      nickName: {
        required: true
      },
      address: {
        required: true,
        minlenght: 2
      },
      phone: {
        required: true,
        tel: true
      }
    }

    const messages = {
      name: {
        required: '请输入姓名！',
        minlength: '请输入正确的姓名！'
      },
      nickName: {
        required: '请点击获取昵称',
      },
      address: {
        required: '请输入地址！',
        minlength: '请输入正确的地址！'
      },
      phone: {
        required: '请绑定手机号码！',
        tel: '手机号码格式不正确'
      }
    }

    that.WxValidate = new WxValidate(rules, messages)
  }
})
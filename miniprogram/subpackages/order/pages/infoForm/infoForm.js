// pages/infoForm/infoForm.js
const db = wx.cloud.database()
const app = getApp()
var that
import WxValidate from '../../../../utils/WxValidate.js'
Page({
  /**
   * 页面的初始数据
   */
  data: {
    avatarUrl: "",
    nickName: "",
    phoneNumber: "",
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    that.initWxValidate()
  },

  onSubmit: async function (e) {
    // 如果信息不完整或填写错误
    if (!that.WxValidate.checkForm(e.detail.value)) {
      const errMsg = that.WxValidate.errorList[0].msg
      wx.showToast({
        title: errMsg,
        icon: "none"
      })
      return
    }

    let userInfo = {}
    userInfo.name = e.detail.value.name
    userInfo.address = e.detail.value.address
    userInfo.phone = e.detail.value.phone
    userInfo.nickName = that.data.nickName

    // 提示
    wx.showModal({
      title: '提醒',
      content: '每个微信账号只能绑定一次身份，请确认信息填写正确！',
      showCancel: true,
      success: res => {
        // 用户点击确认
        if (res.confirm) {
          wx.showLoading({
            title: '上传中',
            mask: true
          })
          app.globalData.name = userInfo.name,
          app.globalData.userID = userInfo.userID,
          app.globalData.address = userInfo.address
          app.globalData.phone = userInfo.phone
          app.globalData.nickName = userInfo.nickName

          // 添加用户信息到集合 users 
          db.collection('users')
            .add({
              data: {
                phone: userInfo.phone, //that.data.phoneNumber,
                isActive: true,
                name: userInfo.name,
                address: userInfo.address,
                nickName: userInfo.nickName,
                identity: {type: 'user'}
              }
            })
            .then(() => {
              // 更新登录状态
              app.globalData.isActive = true
              wx.hideLoading()
              // 上传成功后，前往主页
              wx.showToast({
                title: '上传成功',
                icon: "success",
                duration: 1000
              }).then(res => {
                setTimeout(() => {
                  wx.redirectTo({
                    url: '../index/index'
                  })
                }, 1000);
              })
            })
            .catch(err => {
              console.error(err)
              wx.hideLoading()
              wx.showToast({
                title: '上传失败',
                icon: "error"
              })
            })
        }
      },
      fail: err => console.error(err)
    })

  },

  getUserProfile: function (e) {
    wx.getUserProfile({
        desc: '用于完善会员资料'
      })
      .then(res => {
        let userInfo = res.userInfo
        that.setData({
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        })
      })
      .catch(erro => {
        wx.showToast({
          title: '获取信息失败',
          icon: 'error',
          duration: 2000
        })
      })
  },

  /**
   * 调用云函数 getPhoneNumber 获取用户手机号码
   */
  getPhoneNumber: function (e) {
    // 用户拒绝
    if (e.detail.errMsg === "getPhoneNumber:fail user deny") {
      wx.showToast({
        title: '请绑定手机号后使用',
        icon: 'none',
        duration: 2000
      })
    } else {
      wx.showLoading({
        title: '获取中',
        mask: true
      })
      wx.cloud.callFunction({
        name: "decodePhoneNumber",
        data: {
          phoneNumInfo: wx.cloud.CloudID(e.detail.cloudID),
        }
      }).then(val => {
        wx.hideLoading()
        let res = val.result
        if (res.success) {
          that.setData({
            phoneNumber: res.phoneNumber
          })
        } else {
          wx.showToast({
            title: '获取手机号失败',
            icon: 'none',
            duration: 2000
          })
        }
      }).catch(err => {
        wx.hideLoading()
        wx.showToast({
          title: '获取手机号失败',
          icon: 'none',
          duration: 2000
        })
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
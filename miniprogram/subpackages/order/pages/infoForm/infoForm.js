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
    phoneNumber: "",
     // 控制获取手机号码时出现的 loading 图案
     showLoading: false,
     // 上传过程中使 提交 按钮无效
     subBtnDisabled: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    that.initWxValidate()
  },

  onSubmit: async function(e) {
    // e.detail.value.phone = that.data.phoneNumber
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
          })
          that.setData({subBtnDisabled: true})            
          app.globalData.name = userInfo.name,
          app.globalData.userID = userInfo.userID,
          app.globalData.address = userInfo.address
          app.globalData.phone = userInfo.phone
          
          // 添加用户信息到集合 users 
          db.collection('users')
            .add({
              data: {
                phone: userInfo.phone,//that.data.phoneNumber,
                isActive: true,
                name: userInfo.name,
                address : userInfo.address,
                identity : 'user'
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
                complete: () => {
                  wx.redirectTo({
                    url: '../index/index'
                  })
                }
              })
            })
            .catch(err => {
              console.error(err)
              wx.hideLoading()
              wx.showToast({
                title: '上传失败',
                icon: "error"
              })
              that.setData({subBtnDisabled: false})
            })
        }
      }, fail: err => console.error(err)
    })
    
  },

    /**
   * 调用云函数 getPhoneNumber 获取用户手机号码
   */
  getPhoneNumber: async function(e) {   
    console.log(e)
    // 用户拒绝
   if (e.detail.errMsg === "getPhoneNumber:fail user deny") {
     await wx.showToast({
       title: '必须绑定手机号！',
       icon: 'none',
       duration: 2000
     })
     return
   }
   that.setData({showLoading: true})
   wx.cloud.callFunction({
     name: "decodePhoneNumber",
     data: {
       phoneNumInfo: wx.cloud.CloudID(e.detail.cloudID), 
     }
   }).then(val => {
     if (val.result.success)
       that.setData({phoneNumber: val.result.phoneNumber})
     that.setData({showLoading: false})
   }).catch(err => {
     console.error(err)
     that.setData({showLoading: false})
   })
 },
  initWxValidate: function() {
    const rules = {
      name: {
        required: true,
        minlength: 1
      },
      address : {
        required : true,
        minlenght : 1
      },
      phone: {
        required: true
      }
    }

    const messages = {
      name: {
        required: '请输入姓名！',
        minlength: '请输入正确的姓名！'
      },
      address: {
        required: '请输入地址！'
      },
      phone: {
        required: '请绑定手机号码！'
      }
    }

    that.WxValidate = new WxValidate(rules, messages)
  }
})
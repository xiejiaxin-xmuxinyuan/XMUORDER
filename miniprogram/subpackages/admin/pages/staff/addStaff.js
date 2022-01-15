// subpackages/admin/pages/staff/addStaff.js
const app = getApp()
var that
const util = require('../../../../utils/util.js')

Page({
  data: {
    searchName: '',
    searchPhone: '',
    user: null,
    identity: {},
    shopPickerIndex: null,
    shopPickerList: [],
  },
  onLoad: function (options) {
    that = this
    const identity = app.globalData.identity
    var canteens = app.globalData.canteens

    // 构建setData对象
    var data = {
      identity
    }

    var shopPickerList = []
    canteens.forEach((canteen, index) => {
      if (identity.type !== 'superAdmin' && canteen.cID === identity.cID) {
        data.shopPickerIndex = index
      }
      shopPickerList.push(canteen.name)
    })
    data.shopPickerList = shopPickerList

    that.setData(data)
  },
  strJudge(str) {
    return /^[\u4E00-\u9FA5A-Za-z0-9]+$/.test(str)
  },
  searchStaff: function (e) {
    util.showLoading('搜索中')
    const name = e.detail.value.name
    const phone = e.detail.value.phone

    if (!that.strJudge(name)) {
      util.showToast('请输入正确的姓名')
      return
    }
    if (!that.strJudge(phone)) {
      util.showToast('请输入正确的电话')
      return
    }

    util.showLoading('加载中')
    wx.cloud.callFunction({
        name: 'searchUser',
        data: {
          name,
          phone
        }
      }).then(res => {
        util.hideLoading()
        if (res.result.success) {
          util.showToast('查询成功', 'success')
          var user = res.result.user
        } else {
          util.showToast('未查询到相关用户')
          var user = null
        }
        that.setData({
          user
        })
      })
      .catch(e => {
        util.hideLoading()
        util.showToast('查询失败', 'error')
        that.setData({
          user: null
        })
      })
  },
  shopPickerChange: function (e) {
    //若选择项不变
    const index = e.detail.value
    that.setData({
      shopPickerIndex: index,
    })
  },
  addStaff: function (e) {
    const shopPickerIndex = that.data.shopPickerIndex
    if (shopPickerIndex === null) {
      util.showToast('请选择要添加到的商店')
      return
    }

    const user = that.data.user
    const identity = that.data.identity
    const type = e.currentTarget.dataset.type
    const cID = app.globalData.canteens[shopPickerIndex].cID

    if (identity.type === 'superAdmin') { //超管进行设置
      var cName = '无'
      //是否原有cID
      if ('cID' in user.identity) {
        cName = '不存在餐厅'
        //检索该cID对应餐厅
        let canteens = app.globalData.canteens
        for (let index = 0; index < canteens.length; index++) {
          if (user.identity.cID === canteens[index].cID) {
            cName = canteens[index].name
            break
          }
        }
      }

      wx.showModal({
        title: '设置该用户为' + (type === 'member' ? '员工' : '管理员') + '?',
        content: '原身份：' + user.identity.type + '，原餐厅：' + cName,
        success(res) {
          if (res.confirm) {
            util.showLoading('添加中')
            wx.cloud.callFunction({
                name: 'dbUpdate',
                data: {
                  table: 'users',
                  _id: user._id,
                  set: true,
                  path: 'identity',
                  formData: {
                    type,
                    cID
                  }
                }
              }).then(res => {
                util.hideLoading()
                if (res.result.success) {
                  util.showToast('设置成功', 'success', 2000)
                } else {
                  util.showToast('设置失败', 'error')
                }
                setTimeout(() => {
                  that.getOpenerEventChannel().emit('refresh')
                  wx.navigateBack()
                }, 2000)
              })
              .catch(e => {
                util.hideLoading()
                util.showToast('加载失败', 'error')
              })
          } else {
            util.showToast('操作已取消')
          }
        }
      })
    } else {
      if (user.identity.type !== 'user') { //若查询到的不是普通用户,则不允许修改
        util.showToast('该用户不可添加为当前商店员工')
        return
      }
      wx.showModal({
        title: '提示',
        content: '确认添加' + user.name + '为员工吗？',
        success(res) {
          if (res.confirm) {
            util.showLoading('添加中')
            wx.cloud.callFunction({
                name: 'dbUpdate',
                data: {
                  table: 'users',
                  _id: user._id,
                  set: true,
                  path: 'identity',
                  formData: {
                    type: 'member',
                    cID
                  }
                }
              }).then(res => {
                util.hideLoading()
                if (res.result.success) {
                  util.showToast('添加成功', 'success', 2000)
                } else {
                  util.showToast('添加失败', 'error', 2000)
                }
                setTimeout(() => {
                  that.getOpenerEventChannel().emit('refresh')
                  wx.navigateBack()
                }, 2000)
              })
              .catch(e => {
                util.hideLoading()
                util.showToast('加载失败', 'error', 2000)
              })
          } else {
            util.showToast('操作已取消')
          }
        }
      })

    }
  },
})
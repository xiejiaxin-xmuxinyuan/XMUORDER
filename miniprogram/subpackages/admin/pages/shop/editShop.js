// subpackages/admin/pages/shop/editShop.js
Page({

  /**
   * 页面的初始数据
   */
  data: {

  },

  onLoad: function (options) {

  },
  delShop: function (e) {
    var index0 = e.currentTarget.dataset.index
    var canteen = that.data.canteens[index0]
    var canteenCurrPage = that.data.canteenCurrPage
    const identity = app.globalData.identity
    if (identity.type !== 'superAdmin') {
      util.showToast('您没有该餐厅的删除权限')
      return
    }
    wx.showModal({
      title: '提示',
      content: '确认删除吗？',
      success(res) {
        if (res.confirm) {
          util.showLoading('正在删除餐厅')
          let _id = canteen._id
          // 商店数据
          var p0 = wx.cloud.callFunction({
            name: 'dbMove',
            data: {
              table: 'canteen',
              _id: _id
            }
          })
          // 商店图片
          var fileIDs = canteen.image
          fileIDs.push(canteen.thumb)
          //云函数无视权限删除图片
          var p1 = wx.cloud.callFunction({
            name: 'cloudFilesDelete',
            data: {
              fileIDs
            }
          })
          Promise.all([p0, p1]).then(res => {
            // 不考虑图片删除结果
            if (res[0].result.success) {
              that.getCanteens(canteenCurrPage).then(() => {
                wx.hideLoading()
                util.showToast('删除成功', 'success', 1500)
              })
            } else {
              wx.hideLoading()
              util.showToast('删除失败', 'error', 2000)
            }
          })
        }
      }
    })
  },

})
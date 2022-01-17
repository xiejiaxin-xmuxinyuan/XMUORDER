// subpackages/admin/pages/feedback/feedback.js
var that
const app = getApp()
const db = wx.cloud.database()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    feedbacks: []
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
    var cID = app.globalData.identity.cID
    db.collection('userFeedbacks').where({
        cID: cID
      })
      .get()
      .then(res => {
        that.setData({
          feedbacks: res.data
        })
      })
  },
  dealFeedback: function (e) {
    var index = e.currentTarget.dataset.index
    var feedbacks = that.data.feedbacks
    if (!feedbacks[index].refund) {
      wx.showModal({
        title: '反馈',
        editable: true,
        showCancel: false,
        placeholderText: '请输入意见内容',
        success(res) {
          console.log(res)
          if (res.confirm) {
            wx.showToast({
              title: '已接受',
              icon: 'success'
            })
            feedbacks[index].canteenFeedback = res.content
            feedbacks[index].state = 1
            var identity = feedbacks[index]._id
            var canteenFeedback = feedbacks[index].canteenFeedback
            var state = feedbacks[index].state
            wx.cloud.callFunction({
              name: 'dealFeedback',
              data: {
                identity: identity,
                canteenFeedback: canteenFeedback,
                state: state
              },
            })
          }
        }
      })
    } else {
      wx.showModal({
        title: '退款',
        cancelText: '拒绝退款',
        confirmText: '确认退款',
        success(res) {
          if (res.confirm) {
            that.refund()
            feedbacks[index].canteenFeedback = '已退款',
            feedbacks[index].state = 1
          } else {
            wx.showModal({
              title: '拒绝理由',
              editable: true,
              placeholderText: '请输入拒绝理由',
              showCancel: false,
              success(Res) {
                if (Res.confirm) {
                  feedbacks[index].state = 1
                  wx.showToast({
                    title: '已处理',
                    icon: 'success'
                  })
                  var identity = feedbacks[index]._id
                  var canteenFeedback = feedbacks[index].canteenFeedback
                  var state = feedbacks[index].state
                  wx.cloud.callFunction({
                    name: 'dealFeedback',
                    data: {
                      identity: identity,
                      canteenFeedback: canteenFeedback,
                      state: state
                    },
                  })
                }
              }
            })
          }
        }
      })
    }
    that.setData({
      feedbacks: feedbacks
    })
  }
})
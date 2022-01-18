// subpackages/admin/pages/feedback/feedback.js
var that
const app = getApp()
const db = wx.cloud.database()
const util = require('../../../../utils/util.js')
Page({

  /**
   * 页面的初始数据
   */
  data: {
    feedbacks: [],
    stateTypes: ['已处理', '未处理'],
    stateCurr: '未处理',
    feedbackCurrPage: 1,
    feedbackTotalCount: 0,
    feedbackTotalPage: 0
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    that = this
  },
  onShow: function (options) {
    var cID = app.globalData.identity.cID
    db.collection('userFeedbacks').where({
        cID: cID
      })
      .orderBy('state', 'desc')
      .orderBy('date', 'asc')
      .get()
      .then(res => {
        that.setData({
          feedbacks: res.data
        })
      })
    util.showLoading('加载中')
    that.getFeedbacks(that.data.feedbackCurrPage, cID).then(() => {
      util.hideLoading()
    })
  },
  getFeedbacks: function (feedbackCurrPage = 1, cID, pageSize = 10, ) {
    return new Promise(async (resolve, reject) => {
      if (feedbackCurrPage < 1) {
        feedbackCurrPage = 1
      }
      const countResult = await db.collection('userFeedbacks').where({
        cID: cID
      }).count()
      const feedbackTotalCount = countResult.total
      const feedbackTotalPage = feedbackTotalCount === 0 ? 0 : feedbackTotalCount <= pageSize ? 1 : Math.ceil(feedbackTotalCount / pageSize)
      if (feedbackTotalCount === 0) { //如果没有任何记录
        that.setData({
          feedbacks: [],
          feedbackCurrPage: 1,
          feedbackTotalPage: 0,
          feedbackTotalCount: 0,
        })
        resolve()
        return
      }
      if (feedbackCurrPage > feedbackTotalPage) {
        feedbackCurrPage = feedbackTotalPage
      }
      db.collection('userFeedbacks')
        .where({
          cID: cID
        })
        .orderBy('state','desc')
        .orderBy('date','asc')
        .skip((feedbackCurrPage - 1) * pageSize).limit(pageSize)
        .get().then(res => {
          that.setData({
            feedbacks: res.data,
            feedbackCurrPage: feedbackCurrPage,
            feedbackTotalPage: feedbackTotalPage,
            feedbackTotalCount: feedbackTotalCount,
          })
          resolve()
          return
        })
    })
  },
  feedbackChangePage: function (e) {
    const currPage = that.data.feedbackCurrPage
    const totalPage = that.data.feedbackTotalPage
    if ('add' in e.currentTarget.dataset) { //增加
      if (currPage <= totalPage - 1) {
        util.showLoading('加载中')
        that.getCanteens(currPage + 1).then(() => {
          wx.hideLoading()
        })
      } else {
        util.showToast('已经是最后一页啦')
      }
    } else { //减少
      if (currPage > 1) {
        util.showLoading('加载中')
        that.getCanteens(currPage - 1).then(() => {
          wx.hideLoading()
        })
      } else {
        util.showToast('已经是第一页啦')
      }
    }
  },
  stateTypeSelect: function (e) {
    var stateType = e.currentTarget.dataset.name
    that.setData({
      stateCurr: stateType
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
          if (res.confirm) {
            util.showLoading('处理中')
            feedbacks[index].canteenFeedback = res.content
            feedbacks[index].state = 1
            var feedback = feedbacks[index]
            wx.cloud.callFunction({
              name: 'dbUpdate',
              data: {
                table: 'userFeedbacks',
                _id: feedback._id,
                formData: {
                  'canteenFeedback': feedback.canteenFeedback,
                  'state': feedback.state
                }
              },
              success(res) {
                if (res.success) {
                  util.hideLoading()
                  util.showToast('已接受')
                }
              }
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
            util.showLoading('处理中')
            wx.cloud.callFunction({
              name: 'payRefund',
              data: {
                outTradeNo: feedbacks[index].outTradeNo
              },
              success(RES) {
                if (RES.success) {
                  util.hideLoading()
                  feedbacks[index].canteenFeedback = '已退款',
                    feedbacks[index].state = 1
                  util.showToast('已退款', 'success')
                }
              }
            })
          } else {
            wx.showModal({
              title: '拒绝理由',
              editable: true,
              placeholderText: '请输入拒绝理由',
              showCancel: false,
              success(Res) {
                if (Res.confirm) {
                  feedbacks[index].state = 1
                  util.showLoading('处理中')
                  var feedback = feedbacks[index]
                  wx.cloud.callFunction({
                    name: 'dbUpdate',
                    data: {
                      table: 'userFeedbacks',
                      _id: feedback._id,
                      formData: {
                        'canteenFeedback': feedback.canteenFeedback,
                        'state': feedback.state
                      }
                    },
                    success(res) {
                      if (res.success) {
                        util.hideLoading()
                        util.showToast('已处理', 'success')
                      }
                    }
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
  },

})
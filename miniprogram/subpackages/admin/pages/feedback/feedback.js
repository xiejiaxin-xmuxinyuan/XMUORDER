// subpackages/admin/pages/feedback/feedback.js
var that
const app = getApp()
const db = wx.cloud.database()
const _ = db.command
const util = require('../../../../utils/util.js')
Page({
  data: {
    feedbacks: [],
    stateTypes: ['未处理', '已处理'],
    stateCurrIndex: 0,
    feedbackCurrPage: 1,
    feedbackTotalCount: 0,
    feedbackTotalPage: 0,
    shopPickerList: [],
    shopPickerIndex: null,
    showFbDetail: false,
    feedbackDetail: {}
  },

  onLoad: function (options) {
    that = this
    const identity = app.globalData.identity
    var shopPickerList = [] //餐厅名列表

    app.globalData.canteens.forEach((canteen, index) => {
      shopPickerList.push(canteen.name)
      // 身份所属餐厅
      if (identity.type !== 'superAdmin') {
        if (canteen.cID === identity.cID) {
          that.shopPickerChange(index)
        }
      }
    })
    that.setData({
      shopPickerList,
      identity
    })
  },
  showHideFeedback: function (e) {
    if (e.type === 'hideBox') {
      that.setData({
        showFbDetail: false
      })
    } else {
      const index = e.currentTarget.dataset.index
      const feedback = that.data.feedbacks[index]
      that.setData({
        showFbDetail: true,
        feedbackDetail: {
          feedback: feedback.feedback,
          canteenFeedback: feedback.canteenFeedback,
          refund: feedback.refund,
          state: feedback.state,
          index: index
        }
      })
    }
  },
  shopPickerChange: function (e) {
    if (typeof (e) === "number") { //非选择器触发
      var shopIndex = e
    } else { // 选择器触发
      if (that.data.shopPickerIndex === e.detail.value) { //若选择项不变
        return
      }
      var shopIndex = e.detail.value
    }
    shopIndex = parseInt(shopIndex)
    //加载对应餐厅对应状态的反馈（第一页）
    that.setData({
      shopPickerIndex: shopIndex
    })
    that.getFeedbacks(shopIndex, that.data.stateCurrIndex)
  },
  getFeedbacks: function (shopIndex, state, feedbackCurrPage = 1, pageSize = 5) {
    util.showLoading('加载中')
    const cID = app.globalData.canteens[shopIndex].cID

    return new Promise(async (resolve, reject) => {
      if (feedbackCurrPage < 1) {
        feedbackCurrPage = 1
      }
      const countResult = await db.collection('userFeedbacks').where({
        cID,
        state: state === 0 ? 0 : _.gt(0)
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
        wx.hideLoading()
        resolve()
        return
      }
      if (feedbackCurrPage > feedbackTotalPage) {
        feedbackCurrPage = feedbackTotalPage
      }
      db.collection('userFeedbacks').where({
          cID,
          state: state === 0 ? 0 : _.gt(0)
        })
        .orderBy('date', 'asc')
        .skip((feedbackCurrPage - 1) * pageSize).limit(pageSize)
        .get().then(res => {
          that.setData({
            feedbacks: res.data,
            feedbackCurrPage: feedbackCurrPage,
            feedbackTotalPage: feedbackTotalPage,
            feedbackTotalCount: feedbackTotalCount,
          })
          wx.hideLoading()
          resolve()
          return
        })
    })
  },
  feedbackChangePage: function (e) {
    const currPage = that.data.feedbackCurrPage
    const totalPage = that.data.feedbackTotalPage
    const shopIndex = that.data.shopPickerIndex
    const state = that.data.stateCurrIndex
    if ('add' in e.currentTarget.dataset) { //增加
      if (currPage <= totalPage - 1) {
        util.showLoading('加载中')
        that.getFeedbacks(shopIndex, state, currPage + 1)
      } else {
        util.showToast('已经是最后一页啦')
      }
    } else { //减少
      if (currPage > 1) {
        util.showLoading('加载中')
        that.getFeedbacks(shopIndex, state, currPage - 1)
      } else {
        util.showToast('已经是第一页啦')
      }
    }
  },
  stateTypeSelect: function (e) {
    var stateCurrIndex = e.currentTarget.dataset.index
    that.setData({
      stateCurrIndex
    })
    that.getFeedbacks(that.data.shopPickerIndex, stateCurrIndex)
  },
  denyRefund: function (e) {
    //关闭my-box
    that.showHideFeedback({
      type: 'hideBox'
    })

    var index = e.currentTarget.dataset.index
    var feedback = that.data.feedbacks[index]

    wx.showModal({
      title: '拒绝退款理由',
      editable: true,
      placeholderText: '请输入50字内拒绝理由',
      success(res) {
        if (res.confirm) {
          if (res.content.length > 50) {
            util.showToast('请输入50字符内回复内容！')
            return
          }
          util.showLoading('处理中')
          feedback.canteenFeedback = res.content
          feedback.state = 1
          wx.cloud.callFunction({
            name: 'dbUpdate',
            data: {
              table: 'userFeedbacks',
              _id: feedback._id,
              formData: {
                'canteenFeedback': feedback.canteenFeedback,
                'state': feedback.state
              }
            }
          }).then(res => {
            that.setData({
              ['feedbacks.[' + index + ']']: feedback
            })
            util.hideLoading()
            util.showToast('回复完成', 'success')
          })
        }
      }
    })
  },
  confirmRefund: function (e) {
    //关闭my-box
    that.showHideFeedback({
      type: 'hideBox'
    })
    var index = e.currentTarget.dataset.index
    var feedback = that.data.feedbacks[index]

    util.showLoading('处理中')
    //退款
    wx.cloud.callFunction({
      name: 'payRefund',
      data: {
        outTradeNo: feedback.outTradeNo
      }
    }).then(res => {
      if (res.result.success) {
        // 修改数据库
        feedback.canteenFeedback = '已退款'
        feedback.state = 2 //2 表示退款
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
        }).then(res => {
          that.setData({
            ['feedbacks.[' + index + ']']: feedback
          })
          util.hideLoading()
          util.showToast('退款完成', 'success')
        })
      } else { //云函数退款失败，可能是该订单无法退款
        util.showToast('退款失败', 'error')
        return
      }
    })
  },
  dealFeedback: function (e) {
    //关闭my-box
    that.showHideFeedback({
      type: 'hideBox'
    })

    var index = e.currentTarget.dataset.index
    var feedback = that.data.feedbacks[index]
    wx.showModal({
      title: '反馈',
      editable: true,
      placeholderText: '请输入50字内回复内容',
      success(res) {
        if (res.confirm) {
          if (res.content.length > 50) {
            util.showToast('请输入50字内回复内容！')
            return
          }
          util.showLoading('处理中')
          feedback.canteenFeedback = res.content
          feedback.state = 1
          wx.cloud.callFunction({
            name: 'dbUpdate',
            data: {
              table: 'userFeedbacks',
              _id: feedback._id,
              formData: {
                'canteenFeedback': feedback.canteenFeedback,
                'state': feedback.state
              }
            }
          }).then(res => {
            that.setData({
              ['feedbacks.[' + index + ']']: feedback
            })
            util.hideLoading()
            util.showToast('回复完成', 'success')
          })
        }
      }
    })
    return
  },
})
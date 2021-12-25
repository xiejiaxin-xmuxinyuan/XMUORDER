// subpackages/admin/pages/staff/addStaff.js
import WxValidate from '../../../../utils/WxValidate.js'
const app = getApp()
const db = wx.cloud.database()
var that
const util = require('../../../../utils/util.js')
Page({
  data: {
    inputVal: '',
    isAdded: false,
    target: [],
    canteens: [],
    shopPickerList: [],
    canteenID: { },
    shopPickerIndex: null,
    form: {
      shopPickerIndex: null
    }
  },
  onLoad: function (options) {
    that = this
    that.initValidate()
    var isAdded = false
    var canteens = app.globalData.canteen
    var shopPickerList = []
    var canteenID = {}
    canteens.forEach((canteen, index) => {
      shopPickerList.push(canteen.name)
      canteenID[canteen.name] = canteen.cID
      // 身份所属餐厅
    })
    that.setData({
      isAdded: isAdded, 
      canteens: canteens,
      shopPickerList: shopPickerList,
      canteenID: canteenID
    })
  },
  shopPickerChange: function (e, setIndex = -1) {
    util.showLoading('加载中')
    setTimeout(() => {
      util.hideLoading()
    }, 450);
    //若选择项不变
    if (e!==null){
      if (that.data.shopPickerIndex === e.detail.value) {
        return
      }

  
    }
    if (setIndex >= 0) {
      var index = setIndex
    } else {
      var index = e.detail.value
    }
    that.setData({
      shopPickerIndex: index,
      ['form.shopPickerIndex']: index,
    })
  },
  getStaffData : function(e) {
    that.data.inputVal = e.detail.value,
    that.setData({
      inputVal:  that.data.inputVal
    })
   },
   judgeName: function(e) {
    if (!(/^[\u4E00-\u9FA5A-Za-z]+$/.test(e))) 
       return false
    else return true
   },
   judgePhone: function(e){
    if (!(/^[0-9]*$/.test(e)))
       return false
    else return true
   },
   addStaffSubmit: function (e) {
    let form = that.data.form
    const params = Object.assign(form, e.detail.value)
    //表单验证
    if (!that.WxValidate.checkForm(params)) {
      const error = that.WxValidate.errorList[0]
      util.showToast('数据提交失败', 'error', '1000')
    } 
    else 
    {
      util.showLoading('上传中')
      //上传图片
      var canteenID = that.data.canteenID
      var target = that.data.target
      let shopPickerList = that.data.shopPickerList
      let canteen = shopPickerList[params.shopPickerIndex]
      let staffcID = canteenID[canteen] 
      let key = "cID"
      target[0].identity["type"] = "staff"
      target[0].identity[key] = staffcID
      let _id = that.data.target[0]._id
        wx.cloud.callFunction({
          name: 'dbUpdate',
          data: {
            table: 'users',
            _id: _id,
            formData: target[0],
           set: true
        }
      })
      .then(res => {
        util.hideLoading()
        if (res.result.success) {
          util.showToast('新增成功', 'success', 1500)
         // 返回上一页
         setTimeout(() => {
          wx.navigateBack()
          }, 1600);
        } 
        else {
          util.showToast('数据提交失败', 'error', 1500)
        }
      })
      .catch(e => {
        util.showToast('数据提交失败', 'error', 1500)
        util.hideLoading()
      })
    }
  },
  searchStaff : function(e) {
    var canteenID = that.data.canteenID
    var val = that.data.inputVal
    wx.showLoading({
      title: '正在搜索中',
    })
    setTimeout(function () {
      wx.hideLoading()
    }, 500)
    if( !(that.judgeName(val)) && !(that.judgePhone(val)) )
    {
      util.showToast('请输入正确的姓名或电话')
      return;
    }
    else
    {
      db.collection('users').where({
        //使用正则查询，实现对搜索的模糊查询
        // 先对姓名进行查询
        name: val
      }).limit(10).get({
        success: res => {
          var target = that.data.target
          that.data.target = res.data
          target = res.data
          that.setData({
            target: that.data.target,
          })
          if(!(Object.keys(target).length))
          {
            // 再对电话进行查询
            db.collection('users').where({
              phone: val
            }).limit(10).get({
              success: res => {
                that.data.target = res.data
                target = res.data
                that.setData({
                  target: that.data.target,
                })
                if(!(Object.keys(target).length))
                {
                  util.showToast('未查询到此用户', 'error')
                  return;
                }
                wx.showModal({
                title: '提示',
                content: '确认添加为员工吗？',
                success(res){
                  if(res.confirm){
                    wx.showLoading({
                     title: '正在添加员工',
                     mask: true
                   })
                   wx.hideLoading()
                   if(target[0].identity.type === "staff" )
                   {
                     util.showToast('此人已为员工', 'error')
                     return;
                   }
                   that.setData({
                     isAdded: true
                   })
                   
                }
                else if (res.cancel) {
                  util.showToast('操作已取消')
                }
               }
              })
              }
            })
          }
          else
          {
            wx.showModal({
              title: '提示',
              content: '确认添加为员工吗？',
              success(res){
                if(res.confirm){
                  //云函数数据库更新 pull
                  wx.showLoading({
                   title: '正在添加员工',
                   mask: true
                 })
                 wx.hideLoading()
                 if(target[0].identity.type === "staff" )
                 {
                   util.showToast('此人已为员工', 'error')
                   return;
                 }
                 that.setData({
                   isAdded: true
                 })
              }
              else if (res.cancel) {
                util.showToast('操作已取消')
              }
             }
            })
          }
        }
      })
    }
    
   },
   initValidate() { //表单验证规则和提示语
    const rules = {
      shopPickerIndex: {
        required: true,
        digits: true
      }
    }
    const messages = {
      shopPickerIndex: {
        required: '请选择员工所在餐厅',
        digits: '请选择员工所在餐厅'
      }
    }
    this.WxValidate = new WxValidate(rules, messages)
  }
  
})
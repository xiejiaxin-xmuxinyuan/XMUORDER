// subpackages/admin/pages/staff/staff.js
const util = require('../../../../utils/util.js')
const app = getApp()
const db = wx.cloud.database()
var that
Page({
  data: {
    identity: {},
    canteens: [],
    shopPickerList: [],
    canteenID: {}, // 汉字对应拼音首字母
    users: [],
    staffList: [],
    canteenStaffNum: {}, // 记录餐厅的员工数
    shopPickerIndex: null,
    currPage: 0,
    totalPage: 1,
    loaded: false
  },

  onLoad: function (options) {
    that = this
    var canteens = app.globalData.canteen
    const identity = app.globalData.identity
    var shopPickerList = []
    var staffList = []
    var canteenStaffNum = {}
    var canteenID = {}
    canteens.forEach((canteen, index) => {
      shopPickerList.push(canteen.name)
      let key = canteen.name
      canteenID[key] = canteen.cID
      canteenStaffNum[canteen.cID] = 0
      // 身份所属餐厅
      if (identity.type === 'admin' || identity.type === 'member') {
        if (canteen.cID === identity.cID) {
          that.shopPickerChange(null, index)
        }
      }
    })
    var p1 = db.collection("canteen").get()
    var p2 = that.getUsers() 
    Promise.all([p1, p2]).then(res =>{
      var users = res[1]
      users.forEach(element => {
        if (element.identity.type === 'staff' ) {
          let key = element.identity.cID
          canteenStaffNum[key] += 1
          staffList.push(element)
        }
      })
      console.log(staffList)
      console.log(canteenStaffNum)
      that.setData({
        users: users, //用户数据
        staffList: staffList,
        canteens: canteens,
        shopPickerList: shopPickerList,
        identity: identity,
        canteenID: canteenID,
        canteenStaffNum: canteenStaffNum
      })
    })
    
  },
  onShow: function (options) {
    that = this
    if (that.data.loaded) {
      console.log(2222222)
      console.log(that.data.loaded)
      const shopPickerIndex = that.data.shopPickerIndex
      if (shopPickerIndex === null ) {
        return
      }
      const cID = that.data.canteens[shopPickerIndex].cID
      const currPage = that.data.currPage
      that.loadPage(shopPickerIndex, cID, currPage)
    }
    
    
    
  },
  getUsers: async function () {
    const countResult = await db.collection('users').where({
      identity:{
        type : "staff"
      }
    }).count()
    const total = countResult.total
    // 计算需分几次取
    const MAX_LIMIT = 20
    const batchTimes = Math.ceil(total / MAX_LIMIT)
    const tasks = []
    for (let i = 0; i < batchTimes; i++) {
      let promise = db.collection('users').where({
        identity:{
          type : "staff"
        }
      }).skip(i * MAX_LIMIT).limit(MAX_LIMIT).get()
      tasks.push(promise)
    }
    if(tasks.length !== 0 ) 
    {
      const res = (await Promise.all(tasks)).reduce((acc, cur) => {
        return {
          users: acc.data.concat(cur.data)
        }
      })
      return res.data //返回数据
    }
    else 
      return []
  },

  shopPickerChange: function (e, setIndex = -1) {
    util.showLoading('加载中', 1500)
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
    //加载第一页的
    var cID = that.data.canteens[index].cID
    that.loadPage(index, cID, 1)
    that.setData({
      shopPickerIndex: index,
    })
  },
  shopTypePageChange: ( staff, currPage, totalPage) => {
    that.setData({
      currPage: currPage,
      totalPage: totalPage,
      staffList: staff,
      loaded: true
    })
  },
  loadPage: (shopPickerIndex, cID, currPage = 1, pageSize = 5) => {
    return new Promise((resolve, reject) => {
      util.showLoading('加载中')
      wx.cloud.callFunction({
          name: 'getCanteenStaffByType',
          data: {
            cID: cID,
            currPage: currPage,
            pageSize: pageSize
          }
        }).then(res => {
          util.hideLoading()
          if (res.result.success) {
            let currPage = res.result.currPage
            let totalPage = res.result.totalPage
            let staff = res.result.staff
            console.log(staff)
            //修改当前页数据
            that.shopTypePageChange(staff, currPage, totalPage)
            //保存page信息和类型选项
            that.setData({
              currPage: currPage,
              totalPage: totalPage,
              staffList: staff,
              loaded: true
            })
            resolve() //结束
          } else {
            util.showToast('加载失败', 'error')
            reject() //结束
          }
        })
        .catch(e => {
          util.hideLoading()
          util.showToast('加载失败', 'error')
          reject(e) //结束
        })
    })
  },
  changePage: function (e) {
    const dataset = e.currentTarget.dataset
    let currPage = that.data.currPage
    let totalPage = that.data.totalPage
    let shopPickerIndex = that.data.shopPickerIndex
    let cID = that.data.canteens[shopPickerIndex].cID
    if ('add' in dataset) { //增加
      if (currPage <= totalPage - 1) {
        that.loadPage(shopPickerIndex, cID, currPage + 1)
      } else {
        util.showToast('已经是最后一页啦')
      }
    } else { //减少
      if (currPage > 1) {
        that.loadPage(shopPickerIndex, cID, currPage - 1)
      } else {
        util.showToast('已经是第一页啦')
      }
    }
  },
  delStaff: function(e){
    var index = e.currentTarget.dataset.index
    var staff = that.data.staffList[index]
    var cID = staff.identity.cID
    var shopIndex = that.data.shopPickerIndex
    var currPage = that.data.currPage
    wx.showModal({
     title: '提示', 
     content: '确认删除吗？', 
     success(res){
       if(res.confirm){
         //云函数数据库更新 pull
         wx.showLoading({
          title: '正在删除员工',
          mask: true
        })
        let _id = staff._id
        wx.cloud.callFunction({
          name: 'dbMove',
          data: {
            table: 'users',
            _id: _id
          }
        })
        .then(res => {
          if (res.result.success) {
             that.data.staffList.splice(index, 1)
             setTimeout(function () {
              wx.hideLoading()
              that.setData({
                staffList : that.data.staffList
              })
              that.showT('删除成功', 'success', 1500)
              setTimeout(() => {
                that.loadPage(shopIndex, cID, currPage)
              }, 1600);
              
            }, 1100)
          } else {
            wx.hideLoading()
            that.showT('数据提交失败', 'error', 2000)
          }
        })
        .catch(error => {
          wx.hideLoading()
          that.showT('数据提交失败', 'error', 2000)
        })
     } else if (res.cancel) {
      that.showT('操作已取消')
    }
  }
   })
  },
  toAddStaff: function(e){
    wx.navigateTo({
      url: './addStaff',
    })
  },
  showT: (title, icon = 'none', duration = 1000) => {
    wx.showToast({
      title: title,
      icon: icon,
      duration: duration
    })
  },



 
})
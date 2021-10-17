// subpackages/admin/pages/goods/goods.js
const app = getApp()
const db = wx.cloud.database()
var that

Page({

  data: {

  },

  onLoad: function (options) {
    //营业期间禁止删除商品（避免点餐页刷新时商品排序错乱）
  },
  toAddGood: function(e){
    wx.navigateTo({
      url: './addGood',
    })
  }
})
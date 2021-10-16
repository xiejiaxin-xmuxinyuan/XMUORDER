// subpackages/admin/pages/goods/goods.js
const app = getApp()
const db = wx.cloud.database()
var that

Page({

  data: {

  },

  onLoad: function (options) {

  },
  toAddGood: function(e){
    wx.navigateTo({
      url: './addGood',
    })
  }
})
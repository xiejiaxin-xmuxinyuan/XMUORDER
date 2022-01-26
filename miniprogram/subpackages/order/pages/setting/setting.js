const app = getApp()
const db = wx.cloud.database()
const util = require('../../../../utils/util.js')
var that


Page({
    data: {
        user: {
            name: '名字',
            img: 'cloud://cloud1-4g4b6j139b4e50e0.636c-cloud1-4g4b6j139b4e50e0-1307666009/头像图片/images/avatar/0.jpg'
        },
        showBox: false,
        tapImgIndex: null
    },

    onLoad: function (options) {
        that = this
        db.collection('avatar').get().then(res => {
            var imgs = []
            for (let index = 0; index < res.data.length; index++) {
                imgs.push(res.data[index]['url'])
            }
            that.setData({
                imgs: imgs
            })
        })
    },
    chooseImg: function (e) {
        that.setData({
            showBox: true
        })
    },
    tapImg: function (e) {
        const index = e.currentTarget.dataset.index
        that.setData({
            tapImgIndex: index
        })
    },
    changeImg: function (e) {
        const tapImgIndex = that.data.tapImgIndex
        const imgs = that.data.imgs
        if (tapImgIndex != null) {
            util.showLoading('保存中')
            const img = imgs[tapImgIndex]

            db.collection('users').where({
                _openid: '$openid'
            }).update({
                data: {
                    img: img
                }
            }).then(res => {
                wx.hideLoading()
                util.showToast('头像修改成功！')
                this.setData(
                    {
                        showBox:false,
                        'user.img':img
                    }
                )
            })
        }
        else{
            util.showToast('请选择你要更换的头像')
        }
    },
    showHideBox: function (e) {
        if (e.type === 'hideBox') {
            that.setData({
                showBox: false
            })
        }
    }
})
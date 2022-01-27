const app = getApp()
const db = wx.cloud.database()
const util = require('../../../../utils/util.js')
var that


Page({
    data: {
        user: {},
        showBox: false,
        tapImgIndex: null
    },

    onLoad: function (options) {
        that = this
        that.setData({
            user: {
                name: app.globalData.name,
                nickName: app.globalData.nickName,
                phone: app.globalData.phone,
                address: app.globalData.address,
                identity: app.globalData.identity,
                img: app.globalData.img
            }
        })

        // 静默获取头像列表
        db.collection('avatar').get().then(res => {
            var imgs = []
            var tapImgIndex = null
            for (let index = 0; index < res.data.length; index++) {
                const img = res.data[index]['url']
                if (app.globalData.img === img) {
                    tapImgIndex = index
                }
                imgs.push(img)
            }
            that.setData({
                imgs,
                tapImgIndex
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
                this.setData({
                    showBox: false,
                    'user.img': img
                })
            })
        } else {
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
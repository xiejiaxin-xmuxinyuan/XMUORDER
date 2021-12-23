import WeCropper from '../../utils/we-cropper.js'
const util = require('../../utils/util.js')
var that

/**
 * 注意导航时使用wx.navigateTo的events字段开启页面间通信接口
 * 图片截取成功后进行页面通信，见：https://developers.weixin.qq.com/miniprogram/dev/api/route/wx.navigateTo.html
 * 发送通信事件如下
 *    const eventChannel = that.getOpenerEventChannel();
 *    eventChannel.emit('saveImg', {img: tempFilePath})
 * 
 * 页面传递参数：
 * src: 本地临时图片链接
 * w:裁剪后保存图片宽度px（默认450）
 * h:裁剪后保存图片高度px（默认225）
 * fileType: 保存图片格式jpg或png (默认'jpg')
 * quality:图片质量取值(0,1]，仅jpg格式时有效（默认1）
 */

Page({
  data: {
    ratio: 1, //图片需要再次放大重绘的倍数
    w: 450,
    h: 225,
    src: '',
    fileType: 'jpg',
    quality: 1,
    canvasW: 500,
    canvasH: 500
  },

  onLoad(option) {
    that = this
    that.cropperInit(option)
  },

  cropperInit: function (option) {
    util.showLoading('加载中')
    const device = wx.getSystemInfoSync()
    const deviceWidth = device.windowWidth
    const deviceHeight = device.windowHeight - 50

    var cropperOpt = {
      id: 'cropper', // 用于手势操作的canvas组件标识符
      targetId: 'targetCropper', // 用于用于生成截图的canvas组件标识符
      pixelRatio: device.pixelRatio, // 传入设备像素比
      scale: 8, // 最大双指缩放倍数
      boundStyle: {
        mask: 'rgba(102, 102, 102, 0.6)'
      }
    }

    const w = 'w' in option ? parseInt(option.w) : that.data.w
    const h = 'h' in option ? parseInt(option.h) : that.data.h
    //计算裁剪框
    const maxW = deviceWidth * 0.8
    const maxH = deviceHeight * 0.65

    var cutW, cutH, ratio
    if (w > h) { //若宽度更长（高度不可能溢出）
      cutW = maxW
      cutH = Math.round((cutW * (h / w)) * 100) / 100 //保留两位小数
      ratio = Math.round((w / cutW) * 100) / 100 //图片需要再次放大重绘的倍数
    } else {
      cutH = maxH
      cutW = Math.round((cutH * (w / h)) * 100) / 100
      if (cutW > maxW) { //此时宽度溢出，则还是采用最大宽度
        cutW = maxW
        cutH = Math.round((cutW * (h / w)) * 100) / 100
      }
      ratio = Math.round((w / cutW) * 100) / 100
    }

    cropperOpt.cut = {
      x: (deviceWidth - cutW) / 2, // 裁剪框x轴起点
      y: (deviceHeight - cutH) / 2,
      width: cutW, // 裁剪框宽度
      height: cutH
    }


    var formData = { //用于setData的对象
      ratio, //重绘倍数
      w,
      h,
      deviceWidth,
      deviceHeight
    }

    if ('src' in option) {
      formData.src = option.src
      cropperOpt.src = option.src
    }
    if ('fileType' in option) {
      formData.fileType = option.fileType
    }
    if ('quality' in option) {
      formData.quality = option.quality
    }
    //保存数据
    that.setData(formData)

    that.cropper = new WeCropper(cropperOpt)
      .on('ready', (ctx) => {
        wx.hideLoading()
      })
      .on('beforeImageLoad', (ctx) => {
        util.showLoading('图片压缩中')
      })
      .on('imageLoad', (ctx) => {
        wx.hideLoading()
      })
  },

  cropperTouchStart(e) {
    that.cropper.touchStart(e)
  },
  cropperTouchMove(e) {
    that.cropper.touchMove(e)
  },
  cropperTouchEnd(e) {
    that.cropper.touchEnd(e)
  },
  uploadTap() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const src = res.tempFilePaths[0]
        that.setData({
          src
        })
        that.cropper.pushOrign(src)
      }
    })
  },
  getCropperImage() {
    util.showLoading('保存中')
    that.redrawImg().then(imgPath => {
      const eventChannel = that.getOpenerEventChannel();
      eventChannel.emit('saveImg', {
        img: imgPath
      })
      wx.hideLoading()
      wx.navigateBack()
    }).catch(e => {
      console.error(e)
      wx.hideLoading()
      util.showToast('保存失败', 'error', 2000)
    })
  },
  redrawImg() {
    return new Promise((resolve, reject) => {
      const ratio = that.data.ratio //图片需要再次放大重绘的倍数
      const src = that.data.src
      const fileType = that.data.fileType
      const quality = that.data.quality

      let {
        imgLeft,
        imgTop,
        scaleWidth,
        scaleHeight
      } = that.cropper // 获取图片在原画布坐标位置及宽高

      let {
        x,
        y,
        width,
        height
      } = that.cropper.cut // 获取裁剪框位置及大小

      // 所有参数乘设备像素比
      imgLeft = imgLeft * ratio
      imgTop = imgTop * ratio
      scaleWidth = scaleWidth * ratio
      scaleHeight = scaleHeight * ratio
      x = x * ratio
      y = y * ratio

      width = that.data.w
      height = that.data.h

      const func = () => {
        try {
          const ctx = wx.createCanvasContext('redraw') // 用旧接口避坑
          ctx.drawImage(src, imgLeft, imgTop, scaleWidth, scaleHeight)
          ctx.draw(false, () => {
            wx.canvasToTempFilePath({
              canvasId: 'redraw',
              x,
              y,
              width,
              height,
              fileType,
              quality
            }).then(res => {
              const tmpPath = res.tempFilePath
              resolve(tmpPath)
              return
            })
          })
        } catch (err) {
          reject(err)
          return
        }
      }

      // 保证重绘画布足够大
      that.setData({
        canvasW: Math.round(imgLeft + scaleWidth + 100),
        canvasH: Math.round(imgTop + scaleHeight + 100),
      }, () => {
        //保证画布已重新渲染大小
        setTimeout(func, 100);
      })
    })
  }
})
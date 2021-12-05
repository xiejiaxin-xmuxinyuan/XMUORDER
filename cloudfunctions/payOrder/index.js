/**
 * 云函数下单
 * 调用统一下单接口后，将订单保存到数据库
 * 
 * 参数： 
 *    order: 统一下单所需参数
 *      {subMchId: 商户号
 *      body: 商品描述(如: "南光餐厅-订餐")  有要求格式：商家名称-销售商品类目
 *      totalFee: 价格（单位为分）}
 *    orderInfo: object 订单其他相关信息
 * 
 * 返回： object 
 *        成功：{success: ture, outTradeNo: 订单号, payment: 小程序调用支付所需所有参数}
 *        失败：{success: false, (视情况返回)returnMsg: 错误信息, （视情况）toastMsg: 用于showToast的消息}
 */

const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

//返回14位字符串日期20210102030405
function getStrDate(date) {
  let year = date.getFullYear()
  let month = (date.getMonth() + 1).toString().padStart(2, '0')
  let day = date.getDate().toString().padStart(2, '0')
  let hour = date.getHours().toString().padStart(2, '0')
  let min = date.getMinutes().toString().padStart(2, '0')
  let sec = date.getSeconds().toString().padStart(2, '0')
  return year + month + day + hour + min + sec
}

// 返回长度为4位的随机字母字符串
function getRandomStr() {
  return Math.random().toString(36).slice(-4)
}

function getTradeNo(date) {
  var tradeNo = getStrDate(date) + '**' //长度16位
  for (let index = 0; index < 4; index++) {
    tradeNo += getRandomStr()
  }
  return tradeNo
}

function strDateFormat(strDate) { //14位日期转yyyy-MM-dd hh:mm:ss
  var regExp = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/;
  var formatTime = '$1-$2-$3 $4:$5:$6';
  return strDate.replace(regExp, formatTime)
}

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {

  try {
    const wxContext = cloud.getWXContext()

    var orderInfo = event.orderInfo

    const outTradeNo = getTradeNo(new Date())
    const subMchId = event.order.subMchId
    const body = event.order.body
    const totalFee = event.order.totalFee

    var dbRes

    //读取库存判断
    let proList = []
    let record = orderInfo.goodsInfo.record
    for (let index = 0; index < record.length; index++) {
      const food = record[index]
      proList.push(
        new Promise((resolve, reject) => {
          db.collection('food').doc(food._id).get().then(res => {
            resolve({
              curNum: res.data.curNum,
              num: food.num,
              _id: food._id
            })
          }).catch(err => {
            reject(err)
          })
        }))
    }

    try {
      dbRes = await Promise.all(proList)
      for (let index = 0; index < dbRes.length; index++) {
        const data = dbRes[index]
        if (data.curNum < data.num) {
          return {
            success: false,
            toastMsg: '库存不足'
          }
        }
      }
    } catch (error) {
      console.log(error)
      return {
        success: false,
        returnMsg: '库存读取失败'
      }
    }

    //似乎不支持promise
    const res = await cloud.cloudPay.unifiedOrder({
      functionName: "payCallback", //支付成功后回调函数
      envId: 'cloud1-4g4b6j139b4e50e0', //云开发中复制
      subMchId: subMchId,
      body: body,
      outTradeNo: outTradeNo,
      totalFee: totalFee, //单位为分
      spbillCreateIp: '127.0.0.1', //不方便获取
      openid: wxContext.OPENID
    })

    if (res.resultCode !== 'SUCCESS' || res.returnCode !== 'SUCCESS') {
      return {
        success: false,
        returnMsg: res.returnMsg,
        toastMsg: '统一下单失败'
      }
    } else { //下单成功
      //减少库存
      let proList2 = []
      dbRes.forEach(data => {
        proList2.push(
          db.collection('food').doc(data._id).update({
            data: {
              curNum: _.inc(-data.num),
              allNum: _.inc(-data.num)
            }
          })
        )
      })

      try {
        await Promise.all(proList2)
      } catch (err) {
        console.error(err)
        return {
          success: false,
          toastMsg: '库存出错'
        }
      }

      //保存订单
      orderInfo.userInfo.openid = wxContext.OPENID
      orderInfo.orderInfo.timeInfo.createTime = outTradeNo.substr(0, 14)
      orderInfo.orderInfo.timeInfo.formatedTime = strDateFormat(orderInfo.orderInfo.timeInfo.createTime)
      orderInfo.orderInfo.outTradeNo = outTradeNo

      await db.collection('orders').add({
        data: orderInfo
      })



      //若有需要res中其他信息再修改下方
      return {
        success: true,
        payment: res.payment,
        outTradeNo: outTradeNo
      }
    }
  } catch (e) {
    console.error(e)
    return {
      success: false
    }
  }
}
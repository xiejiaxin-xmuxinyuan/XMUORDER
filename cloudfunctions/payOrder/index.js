/**
 * 云函数统一下单
 * 参数： 
 *    subMchId: 商户号
 *    body: 商品描述(如: "南光餐厅-打包")  有要求格式：商家名称-销售商品类目
 *    detail: 订单详情（如: "商品详情：打包服务"）
 *    totalFee: 价格（单位为分）
 * 
 * 返回： object 
 *        成功：{success: ture, outTradeNo: 订单号, payment: 小程序调用支付所需所有参数}
 *        失败：{success: false, returnMsg: 错误信息}
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

// 返回长度为4位的字符串
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

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  const outTradeNo = getTradeNo(new Date())
  const subMchId = event.subMchId
  const body = event.body
  const detail = event.detail
  const totalFee = event.totalFee

  //似乎不支持promise
  const res = await cloud.cloudPay.unifiedOrder({
    functionName: "payCallback", //支付成功后回调函数
    envId: 'cloud1-4g4b6j139b4e50e0', //云开发中复制
    subMchId: subMchId,
    body: body,
    detail: detail,
    outTradeNo: outTradeNo,
    totalFee: totalFee, //单位为分
    spbillCreateIp: '127.0.0.1', //不方便获取
    openid: wxContext.OPENID
  })

    if ( res.resultCode!== 'SUCCESS' || res.returnCode !== 'SUCCESS') {
      return {
        success: false,
        returnMsg: res.returnMsg
      }
    } else {
      //若有需要res中其他信息再修改下方
      return {
        success: true,
        payment: res.payment,
        outTradeNo: outTradeNo
      }
    }
}
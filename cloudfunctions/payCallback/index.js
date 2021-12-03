/**
文档：https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=9_7&index=8
实践：https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=23_9&index=1

 注意：
1、同样的通知可能会多次发送给商户系统。商户系统必须能够正确处理重复的通知。
2、后台通知交互时，如果微信收到商户的应答不符合规范或超时，微信会判定本次通知失败，重新发送通知，直到成功为止（在通知一直不成功的情况下，微信总共会发起多次通知，通知频率为15s/15s/30s/3m/10m/20m/30m/30m/30m/60m/3h/3h/3h/6h/6h - 总计 24h4m）这里通知发送可能会多台服务器进行发送，且发送时间可能会在几秒内，但微信不保证通知最终一定能成功。
3、在订单状态不明或者没有收到微信支付结果通知的情况下，建议商户主动调用微信支付【查询订单API】确认订单状态。


特别提醒：
1、商户系统对于支付结果通知的内容一定要做签名验证,并校验返回的订单金额是否与商户侧的订单金额一致，防止数据泄露导致出现“假通知”，造成资金损失。

2、当收到通知进行处理时，首先检查对应业务数据的状态，判断该通知是否已经处理过，如果没有处理过再进行处理，如果处理过直接返回结果成功。在对业务数据进行状态检查和处理之前，要采用数据锁进行并发控制，以避免函数重入造成的数据混乱。

3、技术人员可登进微信商户后台扫描加入接口报警群，获取接口告警信息。

 */

const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

//下面好像不对
//每次请求支付（统一下单）用户支付（或者不支付）后都会触发此回调，但交易是否成功需要查看result_code来判断

exports.main = async (event, context) => {
  console.log('回调event:', event)
  
  const orderId = event.outTradeNo
  const openid = event.userInfo.openId
  const returnCode = event.returnCode
  const cashFee = event.cashFee

  if (returnCode == 'SUCCESS') {
    //通信成功，event中包含订单相关信息
    //是否支付了还得进一步判断
    return {
      errcode: 0,
      errmsg: '回调成功'
    }
  } else {
    //若通信失败，微信还会继续回调该接口
    return {
      errcode: 1,
      errmsg: '回调通信失败'
    }
  }
}
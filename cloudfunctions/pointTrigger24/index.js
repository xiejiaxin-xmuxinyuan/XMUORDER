/**
 * 云函数触发器轮询（上传/删除触发器可以开启、关闭）
 * 对10分钟内订单状态为未支付的所有订单进行间隔30s的轮询，
 * 每个订单被轮询查单11次（大约5分钟后）, 若仍未支付则判定为支付超时，关闭订单
 * 若被轮询查单结果为已支付，则修改数据库订单状态为已支付
 */

const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const $ = db.command.aggregate


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

async function orderGetFoodTimeout() {
  try {
    const res = await db.collection('orders').where({
      'orderInfo.orderState': 'NOTGET',
    }).update({
      data: {
        'getFoodInfo.getState': 'TIMEOUT',
        'getFoodInfo.getStateMsg': '取餐超时',
        'orderInfo.orderState': 'SUCCESS',
        'orderInfo.orderStateMsg': '已完成',
        'orderInfo.timeInfo.endTime': getStrDate(new Date()),
      }
    })
    console.log('订单取餐超时检测：修改订单', res.stats.updated, '条')
  } catch (e) {
    console.error('订单取餐超时检测错误：', e)
  }
}

// 保存对应餐厅今日统计数据
async function saveTodayStatistics(data, date) {
  console.log('正在保存餐厅统计数据', data)
  const cID = data.cID
  const countRes = await db.collection('statistics').where({
    cID,
    date
  }).count()

  if (countRes.total) { // 执行更新
    console.log(data.cID, '已有今日记录，执行update')
    await db.collection('statistics').where({
      cID,
      date
    }).update({
      data: {
        orderCount: data.orderCount,
        orderMoney: data.orderMoney,
      }
    })
  } else { // 执行新增
    console.log(data.cID, '无今日记录，执行add')
    await db.collection('statistics').add({
      data: {
        ...data,
        date
      }
    })
  }
}

// 统计餐厅今日数据（仅统计有订单的）
async function orderTodayStatistics() {
  var lDate = new Date()
  var rDate = new Date()
  lDate.setHours(0, 0, 0, 0)
  rDate.setHours(24, 0, 0, 0)
  lStrDate = getStrDate(lDate)
  rStrDate = getStrDate(rDate)

  db.collection('orders').aggregate().match({
    'orderInfo.orderState': 'SUCCESS',
    'orderInfo.timeInfo.createTime': _.and(_.gt(lStrDate), _.lt(rStrDate))
  }).group({
    _id: '$goodsInfo.shopInfo.cID',
    orderMoney: $.sum('$payInfo.feeInfo.cashFee'),
    orderCount: $.sum(1)
  }).project({
    cID: '$_id',
    orderMoney: 1,
    orderCount: 1,
    _id: 0
  }).end().then(res => {
    res.list.forEach(result => {
      saveTodayStatistics(result, lStrDate.substr(0, 8))
    })
  })
}

exports.main = async (event, context) => {
  await orderGetFoodTimeout()
  await orderTodayStatistics()
}
/**
 * 云函数聚合联表查询单个餐厅信息（从food表中获取食物信息）
 * 参数： cID: string 餐厅id
 *                    
 * 返回： object 
 *        成功：{success: 1, canteen单个餐厅信息}
 *        失败：{success: 0}
 */

const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command
const $ = _.aggregate

// 云函数入口函数
exports.main = async (event, context) => {
  var cID = event.cID
  return new Promise((resolve, reject) => {
    db.collection('canteen').aggregate()
      .match({
        cID: cID
      })
      .lookup({
        from: 'food',
        pipeline: $.pipeline()
          .match({ //匹配cID
            cID: cID
          })
          .group({ //按typeName字段分组
            _id: '$typeName',
            food: $.push('$$ROOT'),
          })
          .project({ //_id 换成 name
            _id: 0,
            name: '$_id',
            food: 1
          })
          .done(),
        as: '_temp' //临时位置
      })
      .end()
      .then(res => {
        var canteen = res.list[0]
        if ('_temp' in res.list[0]) { //说明至少有一个商品
          var newFoodList = res.list[0]._temp

          for (let index = 0; index < canteen.foodList.length; index++) {
            delete canteen.foodList[index].food //删除原有food字段
            let name = canteen.foodList[index].name

            for (let i = 0; i < newFoodList.length; i++) { //newFoodList中food匹配填入canteen中的food
              let element = newFoodList[i];
              if (element.name === name) {
                canteen.foodList[index].food = element.food
                break
              }
            }
          }
          delete canteen._temp //删除临时字段
        }
        resolve({
          success: 1,
          canteen: canteen
        })
      })
      .catch(e => {
        console.error(e)
        reject({
          success: 0
        })
      })
  })



}
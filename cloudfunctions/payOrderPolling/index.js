//记得右键 上传/删除触发器
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const test = (new Date).toString()
  console.log(test)
  return test
}
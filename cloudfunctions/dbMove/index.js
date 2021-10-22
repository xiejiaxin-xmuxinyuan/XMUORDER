const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  return new Promise((resolve, reject) => {
    db.collection(event.table).doc(event._id)
      .remove()
      .then(res => {
        resolve({
          success: 1
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
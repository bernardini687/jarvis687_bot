const axios = require('axios')
const bucket = require('./bucket')

const BASE_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`
const STORE_KEY = 'balance/store.json'

exports.handler = async (event) => {
  // 1. check if user is allowed, if it is, continue:
  // 2. check if user is in the store, if it is, skip sign assignment and continue:
  // 2.1 sign assignment:
  // 3. reply asking to input costs (with placeholder)
  // 4. update store
  // 5. send back report

  const msg = telegramMessage(event)

  // read
  const items = await bucket.readJsonContent(STORE_KEY)
  items.push(msg.text)

  // update
  await bucket.writeJsonContent(STORE_KEY, items)

  try {
    const { data } = await sendMessage(msg.chat.id, buildTextList(items))
    console.log('data:', data)

    return { statusCode: 200 }
  } catch (err) {
    console.log('err:', err)

    return { statusCode: 500 }
  }
}

/*
 * message: {
 *   from: {
 *     id: 1
 *     first_name: '',
 *   },
 *   chat: {
 *     id: 1,
 *     type: '',
 *   },
 *   text: ''
 * }
 */
function telegramMessage (event) {
  return JSON.parse(event.body).message
}

function sendMessage (chat_id, text) {
  return axios.post(`${BASE_URL}/sendMessage`, {
    chat_id,
    text,
    parse_mode: 'HTML'
  })
}

/*
 * @items ['', '']
 */
function buildTextList (items) {
  return items.reduce((prev, item) => `${prev}\n${item}`)
}

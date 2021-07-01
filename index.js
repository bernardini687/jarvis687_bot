const axios = require('axios')
const bucket = require('./bucket')

const BASE_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`
const STORE_KEY = 'balance/store.json'

exports.handler = async (event) => {
  const msg = telegramMessage(event)

  // read
  const store = await bucket.readJsonContent(STORE_KEY)
  store.push(msg.text)

  // update
  await bucket.writeJsonContent(STORE_KEY, store)

  try {
    const { data } = await sendMessage(msg.chat.id, buildTextList(store))
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

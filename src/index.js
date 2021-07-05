const axios = require('axios')
const bucket = require('./bucket')
const texts = require('./texts')

const BASE_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`
const MEMORY_KEY = 'balance/memory.json'

exports.handler = async (event) => {
  // console.log('body:', JSON.parse(event.body))

  const msg = telegramMessage(event)

  if (!userOkay(msg.from.id)) {
    await sendMessage(msg.chat.id, texts.UNPERMITTED_USER)
    return
  }

  if (msg.text === 'RESETBALANCE') {
    await bucket.writeJsonContent(MEMORY_KEY, { users: {}, history: {}, balance: 0 })
    return
  }

  if (msg.text === '/spesa') {
    const mem = await bucket.readJsonContent(MEMORY_KEY)

    await handlePossibleNewUser(mem, msg.from.id, msg.from.first_name)

    await sendQuery(msg.chat.id, texts.BALANCE_QUERY(msg.from.first_name), msg.message_id)
    return
  }

  if ('reply_to_message' in msg) {
    const mem = await bucket.readJsonContent(MEMORY_KEY)

    try {
      await handleHistoryUpdate(mem, msg.from.first_name, msg.text)
    } catch (e) {
      await sendQuery(msg.chat.id, e.message, msg.message_id)
      return
    }

    // send report
    await sendMessage(msg.chat.id, prepareReport(mem))
  }
}

/*
 * message: {
 *   message_id: 1,
 *   from: {
 *     id: 1,
 *     first_name: '',
 *   },
 *   chat: {
 *     id: 1,
 *     type: '',
 *   },
 *   date: 1,
 *   text: ''
 * }
 */
function telegramMessage (event) {
  return JSON.parse(event.body).message
}

// function isNewMessage (date) {
//   // telegram's timestamps have 10 digits while js ones have 13
//   return date >= parseInt(Date.now() / 1000) - 1 // allow messages 1 second older than this lambda's run time
// }

function userOkay (user) {
  const allowedUsers = process.env.ALLOWED_USERS.split(':')
  return allowedUsers.includes(user.toString())
}

async function handlePossibleNewUser (memory, user, name) {
  if (user in memory.users) {
    return
  }

  let sign = '+'

  // no need to worry about a third user as long as only two are permitted in ALLOWED_USERS
  if (Object.keys(memory.users).length > 0) {
    sign = '-'
  }
  memory.users[user] = { name, sign }

  await bucket.writeJsonContent(MEMORY_KEY, memory)
}

async function handleHistoryUpdate (memory, name, text) {
  let amount = Number(text)
  if (isNaN(amount)) {
    throw new Error(texts.BALANCE_INPUT_ERROR)
  }
  amount = Math.round(amount * 100)

  if (!memory.history[name]) {
    memory.history[name] = 0
  }
  memory.history[name] += amount

  await bucket.writeJsonContent(MEMORY_KEY, memory)
}

function sendMessage (chat_id, text) {
  return axios.post(`${BASE_URL}/sendMessage`, {
    chat_id,
    text
  })
}

function sendQuery (chat_id, text, reply_to_message_id) {
  return axios.post(`${BASE_URL}/sendMessage`, {
    chat_id,
    text,
    reply_to_message_id,
    reply_markup: {
      force_reply: true,
      input_field_placeholder: '12.01',
      selective: true
    }
  })
}

function prepareReport ({ history }) {
  const report = Object.keys(history).reduce(
    (prev, name) => `${prev}${name}: ${formatAmount(history[name])}\n`,
    ''
  )
  return report.trimEnd()
}

function formatAmount (amount) {
  return (amount / 100).toFixed(2)
}

// function buildTextList (items) {
//   return items.reduce((prev, item) => `${prev}\n${item}`)
// }

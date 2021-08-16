const axios = require('axios')
const bucket = require('./bucket')
const texts = require('./texts')

const BASE_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`
const MEMORY_FILE = 'memory.json'

exports.handler = async (event) => {
  console.log('event.body:', event.body)

  const msg = telegramMessage(event)

  if (!('from' in msg)) {
    return
  }

  if (!chatOkay(msg.chat.id)) {
    await sendMessage(msg.chat.id, texts.UNPERMITTED_CHAT)
    return
  }

  if (msg.chat.type !== 'group') {
    await sendMessage(msg.chat.id, texts.UNPERMITTED_CHAT_TYPE)
    return
  }

  const memoryKey = `${msg.chat.id}/${MEMORY_FILE}`

  if (msg.text === 'RESETBALANCE') {
    await bucket.writeJsonContent(memoryKey, { users: {}, history: {}, balance: 0 })
    return
  }

  console.log('memory key:', memoryKey)

  // allow both `/spesa` and `/spesa@bot`:
  if (/^\/spesa/.test(msg.text)) {
    const mem = await bucket.readJsonContent(memoryKey)

    // TODO: Object.keys(memory.users).length > 1) SKIP HANDLE POSSIBLE NEW USERS ?
    // TODO: what happens when a third chat member enters?

    await handlePossibleNewUser(mem, msg.from.id, msg.from.first_name, memoryKey)

    await sendQuery(msg.chat.id, texts.BALANCE_QUERY(msg.from.first_name), msg.message_id)
    return
  }

  if ('reply_to_message' in msg) {
    const mem = await bucket.readJsonContent(memoryKey)

    try {
      await handleHistoryUpdate(mem, msg.from.id, msg.text, memoryKey)
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
  return JSON.parse(event.body).message || {}
}

/*
 *
 */
function chatOkay (chat) {
  const allowedChats = process.env.ALLOWED_CHATS.split(':')
  return allowedChats.includes(chat.toString())
}

/*
 *
 */
async function handlePossibleNewUser (memory, user, name, memoryKey) {
  if (user in memory.users) {
    return
  }

  let sign = '+'

  if (Object.keys(memory.users).length > 0) {
    sign = '-'
  }
  memory.users[user] = { name, sign }

  await bucket.writeJsonContent(memoryKey, memory)
}

/*
 *
 */
async function handleHistoryUpdate (memory, user, text, memoryKey) {
  let amount = text.replace(',', '.')
  amount = Number(amount)
  if (isNaN(amount)) {
    throw new Error(texts.BALANCE_INPUT_ERROR)
  }
  // `amount` can be negative or zero.
  // if negative, it can be used to revert a mistake (first you send `100`, then you correct with `-100`).
  // if zero, it can be used to just obtain the report.
  amount = Math.round(amount * 100)

  const { name, sign } = memory.users[user]

  if (sign === '-') {
    amount = -amount
  }

  if (!memory.history[name]) {
    memory.history[name] = 0
  }
  memory.history[name] += amount

  setBalance(memory)

  await bucket.writeJsonContent(memoryKey, memory)
}

/*
 *
 */
function setBalance (memory) {
  let amounts = Object.values(memory.history)
  amounts = amounts.map((amount) => Math.round(amount / amounts.length))

  memory.balance = amounts.reduce((sum, amount) => {
    sum += amount
    return sum
  })
}

/*
 *
 */
function prepareReport ({ users, history, balance }) {
  const names = Object.keys(history)
  let report = names.reduce(
    (content, name) => `${content}${name}: ${formatAmount(history[name])}\n`,
    ''
  )

  if (names.length > 1) {
    report += debitorTextInfo(users, balance)
    report += perCapitaTextInfo(history)
  }

  return report.trimEnd()
}

/*
 *
 */
function debitorTextInfo (users, balance) {
  let deb, cre

  const plus = findUserBySign(users, '+')
  const minus = findUserBySign(users, '-')

  if (balance > 0) {
    deb = minus
    cre = plus
  } else {
    deb = plus
    cre = minus
  }

  return `${deb.name} -> ${cre.name}: ${formatAmount(balance)}\n`
}

/*
 *
 */
function perCapitaTextInfo (history) {
  let amounts = Object.values(history)
  amounts = amounts.map(Math.abs)

  const tot = amounts.reduce((sum, amount) => {
    sum += amount
    return sum
  })

  return `Pro capite: ${formatAmount(tot / 2)}\n`
}

/*
 *
 */
function findUserBySign (users, sign) {
  return Object.values(users).find((user) => user.sign === sign)
}

/*
 *
 */
function formatAmount (amount) {
  return (Math.abs(amount) / 100).toFixed(2).replace('.', ',')
}

/*
 *
 */
function sendMessage (chat_id, text) {
  return axios.post(`${BASE_URL}/sendMessage`, {
    chat_id,
    text
  })
}

/*
 *
 */
function sendQuery (chat_id, text, reply_to_message_id) {
  return axios.post(`${BASE_URL}/sendMessage`, {
    chat_id,
    text,
    reply_to_message_id,
    reply_markup: {
      force_reply: true,
      input_field_placeholder: '12,01',
      selective: true
    }
  })
}

const axios = require('axios')
const bucket = require('./bucket')
const texts = require('./texts')

const BASE_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`
const MEMORY_KEY = 'balance/memory.json'

exports.handler = async (event) => {
  console.log('event.body:', event.body)

  const msg = telegramMessage(event)

  if (!('from' in msg)) {
    return
  }

  if (!userOkay(msg.from.id)) {
    await sendMessage(msg.chat.id, texts.UNPERMITTED_USER)
    return
  }

  if (msg.text === 'RESETBALANCE') {
    await bucket.writeJsonContent(MEMORY_KEY, { users: {}, history: {}, balance: 0 })
    return
  }

  // allow both `/spesa` and `/spesa@bot`:
  if (/^\/spesa/.test(msg.text)) {
    const mem = await bucket.readJsonContent(MEMORY_KEY)

    await handlePossibleNewUser(mem, msg.from.id, msg.from.first_name)

    await sendQuery(msg.chat.id, texts.BALANCE_QUERY(msg.from.first_name), msg.message_id)
    return
  }

  if ('reply_to_message' in msg) {
    const mem = await bucket.readJsonContent(MEMORY_KEY)

    try {
      await handleHistoryUpdate(mem, msg.from.id, msg.text)
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

/*
 *
 */
function userOkay (user) {
  const allowedUsers = process.env.ALLOWED_USERS.split(':')
  return allowedUsers.includes(user.toString())
}

/*
 *
 */
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

/*
 *
 */
async function handleHistoryUpdate (memory, user, text) {
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

  await bucket.writeJsonContent(MEMORY_KEY, memory)
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

  return `Per capita: ${formatAmount(tot / 2)}\n`
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

const axios = require('axios')
const bucket = require('./bucket')

const BASE_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`
const MEMORY_KEY = 'balance/memory.json'

exports.handler = async (event) => {
  console.log('body:', JSON.parse(event.body))

  const msg = telegramMessage(event)

  if (!isNewMessage(msg.date)) {
    return
  }

  if (!userOkay(msg.from.id)) {
    return sendMessage(msg.chat.id, 'Non mi è permesso di interagire con te')
  }

  if (msg.text === 'RESETBALANCE') {
    await bucket.writeJsonContent(MEMORY_KEY, {})
  }

  if (msg.text === '/spesa') {
    const mem = await bucket.readJsonContent(MEMORY_KEY)

    try {
      await handlePossibleNewUser(mem, msg.from.id, msg.from.first_name)
    } catch (e) {
      return sendMessage(msg.chat.id, e.message) // TODO: test third user
    }

    return sendQuery(msg.chat.id, `Quanto hai speso, ${msg.from.first_name}?`, msg.message_id)
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

function isNewMessage (date) {
  // telegram's timestamps have 10 digits while js ones have 13
  return date >= parseInt(Date.now() / 1000) - 1 // allow messages 1 second older than this lambda's run time
}

function userOkay (user) {
  const allowedUsers = process.env.ALLOWED_USERS.split(':')
  return allowedUsers.includes(user.toString())
}

async function handlePossibleNewUser (memory, user, name) {
  if ('users' in memory) {
    if (user in memory.users) {
      return
    } else if (Object.keys(memory.users).length > 1) {
      throw new Error('Non sono permessi ulteriori utenti')
    }
    memory.users[user] = { name, sign: '-' }
  }
  memory.users = { [user]: { name, sign: '+' } }

  await bucket.writeJsonContent(MEMORY_KEY, memory)
}

function sendMessage (chat_id, text) {
  return axios.post(`${BASE_URL}/sendMessage`, {
    chat_id,
    text
    // parse_mode: 'HTML'
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

// function buildTextList (items) {
//   return items.reduce((prev, item) => `${prev}\n${item}`)
// }

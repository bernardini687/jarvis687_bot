const axios = require('axios');
const bucket = require('./bucket')

const BASE_URL = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

exports.handler = async (event) => {
  const msg = telegramMessage(event);

  await bucket.writeJSON('balance/store.json', buildStore(msg));

  try {
    const { data } = await sendMessage(msg.chat.id, buildTextList(['foo', 'bar']));
    console.log('data:', data);

    return { statusCode: 200 };
  } catch (err) {
    console.log('err:', err);

    return { statusCode: 500 };
  }
};

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
function telegramMessage(event) {
  return JSON.parse(event.body).message;
}

function sendMessage(chat_id, text) {
  return axios.post(`${BASE_URL}/sendMessage`, {
    chat_id,
    text,
    parse_mode: 'HTML'
  });
}

function buildStore(message) {
  // return { [message.from.id]: message.text }
  return ['hello', 'world']
}

/*
 * @items ['', '']
 */
function buildTextList(items) {
  return items.reduce((prev, item) => {
    return prev += `<br>${item}`
  })
}

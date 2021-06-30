const axios = require('axios')
const BASE_URL = `https://api.telegram.org/bot${process.env['BOT_TOKEN']}`;

exports.handler = async event => {
  console.log("[INFO] event:", event);

  const message = telegramMessage(event);

  console.log("[INFO] text:", message.text);

  sendMessage(message.chat.id, message.text);

  return {
    statusCode: 200
  };
};

/*
message: {
  from: {
    id: 1
    first_name: '',
  },
  chat: {
    id: 1,
    type: '',
  },
  text: ''
}
 */
function telegramMessage(event) {
  const { message } = JSON.parse(event.body);

  return message;
}

function sendMessage(chat_id, text) {
  axios
    .post(`${BASE_URL}/sendMessage`, {
      chat_id,
      text,
      parse_mode: 'HTML'
    })
    .then(res => {
      console.log(`[INFO] res.statusCode: ${res.statusCode}`);
    })
    .catch(err => {
      console.error(err);
    });
}

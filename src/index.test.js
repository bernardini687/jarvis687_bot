const axiosMock = require('axios')
const bucketMock = require('./bucketMock')

const index = require('./index')

jest.mock('axios')
jest.mock('./bucketMock')

// IDEA: process.env.ALLOWED_USERS = '011:235'

// scenarios: single user inputs 2 costs ✅
//            secret command: __RESETBALANCE__
//            wrong input
//            second user
//            extra user
//            unpermitted user
//            bot expecting user 1 response but getting user 2 /spesa command

describe('scenario', () => {
  beforeEach(jest.resetAllMocks)

  describe('permitted user inputs 2 initial expenses', () => {
    beforeEach(() => {
      // In this scenario, `__RESETBALANCE__` was first invoked, causing `balance/store.json` to become empty.
      bucketMock.readJsonContent.mockImplementation(() => Promise.resolve({}))
      bucketMock.writeJsonContent.mockImplementation(() => Promise.resolve())
      axiosMock.post.mockImplementation(() => Promise.resolve({ data: {} }))
    })

    function updateStore (newStore) {
      bucketMock.readJsonContent.mockImplementationOnce(() => Promise.resolve({ ...newStore }))
    }

    const SEND_MESSAGE_URL = 'https://api.telegram.org/bot12345/sendMessage'
    const reply_markup = {
      force_reply: true,
      input_field_placeholder: '12.01',
      selective: true
    }

    it('updates the store accordingly', async () => {
      /*
       * INTERACTION #1
       *
       * First user (id: 011) sends `/spesa` command:
       */
      const event = require('../test/events/user_1_spesa_1')
      const storeState = {
        users: { '001': { name: 'user_1', sign: '+' } }
      }

      await index.handler(event)

      expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(1) // Store is empty,
      expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(1) // then writes `users` section,
      expect(bucketMock.writeJsonContent).toHaveBeenCalledWith('balance/store.json', storeState)
      expect(axiosMock.post).toHaveBeenCalledTimes(1) // and send expense request.
      expect(axiosMock.post).toHaveBeenCalledWith(
        SEND_MESSAGE_URL,
        {
          chat_id: 1,
          text: 'Quanto hai speso, user_1?',
          reply_to_message_id: 1,
          reply_markup
        }
      )

      // /*
      //  * INTERACTION #2
      //  *
      //  * User 011 responds to the bot's expense request with `12.01`:
      //  */
      // event = require('../test/events/user_1_spesa_2')
      // updateStore(storeState) // Respond to reads with previous store's state.
      // storeState = { ...storeState, history: { user_1: 1201 } } // Set new store's state.

      // await index.handler(event)

      // expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(2)
      // expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(2)
      // expect(bucketMock.writeJsonContent).toHaveBeenCalledWith('balance/store.json', storeState)
      // expect(axiosMock.post).toHaveBeenCalledTimes(2)
      // expect(axiosMock.post).toHaveBeenCalledWith(
      //   SEND_MESSAGE_URL,
      //   {
      //     chat_id: 1,
      //     text: 'user_1: 12.01'
      //   }
      // )

      // /*
      //  * INTERACTION #3
      //  *
      //  * User 011 sends `/spesa` command again:
      //  */
      // event = require('../test/events/user_1_spesa_3')
      // updateStore(storeState) // Respond to reads with previous store's state.

      // await index.handler(event)

      // expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(3)
      // expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(2) // User 011 is already in memory, no need for any writes this time.
      // expect(axiosMock.post).toHaveBeenCalledTimes(3)
      // expect(axiosMock.post).toHaveBeenCalledWith(
      //   SEND_MESSAGE_URL,
      //   {
      //     chat_id: 1,
      //     text: 'Quanto hai speso, user_1?',
      //     reply_to_message_id: 3,
      //     reply_markup
      //   }
      // )

      // /*
      //  * INTERACTION #4
      //  *
      //  * User 011 responds to the bot with another `12.01`:
      //  */
      // event = require('../test/events/user_1_spesa_4')
      // updateStore(storeState)
      // storeState = { ...storeState, history: { user_1: 2402 } }

      // await index.handler(event)

      // expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(4)
      // expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(3)
      // expect(bucketMock.writeJsonContent).toHaveBeenCalledWith('balance/store.json', storeState)
      // expect(axiosMock.post).toHaveBeenCalledTimes(4)
      // expect(axiosMock.post).toHaveBeenCalledWith(
      //   SEND_MESSAGE_URL,
      //   {
      //     chat_id: 1,
      //     text: 'user_1: 24.02'
      //   }
      // )
    })
  })
})

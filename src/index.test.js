const axiosMock = require('axios')
const bucketMock = require('./bucket')

const index = require('./index')

jest.mock('axios')
jest.mock('./bucket')

// TODO:
//   wrong input
//   second user
//   extra user

describe('scenario', () => {
  beforeEach(jest.resetAllMocks)

  const SEND_MESSAGE_URL = 'https://api.telegram.org/bot12345/sendMessage'
  const MEMORY_KEY = 'balance/memory.json'

  describe('unpermitted user sends a message', () => {
    it('sends an error message back', async () => {
      const event = require('../test/events/unpermitted_user')

      await index.handler(event)

      expect(bucketMock.readJsonContent).not.toHaveBeenCalled()
      expect(bucketMock.writeJsonContent).not.toHaveBeenCalled()
      expect(axiosMock.post).toHaveBeenCalledTimes(1)
      expect(axiosMock.post).toHaveBeenCalledWith(
        SEND_MESSAGE_URL,
        {
          chat_id: 9,
          text: 'Non mi è permesso di interagire con te'
        }
      )
    })
  })

  describe('permitted user inputs 2 initial expenses', () => {
    beforeEach(() => {
      // In this scenario, `__RESETBALANCE__` was first invoked, causing the memory to become empty.
      bucketMock.readJsonContent.mockImplementation(() => Promise.resolve({}))
      bucketMock.writeJsonContent.mockImplementation(() => Promise.resolve()) //
      axiosMock.post.mockImplementation(() => Promise.resolve({ data: {} })) //
    })

    function updateMemory (newMemory) {
      bucketMock.readJsonContent.mockImplementationOnce(() => Promise.resolve({ ...newMemory }))
    }

    const reply_markup = {
      force_reply: true,
      input_field_placeholder: '12.01',
      selective: true
    }

    it('updates the memory accordingly', async () => {
      /*
       * INTERACTION #1
       *
       * First user (id: 111) sends `/spesa` command:
       */
      const event = require('../test/events/user_1_spesa_1')
      const memory = {
        users: { 111: { name: 'user_1', sign: '+' } }
      }

      await index.handler(event)

      expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(1) // Memory is empty,
      expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(1) // then writes `users` section,
      expect(bucketMock.writeJsonContent).toHaveBeenCalledWith(MEMORY_KEY, memory)
      expect(axiosMock.post).toHaveBeenCalledTimes(1) // and send expense request.
      expect(axiosMock.post).toHaveBeenCalledWith(
        SEND_MESSAGE_URL,
        {
          chat_id: 1,
          text: 'Quanto hai speso, user_1?',
          reply_to_message_id: 62,
          reply_markup
        }
      )

      // /*
      //  * INTERACTION #2
      //  *
      //  * User 111 responds to the bot's expense request with `12.01`:
      //  */
      // event = require('../test/events/user_1_spesa_2')
      // updateMemory(memory) // Respond to reads with previous memory's state.
      // memory = { ...memory, history: { user_1: 1201 } } // Set new memory's state.

      // await index.handler(event)

      // expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(2)
      // expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(2)
      // expect(bucketMock.writeJsonContent).toHaveBeenCalledWith(MEMORY_KEY, memory)
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
      //  * User 111 sends `/spesa` command again:
      //  */
      // event = require('../test/events/user_1_spesa_3')
      // updateMemory(memory) // Respond to reads with previous memory's state.

      // await index.handler(event)

      // expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(3)
      // expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(2) // User 111 is already in memory, no need for any writes this time.
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
      //  * User 111 responds to the bot with another `12.01`:
      //  */
      // event = require('../test/events/user_1_spesa_4')
      // updateMemory(memory)
      // memory = { ...memory, history: { user_1: 2402 } }

      // await index.handler(event)

      // expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(4)
      // expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(3)
      // expect(bucketMock.writeJsonContent).toHaveBeenCalledWith(MEMORY_KEY, memory)
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

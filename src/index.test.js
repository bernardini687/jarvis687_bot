const axiosMock = require('axios')
const bucketMock = require('./bucket')

const texts = require('./texts')
const index = require('./index')

jest.mock('axios')
jest.mock('./bucket')

describe('scenario', () => {
  beforeEach(jest.resetAllMocks)

  const SEND_MESSAGE_URL = 'https://api.telegram.org/bot12345/sendMessage'
  const MEMORY_KEY = 'balance/memory.json'

  describe('unpermitted user', () => {
    describe('sends a message', () => {
      it('sends an error message back', async () => {
        const event = require('../test/events/spesa/bad_user')

        await index.handler(event)

        expect(bucketMock.readJsonContent).not.toHaveBeenCalled()
        expect(bucketMock.writeJsonContent).not.toHaveBeenCalled()
        expect(axiosMock.post).toHaveBeenCalledTimes(1)
        expect(axiosMock.post).toHaveBeenCalledWith(
          SEND_MESSAGE_URL,
          {
            chat_id: 9,
            text: texts.UNPERMITTED_USER
          }
        )
      })
    })
  })

  describe('permitted user', () => {
    function updateMemory (newMemory) {
      bucketMock.readJsonContent.mockImplementationOnce(() => Promise.resolve({ ...newMemory }))
    }

    const reply_markup = {
      force_reply: true,
      input_field_placeholder: '12,01',
      selective: true
    }

    beforeEach(() => {
      // in this scenario, `RESETBALANCE` was first invoked, causing the memory to become initialized
      bucketMock.readJsonContent.mockImplementation(() => Promise.resolve({ users: {}, history: {}, balance: 0 }))
    })

    describe('inputs something other than a number', () => {
      it('sends an error message back', async () => {
        /*
         * INTERACTION #1
         *
         * First user (id: 111) sends `/spesa` command:
         */
        let event = require('../test/events/spesa/user_1_msg_1')

        await index.handler(event)

        expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(1) // get the state of memory
        expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(1) // update with the new user
        expect(axiosMock.post).toHaveBeenCalledTimes(1) // send expense request
        expect(axiosMock.post).toHaveBeenCalledWith(
          SEND_MESSAGE_URL,
          {
            chat_id: 1,
            text: texts.BALANCE_QUERY('user_1'),
            reply_to_message_id: 62,
            reply_markup
          }
        )

        /*
         * INTERACTION #2
         *
         * User 111 responds to the bot's expense request with `hello`:
         */
        event = require('../test/events/spesa/user_1_bad_input')

        await index.handler(event)

        expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(2)
        expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(1) // update is skipped because of bad input
        expect(axiosMock.post).toHaveBeenCalledTimes(2) // re-send expense request
        expect(axiosMock.post).toHaveBeenCalledWith(
          SEND_MESSAGE_URL,
          {
            chat_id: 1,
            text: texts.BALANCE_INPUT_ERROR,
            reply_to_message_id: 64,
            reply_markup
          }
        )
      })
    })

    describe('inputs two initial expenses', () => {
      it('updates the memory accordingly', async () => {
        /*
         * INTERACTION #1
         *
         * First user (id: 111) sends `/spesa` command:
         */
        let event = require('../test/events/spesa/user_1_msg_1')
        let expectedMemory = {
          users: { 111: { name: 'user_1', sign: '+' } },
          history: {},
          balance: 0
        }

        await index.handler(event)

        expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(1) // get the state of memory
        expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(1) // update with the new user
        expect(bucketMock.writeJsonContent).toHaveBeenCalledWith(MEMORY_KEY, expectedMemory)
        expect(axiosMock.post).toHaveBeenCalledTimes(1) // send expense request
        expect(axiosMock.post).toHaveBeenCalledWith(
          SEND_MESSAGE_URL,
          {
            chat_id: 1,
            text: texts.BALANCE_QUERY('user_1'),
            reply_to_message_id: 62,
            reply_markup
          }
        )

        /*
         * INTERACTION #2
         *
         * User 111 responds to the bot's expense request with `12.01`:
         */
        event = require('../test/events/spesa/user_1_msg_2')
        updateMemory(expectedMemory) // respond to reads with the current memory state
        expectedMemory = {
          ...expectedMemory,
          history: { user_1: 1201 },
          balance: 1201
        }

        await index.handler(event)

        expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(2)
        expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(2)
        expect(bucketMock.writeJsonContent).toHaveBeenCalledWith(MEMORY_KEY, expectedMemory)
        expect(axiosMock.post).toHaveBeenCalledTimes(2)
        expect(axiosMock.post).toHaveBeenCalledWith(
          SEND_MESSAGE_URL,
          {
            chat_id: 1,
            text: 'user_1: 12,01'
          }
        )

        /*
         * INTERACTION #3
         *
         * User 111 sends `/spesa` command again:
         */
        event = require('../test/events/spesa/user_1_msg_3')
        updateMemory(expectedMemory) // respond to reads with the current memory state.

        await index.handler(event)

        expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(3)
        expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(2) // user 111 is already in memory, no need for any writes this time
        expect(axiosMock.post).toHaveBeenCalledTimes(3)
        expect(axiosMock.post).toHaveBeenCalledWith(
          SEND_MESSAGE_URL,
          {
            chat_id: 1,
            text: texts.BALANCE_QUERY('user_1'),
            reply_to_message_id: 65,
            reply_markup
          }
        )

        /*
         * INTERACTION #4
         *
         * User 111 responds to the bot with another `12.01`:
         */
        event = require('../test/events/spesa/user_1_msg_4')
        updateMemory(expectedMemory)
        expectedMemory = {
          ...expectedMemory,
          history: { user_1: 2402 },
          balance: 2402
        }

        await index.handler(event)

        expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(4)
        expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(3)
        expect(bucketMock.writeJsonContent).toHaveBeenCalledWith(MEMORY_KEY, expectedMemory)
        expect(axiosMock.post).toHaveBeenCalledTimes(4)
        expect(axiosMock.post).toHaveBeenCalledWith(
          SEND_MESSAGE_URL,
          {
            chat_id: 1,
            text: 'user_1: 24,02'
          }
        )
      })
    })

    describe('shares a balance with another user', () => {
      it('updates the memory accordingly', async () => {
        /*
         * INTERACTION #1
         *
         * First user (id: 111) sends `/spesa` command:
         */
        let event = require('../test/events/spesa/user_1_msg_1')
        let expectedMemory = {
          users: { 111: { name: 'user_1', sign: '+' } },
          history: {},
          balance: 0
        }

        await index.handler(event)

        expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(1) // get the state of memory
        expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(1) // update with the new user
        expect(bucketMock.writeJsonContent).toHaveBeenCalledWith(MEMORY_KEY, expectedMemory)
        expect(axiosMock.post).toHaveBeenCalledTimes(1) // send expense request
        expect(axiosMock.post).toHaveBeenCalledWith(
          SEND_MESSAGE_URL,
          {
            chat_id: 1,
            text: texts.BALANCE_QUERY('user_1'),
            reply_to_message_id: 62,
            reply_markup
          }
        )

        /*
         * INTERACTION #2
         *
         * User 111 responds to the bot's expense request with `12.01`:
         */
        event = require('../test/events/spesa/user_1_msg_2')
        updateMemory(expectedMemory) // respond to reads with the current memory state
        expectedMemory = {
          ...expectedMemory,
          history: { user_1: 1201 },
          balance: 1201
        }

        await index.handler(event)

        expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(2)
        expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(2)
        expect(bucketMock.writeJsonContent).toHaveBeenCalledWith(MEMORY_KEY, expectedMemory)
        expect(axiosMock.post).toHaveBeenCalledTimes(2)
        expect(axiosMock.post).toHaveBeenCalledWith(
          SEND_MESSAGE_URL,
          {
            chat_id: 1,
            text: 'user_1: 12,01'
          }
        )

        /*
         * INTERACTION #3
         *
         * Second user (id: 222) sends `/spesa` command:
         */
        event = require('../test/events/spesa/user_2_msg_1')
        updateMemory(expectedMemory) // respond to reads with the current memory state
        expectedMemory = {
          ...expectedMemory,
          users: { 111: { name: 'user_1', sign: '+' }, 222: { name: 'user_2', sign: '-' } }
        }

        await index.handler(event)

        expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(3) // get the state of memory
        expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(3) // update with the new user
        expect(bucketMock.writeJsonContent).toHaveBeenCalledWith(MEMORY_KEY, expectedMemory)
        expect(axiosMock.post).toHaveBeenCalledTimes(3) // send expense request
        expect(axiosMock.post).toHaveBeenCalledWith(
          SEND_MESSAGE_URL,
          {
            chat_id: 2,
            text: texts.BALANCE_QUERY('user_2'),
            reply_to_message_id: 90,
            reply_markup
          }
        )

        /*
         * INTERACTION #4
         *
         * User 222 responds to the bot's expense request with `20,01`:
         */
        event = require('../test/events/spesa/user_2_msg_2')
        updateMemory(expectedMemory) // respond to reads with the current memory state
        expectedMemory = {
          ...expectedMemory,
          history: { user_1: 1201, user_2: -2001 },
          balance: -399
        }

        await index.handler(event)

        expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(4)
        expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(4)
        expect(bucketMock.writeJsonContent).toHaveBeenCalledWith(MEMORY_KEY, expectedMemory)
        expect(axiosMock.post).toHaveBeenCalledTimes(4)
        expect(axiosMock.post).toHaveBeenCalledWith(
          SEND_MESSAGE_URL,
          {
            chat_id: 2,
            text: 'user_1: 12,01\nuser_2: 20,01\nuser_1 -> user_2: 3,99'
          }
        )

        /*
         * INTERACTION #5
         *
         * User 111 sends `/spesa` command again:
         */
        event = require('../test/events/spesa/user_1_msg_3')
        updateMemory(expectedMemory) // respond to reads with the current memory state.

        await index.handler(event)

        expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(5)
        expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(4) // user 111 is already in memory, no need for any writes this time
        expect(axiosMock.post).toHaveBeenCalledTimes(5)
        expect(axiosMock.post).toHaveBeenCalledWith(
          SEND_MESSAGE_URL,
          {
            chat_id: 1,
            text: texts.BALANCE_QUERY('user_1'),
            reply_to_message_id: 65,
            reply_markup
          }
        )

        /*
         * INTERACTION #6
         *
         * User 111 responds to the bot with another `12.01`:
         */
        event = require('../test/events/spesa/user_1_msg_4')
        updateMemory(expectedMemory)
        expectedMemory = {
          ...expectedMemory,
          history: { user_1: 2402, user_2: -2001 },
          balance: 201
        }

        await index.handler(event)

        expect(bucketMock.readJsonContent).toHaveBeenCalledTimes(6)
        expect(bucketMock.writeJsonContent).toHaveBeenCalledTimes(5)
        expect(bucketMock.writeJsonContent).toHaveBeenCalledWith(MEMORY_KEY, expectedMemory)
        expect(axiosMock.post).toHaveBeenCalledTimes(6)
        expect(axiosMock.post).toHaveBeenCalledWith(
          SEND_MESSAGE_URL,
          {
            chat_id: 1,
            text: 'user_1: 24,02\nuser_2: 20,01\nuser_2 -> user_1: 2,01'
          }
        )
      })
    })
  })
})

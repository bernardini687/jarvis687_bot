const axiosMock = require('axios')
const bucketMock = require('./bucket')
const index = require('./index')

// const botCommandEvent = require('../test_events/bot_command')
const regularTextEvent = require('../test/events/regular_text')

jest.mock('axios')
jest.mock('./bucket')

describe('handler', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('on regular message', () => {
    beforeEach(() => {
      bucketMock.readJsonContent.mockImplementation(() =>
        Promise.resolve(['a', 'b', 'c'])
      )
      bucketMock.writeJsonContent.mockImplementation(() =>
        Promise.resolve()
      )
      axiosMock.post.mockImplementation(() =>
        Promise.resolve({ data: {} })
      )
    })

    it('appends to bucket items', async () => {
      await index.handler(regularTextEvent)

      expect(bucketMock.readJsonContent).toHaveBeenCalledWith('balance/store.json')
      expect(bucketMock.writeJsonContent).toHaveBeenCalledWith(
        'balance/store.json',
        ['a', 'b', 'c', 'ping']
      )
    })

    it('sends the formatted items back to the telegram chat', async () => {
      await index.handler(regularTextEvent)

      expect(axiosMock.post).toHaveBeenCalledWith(
        'https://api.telegram.org/bot12345/sendMessage',
        {
          chat_id: 1,
          text: 'a\nb\nc\nping',
          parse_mode: 'HTML'
        }
      )
    })
  })
})

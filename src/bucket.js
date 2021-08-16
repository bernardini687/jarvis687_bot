const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')

const BUCKET_NAME = process.env.BUCKET_NAME
const bucket = new S3Client({})

module.exports = {
  writeJsonContent: async (Key, body) => {
    const cmd = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key,
      Body: JSON.stringify(body),
      ContentType: 'application/json'
    })

    console.log('writing json:', body)

    await bucket.send(cmd)
  },
  readJsonContent: async (Key) => {
    const cmd = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key
    })

    console.log('ABOUT TO FETCH FROM BUCKET:', BUCKET_NAME)

    const res = await bucket.send(cmd)
    const json = await streamToString(res.Body)

    console.log('reading json:', json)

    return JSON.parse(json)
  }
}

function streamToString (stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (chunk) => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

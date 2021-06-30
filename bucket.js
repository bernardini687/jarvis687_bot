const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const bucket = new S3Client({ params: { Bucket: process.env.BUCKET_NAME } });

module.exports = {
  writeJSON: async (Key, body) => {
    const cmd = new PutObjectCommand({
      Key,
      Body: JSON.stringify(body),
      ContentType: 'application/json'
    });
    await bucket.send(cmd);
  }
}

// export async function readContent(filePath) {
//     const cmd = new GetObjectCommand({
//         Key: `notepad/${filePath}`,
//     });
//     const response = await bucket.send(cmd);
//     return streamToString(response.Body);
// }

// function streamToString(stream) {
//     return new Promise((resolve, reject) => {
//         const chunks = [];
//         stream.on('data', (chunk) => chunks.push(chunk));
//         stream.on('error', reject);
//         stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
//     });
// }

// export async function handler(event) {
//     if (event.operation === 'write') {
//         await writeJSON(event.file, event.content);
//         return { status: 'UPDATED' }
//     } else if (event.operation === 'read') {
//         return {
//             status: 'READ',
//             content: await readContent(event.file),
//         }
//     } else {
//         return {
//             status: 'OPERATION_UNKNOWN'
//         }
//     }
// };

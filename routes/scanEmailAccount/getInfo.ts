export const getInfo = async (msg: any) => {
  const email = msg.data.payload?.headers?.find(
    (header) => header.name === 'From'
  )?.value

  const subject = msg.data.payload?.headers?.find(
    (header) => header.name === 'Subject'
  )?.value

  const date = msg.data.payload?.headers?.find(
    (header) => header.name === 'Date'
  )?.value

  const from = msg.data.payload?.headers?.find(
    (header) => header.name === 'From'
  )?.value

  const to = msg.data.payload?.headers?.find(
    (header) => header.name === 'To'
  )?.value

  const obj = {
    email,
    subject,
    date,
    from,
    to,
  }

  let textBody = ''
  let htmlBody = ''

  if (msg?.data?.payload?.parts?.[0]?.parts?.[0]?.body?.data) {
    textBody = Buffer.from(
      msg.data.payload.parts[0].parts[0].body.data,
      'base64'
    ).toString('utf-8')
  }

  if (msg?.data?.payload?.parts?.[0]?.parts?.[1]?.body?.data) {
    htmlBody = Buffer.from(
      msg.data.payload.parts[0].parts[1].body.data,
      'base64'
    ).toString('utf-8')
  }

  return { textBody, htmlBody, ...obj }
}

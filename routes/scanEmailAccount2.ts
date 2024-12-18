import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import fs from 'fs'
import OpenAI from 'openai'

import { OAuth2Client, UserRefreshClient } from 'google-auth-library'
import { zodResponseFormat } from 'openai/helpers/zod'
import { ToolCost2 } from './types'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'
import { pdf } from 'pdf-to-img'

dotenv.config()

const oAuth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
)

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const refreshToken = async (refreshToken: string) => {
  const user = new UserRefreshClient(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    refreshToken
  )

  const { credentials } = await user.refreshAccessToken() // optain new tokens
  return credentials
}

const analyzeReceiptWithOpenAI = async (base64Image: string) => {
  // Remove any potential file path prefix and get just the base64 string
  const base64Data = base64Image.includes(',')
    ? base64Image.split(',')[1]
    : base64Image

  let response
  try {
    response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `
              You will be given an image of an invoice.
              Fill out the following JSON with the information from the image.
              
              --This is the instructions for the JSON fields--

              **vendor**
              This is the name of the vendor. Take the core name of the vendor.
              For example, if the vendor is "Amazon Web Services", then the vendor is "AWS".
              And if the vendor is Framer B.V., then the vendor is "Framer".

              **date_of_invoice**
              Should be in the format: YYYY-MM-DD.
              This is the date for the invoice.

              **total_cost**
              This is the total cost of the invoice.

              **is_something_else**
              If the invoice is not a receipt or invoice, then this should be true. It might be a contract or some other document.
            `,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      response_format: zodResponseFormat(ToolCost2, 'toolCost'),
    })
  } catch (error) {
    console.error('Error in analyzeReceiptWithOpenAI:', error)
    throw error
  }

  return JSON.parse(response.choices[0].message.content)
}

const convertFileAndUpload = async (gmail, messageId: string, part: any) => {
  const attachment = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId: messageId,
    id: part.body.attachmentId,
  })

  const base64 = Buffer.from(attachment.data.data, 'base64')

  const urlSafeFileName = part.filename
    .replace('/', '')
    .replace(/[^a-zA-Z0-9-_.]/g, '')

  fs.writeFileSync('attachments_temp/' + urlSafeFileName, base64)

  const document = await pdf('attachments_temp/' + urlSafeFileName, {
    scale: 3,
  })
  let filePathToUpload = ''

  let counter = 1
  for await (const image of document) {
    const fileName =
      'attachments_temp/' + urlSafeFileName + '_' + counter + '.png'
    filePathToUpload = fileName
    fs.writeFileSync(fileName, image)
    counter++
  }

  // Upload the last generated image to Supabase storage
  const fileBuffer = fs.readFileSync(filePathToUpload)
  const base64Image = fileBuffer.toString('base64')

  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(`${Date.now()}_${urlSafeFileName}.png`, fileBuffer, {
      contentType: 'image/png',
      upsert: true,
    })
  console.log('🚀  error:', error)

  const { data: publicUrlData } = supabase.storage
    .from('receipts')
    .getPublicUrl(data.path)

  if (error) {
    throw new Error('Failed to upload file:' + error.message)
  }

  console.log('fs.unlinkSync-1', 'attachments_temp/' + urlSafeFileName)
  console.log('fs.unlinkSync-2', filePathToUpload)

  // Cleanup temp files
  fs.unlinkSync('attachments_temp/' + urlSafeFileName)
  fs.unlinkSync(filePathToUpload)

  return { base64Image, publicUrl: publicUrlData.publicUrl }
}

async function downloadFile(url, savePath) {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('statusText: ' + response.statusText)
    }

    const buffer = await response.arrayBuffer()
    fs.writeFileSync(savePath, Buffer.from(buffer))

    console.log('File downloaded successfully to:', savePath)
  } catch (error) {
    console.error('Error downloading the file:', error.message)
  }
}

async function analyzeReceipt(gmail, messageId: string, part: any) {
  const fileUrl = await convertFileAndUpload(gmail, messageId, part)
  const res = await analyzeReceiptWithOpenAI(fileUrl.base64Image)

  const {
    vendor,
    date_of_invoice,
    total_cost,
    currency,
    invoice_or_receipt,
    is_something_else,
  } = res

  if (is_something_else) {
    console.log('🚀  is_something_else:', is_something_else)
    console.log('🚀  res:', res)
    return
  }

  const filename = `receipts/${date_of_invoice}-${vendor}-${total_cost}-${currency}-${invoice_or_receipt}.png`
  const downloadUrl = fileUrl.publicUrl

  if (vendor !== 'Unknown') await downloadFile(downloadUrl, filename)
}

export const scanEmailAccount = async ({
  email,
  organization_id,
  after,
  before,
}: {
  email: string
  organization_id: string
  after: string
  before: string
}) => {
  const { data: emailAccount } = await supabase
    .from('email_account')
    .select()
    .eq('email', email)
    .eq('organization_id', organization_id)
    .single()

  if (!emailAccount) throw new Error('Email account not found')

  try {
    oAuth2Client.setCredentials({
      access_token: emailAccount.access_token,
      refresh_token: emailAccount.refresh_token,
    })
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

    const query = `(invoice | receipt | faktura | kvitto) has:attachment after:${after} before:${before}`
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
    })
    const messages = response.data.messages || []
    // const messages = response.data.messages.slice(0, 15) || []

    for (const message of messages) {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
      })

      const payload = msg.data.payload
      const parts = payload?.parts || []

      let foundPdf = false
      for (const part of parts) {
        if (foundPdf) break

        if (
          part.filename &&
          part.body &&
          part.body.attachmentId &&
          part.filename.includes('pdf')
        ) {
          await analyzeReceipt(gmail, message.id!, part)
          foundPdf = true
        }
      }

      if (!foundPdf) {
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
        console.log('🚀  No PDF found:', obj)

        if (msg?.data?.payload?.parts?.[0]?.parts?.[0]?.body?.data) {
          const textBody = Buffer.from(
            msg.data.payload.parts[0].parts[0].body.data,
            'base64'
          ).toString('utf-8')

          fs.writeFileSync(`no_pdf_text_body/${email}-${subject}.txt`, textBody)
        }

        if (msg?.data?.payload?.parts?.[0]?.parts?.[1]?.body?.data) {
          const htmlBody = Buffer.from(
            msg.data.payload.parts[0].parts[1].body.data,
            'base64'
          ).toString('utf-8')

          fs.writeFileSync(
            `no_pdf_html_body/${email}-${subject}.html`,
            htmlBody
          )
        }
      }
    }
  } catch (error) {
    console.error('Error in scanEmails:', error)
    throw error
  }
}

async function getCalendarEvents(
  oAuth2Client,
  calendarId = 'primary',
  timeMin,
  timeMax
) {
  // Initialize the Google Calendar API
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })

  try {
    // Fetch events from the calendar
    const res = await calendar.events.list({
      calendarId: calendarId, // 'primary' is the default calendar
      timeMin: timeMin, // Start date-time (ISO string)
      timeMax: timeMax, // End date-time (ISO string)
      singleEvents: true, // Expand recurring events into single instances
      orderBy: 'startTime', // Order by start time
    })

    // Extract event summaries
    const events = res.data.items || []

    const eventSummaries = events.map((event) => event.summary || '(No title)')

    const events2 = events.map((event) => event)

    return events2
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    throw error
  }
}

export const scanEmailAccount2 = async ({
  email,
  organization_id,
  after,
  before,
}: {
  email: string
  organization_id: string
  after: string
  before: string
}) => {
  const { data: emailAccount } = await supabase
    .from('email_account')
    .select()
    .eq('email', email)
    .eq('organization_id', organization_id)
    .single()

  if (!emailAccount) throw new Error('Email account not found')

  try {
    oAuth2Client.setCredentials({
      access_token: emailAccount.access_token,
      refresh_token: emailAccount.refresh_token,
    })

    const timeMin = '2024-01-01T00:00:00Z' // Start date (ISO format)
    const timeMax = '2024-12-31T23:59:59Z' // End date (ISO format)

    try {
      const events = await getCalendarEvents(
        oAuth2Client,
        'primary',
        timeMin,
        timeMax
      )

      const month_map = {
        '1': 'January',
        '2': 'February',
        '3': 'March',
        '4': 'April',
        '5': 'May',
        '6': 'June',
        '7': 'July',
        '8': 'August',
        '9': 'September',
        '10': 'October',
        '11': 'November',
        '12': 'December',
      }

      let travel_days_total_per_month = {
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0,
        '6': 0,
        '7': 0,
        '8': 0,
        '9': 0,
        '10': 0,
        '11': 0,
        '12': 0,
      }

      const filteredEvents = events.filter((event) =>
        event.summary.includes('[expense]')
      )

      for (const event of filteredEvents) {
        const start_date = event.start?.date
        const [start_year, start_month, start_day] = start_date?.split('-')

        const end_date = event.end?.date
        const [end_year, end_month, end_day] = end_date?.split('-')

        travel_days_total_per_month[start_month] +=
          Number(end_day) - Number(start_day)
      }

      // Iterate underlag
      for (const month in travel_days_total_per_month) {
        console.log(
          `Travel days in ${month_map[month]} is ${travel_days_total_per_month[month]}`
        )
      }
    } catch (err) {
      console.error('Error:', err.message)
    }
  } catch (error) {
    console.error('Error in scanEmails:', error)
    throw error
  }
}

// scanEmailAccount({
//   email: 'alfred@flexone.vc',
//   organization_id: 'b34cd74c-b805-416c-b4d9-a41dc0173d3c',
//   after: '2023/5/31',
//   before: '2024/6/1',
// })

scanEmailAccount2({
  email: 'alfred@flexone.vc',
  organization_id: 'b34cd74c-b805-416c-b4d9-a41dc0173d3c',
  after: '2023/5/31',
  before: '2024/6/1',
})

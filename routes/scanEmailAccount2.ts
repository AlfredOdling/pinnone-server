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

  const response = await openai.chat.completions.create({
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

              **renewal_start_date**
              Should be in the format: YYYY-MM-DD.
              This is the date for the start of the invoice period.

              **total_cost**
              This is the total cost of the invoice.
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

  return JSON.parse(response.choices[0].message.content)
}

const convertFileAndUpload = async (gmail, messageId: string, part: any) => {
  const attachment = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId: messageId,
    id: part.body.attachmentId,
  })

  const base64 = Buffer.from(attachment.data.data, 'base64')

  const filename = part.filename.replace('/', '')
  const urlSafeFileName = filename.replace(/[^a-zA-Z0-9-_.]/g, '')

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
    .upload(`${Date.now()}_${filename}.png`, fileBuffer, {
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

  // Cleanup temp files
  fs.unlinkSync('attachments_temp/' + filename)
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
  console.log('🚀  res:', res)

  const {
    vendor,
    renewal_start_date,
    total_cost,
    currency,
    invoice_or_receipt,
  } = res

  const filename = `receipts/${renewal_start_date}-${vendor}-${total_cost}-${currency}-${invoice_or_receipt}.png`
  const downloadUrl = fileUrl.publicUrl

  await downloadFile(downloadUrl, filename)
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
    const messages = response.data.messages.slice(0, 5) || []

    for (const message of messages) {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
      })

      const payload = msg.data.payload
      const parts = payload?.parts || []

      for (const part of parts) {
        if (part.filename && part.body && part.body.attachmentId) {
          await analyzeReceipt(gmail, message.id!, part)
        }
      }
    }
  } catch (error) {
    console.error('Error in scanEmails:', error)
    throw error
  }
}

scanEmailAccount({
  email: 'alfredodling@gmail.com',
  organization_id: 'b34cd74c-b805-416c-b4d9-a41dc0173d3c',
  after: '2024/12/3',
  before: '2025/1/1',
})

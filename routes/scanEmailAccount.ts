import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import fs from 'fs'
import OpenAI from 'openai'

import { OAuth2Client, UserRefreshClient } from 'google-auth-library'
import { zodResponseFormat } from 'openai/helpers/zod'
import { ToolCost } from './types'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'
import CloudConvert from 'cloudconvert'

dotenv.config()

const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY)

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

const runOpenaiVision = async (base64Image) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Fill out the following JSON with the information from the image.`,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    response_format: zodResponseFormat(ToolCost, 'toolCost'),
  })

  return JSON.parse(response.choices[0].message.content)
}

const prepareAttachment = async (gmail, messageId: string, part: any) => {
  const attachment = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId: messageId,
    id: part.body.attachmentId,
  })

  const base64 = Buffer.from(attachment.data.data, 'base64')

  const filename = part.filename.replace('/', '')
  fs.writeFileSync(`attachments_temp/${filename}`, base64)

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(filename, base64)

  const {
    data: { publicUrl },
  } = supabase.storage.from('receipts').getPublicUrl(uploadData.path)

  return publicUrl
}

const convertFile = async (fileUrl: string) => {
  let job = await cloudConvert.jobs.create({
    tasks: {
      'import-my-file': {
        operation: 'import/url',
        url: 'https://my.url/file.docx',
      },
      'convert-my-file': {
        operation: 'convert',
        input: 'import-my-file',
        output_format: 'pdf',
      },
      'export-my-file': {
        operation: 'export/url',
        input: 'convert-my-file',
      },
    },
  })
  job = await cloudConvert.jobs.wait(job.id)

  const writeStream = fs.createWriteStream('./out/' + file.filename)

  http.get(file.url, function (response) {
    response.pipe(writeStream)
  })

  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve)
    writeStream.on('error', reject)
  })
  return data.url
}

const updateDB = async (res: any, attachmentUrl: string) => {
  const vendors = await supabase
    .from('vendor')
    .select('*')
    .ilike('name', `%${res.vendor}%`)

  const tool_res = await supabase
    .from('tool')
    .insert({
      organization_id: 'b34cd74c-b805-416c-b4d9-a41dc0173d3c',
      vendor_id: vendors.data[0].id,
      status: 'not_in_stack',
      is_tracking: true,
      is_desktop_tool: false,
      department: 'IT',
      owner_org_user_id: 5,
    })
    .select('id')

  const subscription_res = await supabase.from('subscription').insert({
    tool_id: tool_res.data[0].id,
    currency: res.currency,
    next_renewal_date: res.renewal_next_date,
    receipt_file: attachmentUrl,
    starts_at: res.renewal_start_date,
    pricing_model: res.pricing_model,
    renewal_frequency: res.renewal_frequency,
    number_of_seats: res.number_of_seats,
    price_per_seat: res.price_per_seat,
    other_cost: res.other_cost,
    usage_based_cost: res.usage_based_cost,
    status: 'active',
    source: 'email',
  })
}

async function analyzeReceipt(gmail, messageId: string, part: any) {
  const fileUrl = await prepareAttachment(gmail, messageId, part)
  const convertedFileUrl = await convertFile(fileUrl)
  const res = await runOpenaiVision(convertedFileUrl)
  await updateDB(res, convertedFileUrl)
}

export const scanEmailAccount = async ({
  email,
  organization_id,
}: {
  email: string
  organization_id: string
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

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: '(invoice | receipt | faktura | kvitto) has:attachment',
    })
    const messages = response.data.messages.slice(0, 2) || []

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

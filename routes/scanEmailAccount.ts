import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import fs from 'fs'
import OpenAI from 'openai'

import { OAuth2Client, UserRefreshClient } from 'google-auth-library'
import { zodResponseFormat } from 'openai/helpers/zod'
import { IsB2BSaaSTool, ToolCost, VendorName } from './types'
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

const runOpenaiVision = async (base64Image: string) => {
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
            text: `Fill out the following JSON with the information from the image.`,
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
  fs.writeFileSync('attachments_temp/' + filename, base64)

  const document = await pdf('attachments_temp/' + filename, { scale: 3 })
  let filePathToUpload = ''

  let counter = 1
  for await (const image of document) {
    const fileName = 'attachments_temp/' + filename + '_' + counter + '.png'
    filePathToUpload = fileName
    fs.writeFileSync(fileName, image)
    console.log('🚀  filename:', filename)
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

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('receipts').getPublicUrl(data.path)

  // Cleanup temp files
  fs.unlinkSync('attachments_temp/' + filename)
  fs.unlinkSync(filePathToUpload)

  return { publicUrl, base64Image }
}

const updateDB = async (res: any, attachmentUrl: string) => {
  console.log('🚀  attachmentUrl:', attachmentUrl)

  const completion1 = await openai.beta.chat.completions.parse({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `This is the vendor name from an invoice. Is this a B2B SaaS tool? Exclude tools that are accounting, billing, invoicing, etc. My definition of B2B SaaS tool is tools similar to tools like Slack, Zoom, Notion, Supabase, Salesforce, Hubspot, Framer, ChatGPT, etc.`,
      },
      {
        role: 'user',
        content: JSON.stringify(res.vendor),
      },
    ],
    response_format: zodResponseFormat(IsB2BSaaSTool, 'isB2BSaaSTool'),
  })

  const isB2BSaaSTool = completion1.choices[0].message.parsed.is_b2b_saas_tool
  console.log('🚀  isB2BSaaSTool:', isB2BSaaSTool)

  if (!isB2BSaaSTool) {
    return
  }

  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Extract the vendor name from the following name. The name is from an invoice, so it might be a bit different than the actual name of the vendor. We just want the name of the vendor.`,
      },
      {
        role: 'user',
        content: JSON.stringify(res.vendor),
      },
    ],
    response_format: zodResponseFormat(VendorName, 'vendorName'),
  })

  const extracted_vendor_name =
    completion.choices[0].message.parsed.extracted_vendor_name

  console.log('🚀  extracted_vendor_name:', extracted_vendor_name)

  const vendors = await supabase
    .from('vendor')
    .select('*')
    .ilike(
      'name',
      `%${completion.choices[0].message.parsed.extracted_vendor_name}%`
    )

  console.log('🚀  vendors:', vendors)

  if (vendors.data.length === 0) {
  }

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
  console.log('🚀  tool_res:', tool_res)

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
  console.log('🚀  subscription_res:', subscription_res)
}

async function analyzeReceipt(gmail, messageId: string, part: any) {
  const fileUrl = await prepareAttachment(gmail, messageId, part)
  const res = await runOpenaiVision(fileUrl.base64Image)
  console.log('🚀  res:', res)
  await updateDB(res, fileUrl.publicUrl)
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
    const messages = response.data.messages.slice(0, 3) || []

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

import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import fs from 'fs'
import OpenAI from 'openai'

import { OAuth2Client, UserRefreshClient } from 'google-auth-library'
import { zodResponseFormat } from 'openai/helpers/zod'
import { IsB2BSaaSTool, NewVendor, ToolCost, VendorName } from './types'
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
              
              IMPORTANT 1: If you are unsure about the pricing model at all, just set the pricing model to FLAT_FEE,
              and set the flat_fee_cost to the total cost of the invoice.

              IMPORTANT 2: If you are unsure of the renewal_frequency at all, just set it to MONTHLY.

              --This is the instructions for the JSON fields--
              
              **vendor**
              This is the name of the company that is providing the service.

              **renewal_frequency**
              Most likely it will be MONTHLY. If you see evidence of that the invoice period is spanning 12 months, then it is likely YEARLY.
              If you see evidence of that the invoice period is spanning 3 months, then it is likely QUARTERLY.

              **renewal_start_date**
              Should be in the format: YYYY-MM-DD.
              This is the date for the start of the invoice period.

              **renewal_next_date**
              Should be in the format: YYYY-MM-DD.
              This is the date for the end of the invoice period.

              **pricing_model**
              Must be one of the following: FLAT_FEE | USAGE_BASED | PER_SEAT.
              
              Evidence for USAGE_BASED pricing model should be some measurement of unit usage.
              For example: compute, storage, network, disk, processing power, emails sent, number of something that has been used, or similar.
              
              Evidence for PER_SEAT pricing model should be that it says something about SEATS or USERS specifically.
              Its not enough with evidence that shows it to have price per unit.
              Price per unit and price per seat are NOT the same thing.
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
    response_format: zodResponseFormat(ToolCost, 'toolCost'),
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
  fs.writeFileSync('attachments_temp/' + filename, base64)

  const document = await pdf('attachments_temp/' + filename, { scale: 3 })
  let filePathToUpload = ''

  let counter = 1
  for await (const image of document) {
    const fileName = 'attachments_temp/' + filename + '_' + counter + '.png'
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

const extractVendorName = async (vendor) => {
  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `
        Extract the vendor name from the following name. 
        The name is from an invoice, so it might be a bit different than the actual name of the vendor.
        We just want the name of the vendor.
        
        For example, if the name is "Framer B.V.", return "Framer". And if the is "Supabase Pte. Ltd.", return "Supabase".
        And so on.
        `,
      },
      {
        role: 'user',
        content: vendor,
      },
    ],
    response_format: zodResponseFormat(VendorName, 'vendorName'),
  })

  return completion.choices[0].message.parsed.extracted_vendor_name
}

const isB2BSaaSTool = async (vendorName) => {
  const completion1 = await openai.beta.chat.completions.parse({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `This is the vendor name from an invoice. Is this a B2B SaaS tool? Exclude tools that are accounting, billing, invoicing, etc. My definition of B2B SaaS tool is tools similar to tools like Slack, Zoom, Notion, Supabase, Salesforce, Hubspot, Framer, ChatGPT, etc.`,
      },
      {
        role: 'user',
        content: vendorName,
      },
    ],
    response_format: zodResponseFormat(IsB2BSaaSTool, 'isB2BSaaSTool'),
  })

  return completion1.choices[0].message.parsed.is_b2b_saas_tool
}

const addNewVendor = async (vendorName: string) => {
  const completion2 = await openai.beta.chat.completions.parse({
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: 'system',
        content:
          'You are a professional data analyst, that knows everything about the B2B SaaS market. ' +
          'You are given a name of a SaaS app. Fetch data about the app.',
      },
      {
        role: 'user',
        content: vendorName,
      },
    ],
    response_format: zodResponseFormat(NewVendor, 'newVendor'),
  })

  const vendor_ = completion2.choices[0].message.parsed.children

  const vendor = await supabase
    .from('vendor')
    .upsert(
      {
        name: vendor_.name,
        description: vendor_.description,
        url: vendor_.url,
        root_domain: vendor_.root_domain,
        logo_url: vendor_.logo_url,
        category: vendor_.category,
        link_to_pricing_page: vendor_.link_to_pricing_page,
      },
      {
        onConflict: 'root_domain',
        ignoreDuplicates: true,
      }
    )
    .select('id')
    .single()

  return vendor
}

const updateToolAndSubscription = async (
  res: any,
  attachmentUrl: string,
  organization_id: string,
  email: string
) => {
  const vendorNameRaw = JSON.stringify(res.vendor)
  console.log('🚀  vendorNameRaw:', vendorNameRaw)

  const extracted_vendor_name = await extractVendorName(vendorNameRaw)
  console.log('🚀  extracted_vendor_name:', extracted_vendor_name)

  const isB2BSaaSTool_ = await isB2BSaaSTool(extracted_vendor_name)
  console.log('🚀  isB2BSaaSTool_:', isB2BSaaSTool_)
  if (!isB2BSaaSTool_) return

  const existingVendor = await supabase // Don't know what happens if there are multiple vendors with kind of the same name
    .from('vendor')
    .select('*')
    .ilike('name', `%${extracted_vendor_name}%`)
    .single()
  console.log('🚀  existingVendor:', existingVendor)

  let vendor_id
  if (!existingVendor.data) {
    const newVendor = await addNewVendor(extracted_vendor_name)
    console.log('🚀  newVendor:', newVendor)
    vendor_id = newVendor.data.id
  } else {
    vendor_id = existingVendor.data.id
  }
  console.log('🚀  vendor_id:', vendor_id)

  let tool_res = await supabase
    .from('tool')
    .select('id')
    .eq('organization_id', organization_id)
    .eq('vendor_id', vendor_id)
    .single()
  let tool_id = tool_res.data?.id
  console.log('🚀  tool_res_error 1:', tool_res.error)

  if (!tool_id) {
    tool_res = await supabase
      .from('tool')
      .insert({
        organization_id,
        vendor_id,
        status: 'in_stack',
        is_tracking: true,
        is_desktop_tool: false,
      })
      .select('id')
      .single()
    tool_id = tool_res.data?.id

    console.log('🚀  tool_res_error 2:', tool_res.error)
  }

  const existing_subscriptions = await supabase
    .from('subscription')
    .select('*')
    .eq('tool_id', tool_id)

  console.log('🚀  existing_subscriptions:', existing_subscriptions)

  let same_starts_at = false
  let same_next_renewal_date = false
  let same_flat_fee_cost = false
  let same_price_per_seat = false
  let same_usage_based_cost = false
  let same_other_cost = false

  existing_subscriptions?.data?.forEach(
    ({
      starts_at,
      next_renewal_date,
      flat_fee_cost,
      price_per_seat,
      usage_based_cost,
      other_cost,
    }) => {
      same_starts_at = res.renewal_start_date === starts_at
      same_next_renewal_date = res.renewal_next_date === next_renewal_date
      same_flat_fee_cost = res.flat_fee_cost === flat_fee_cost
      same_price_per_seat = res.price_per_seat === price_per_seat
      same_usage_based_cost = res.usage_based_cost === usage_based_cost
      same_other_cost = res.other_cost === other_cost
    }
  )

  let has_conflict = false
  let conflict_info = ''

  if (same_starts_at && same_next_renewal_date) {
    has_conflict = true
    conflict_info =
      'Invoice period is overlapping with existing invoice this month'
  }

  const subscription_res = await supabase.from('subscription').insert({
    tool_id,
    currency: res.currency,
    renewal_frequency: res.renewal_frequency,
    starts_at: res.renewal_start_date,
    next_renewal_date: res.renewal_next_date,
    receipt_file: attachmentUrl,
    pricing_model: res.pricing_model,
    flat_fee_cost: res.flat_fee_cost,
    number_of_seats: res.number_of_seats,
    price_per_seat: res.price_per_seat,
    other_cost: res.other_cost,
    usage_based_cost: res.usage_based_cost,
    status: 'ACTIVE',
    source: 'gmail',
    has_conflict,
    email_recipient: email,
    conflict_info,
  })
  console.log('🚀  subscription_res_error:', subscription_res.error)

  const email_account_res = await supabase
    .from('email_account')
    .update({
      last_scanned: new Date().toISOString(),
    })
    .eq('email', email)
    .eq('organization_id', organization_id)
  console.log('🚀  email_account_res_error:', email_account_res.error)
}

async function analyzeReceipt(
  gmail,
  messageId: string,
  part: any,
  organization_id: string,
  email: string
) {
  const fileUrl = await convertFileAndUpload(gmail, messageId, part)
  const res = await analyzeReceiptWithOpenAI(fileUrl.base64Image)
  console.log('🚀  res:', res)

  await updateToolAndSubscription(
    res,
    fileUrl.publicUrl,
    organization_id,
    email
  )
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
          await analyzeReceipt(gmail, message.id!, part, organization_id, email)
        }
      }
    }
  } catch (error) {
    console.error('Error in scanEmails:', error)
    throw error
  }
}

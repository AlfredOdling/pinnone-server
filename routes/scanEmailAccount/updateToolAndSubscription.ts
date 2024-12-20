import path from 'path'
import fs from 'fs'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'
import { extractVendorName } from './extractVendorName'
import { isB2BSaaSTool } from './isB2BSaaSTool'
import { addNewVendor } from './addNewVendor'
import { getInfo } from './getInfo'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const generateVendor = async (extracted_vendor_name: string) => {
  let vendor
  const existingVendor = await supabase
    .from('vendor')
    .select('*')
    .ilike('name', `%${extracted_vendor_name}%`)
    .throwOnError()

  if (!existingVendor.data) {
    const newVendor = await addNewVendor(extracted_vendor_name)
    vendor = newVendor.data
  } else {
    vendor = existingVendor.data[0]
  }

  return vendor
}

const generateTool = async ({
  organization_id,
  vendor,
  isB2BSaaSTool_,
  owner_org_user_id,
}) => {
  let tool_res = await supabase
    .from('tool')
    .select('id')
    .eq('organization_id', organization_id)
    .eq('vendor_id', vendor.id)
    .single()
  let tool = tool_res.data

  if (!tool) {
    tool_res = await supabase
      .from('tool')
      .insert({
        organization_id,
        vendor_id: vendor.id,
        status: 'in_stack',
        is_tracking: isB2BSaaSTool_,
        is_desktop_tool: !isB2BSaaSTool_,
        department: vendor.category,
        owner_org_user_id,
        type: isB2BSaaSTool_ ? 'b2b_tool' : 'other',
      })
      .select('id')
      .single()
      .throwOnError()
    tool = tool_res.data
  }

  return tool
}

const generateWarningInfo = async ({ res, tool }) => {
  const existing_subscriptions = await supabase
    .from('subscription')
    .select('*')
    .eq('tool_id', tool.id)

  let same_starts_at = false
  let same_next_renewal_date = false
  let same_flat_fee_cost = false
  let same_price_per_seat = false
  let same_usage_based_cost = false
  let same_other_cost = false
  let same_month = false

  const extractDate = (input: string) => input.split('T')[0]

  existing_subscriptions?.data?.forEach(
    ({
      renewal_start_date,
      renewal_next_date,
      flat_fee_cost,
      price_per_seat,
      usage_based_cost,
      other_cost,
    }) => {
      same_starts_at =
        res.renewal_start_date === extractDate(renewal_start_date)
      same_next_renewal_date =
        res.renewal_next_date === extractDate(renewal_next_date)

      same_flat_fee_cost = res.flat_fee_cost === flat_fee_cost
      same_price_per_seat = res.price_per_seat === price_per_seat
      same_usage_based_cost = res.usage_based_cost === usage_based_cost
      same_other_cost = res.other_cost === other_cost

      same_month =
        res.renewal_start_date.split('-')[1] ===
        extractDate(renewal_start_date).split('-')[1]
    }
  )

  // --- Check for conflicts ---
  let same_cost =
    same_flat_fee_cost ||
    same_price_per_seat ||
    same_usage_based_cost ||
    same_other_cost

  let warning_info = ''

  if (same_starts_at && same_next_renewal_date) {
    warning_info = 'You have invoices with the same start and end date.'
  }

  if (same_cost && same_month) {
    warning_info += ' You have invoices with the same cost this month.'
  }

  if (res.important_info) {
    warning_info += ' ' + res.important_info
  }

  return warning_info
}

const insertSubscription = async ({
  res,
  tool,
  attachmentUrl,
  msg,
  isB2BSaaSTool_,
  email,
  warning_info,
}) => {
  const email_info = await getInfo(msg)

  await supabase
    .from('subscription')
    .insert({
      tool_id: tool.id,
      currency: res.currency,
      renewal_frequency: res.renewal_frequency,

      renewal_start_date: res.renewal_start_date,
      renewal_next_date: res.renewal_next_date,
      due_date: res.due_date || null,
      date_of_invoice: res.date_of_invoice,
      email_received: new Date(email_info.date).toISOString(),

      receipt_file: attachmentUrl,
      pricing_model: res.pricing_model,
      flat_fee_cost: res.flat_fee_cost,
      number_of_seats: res.number_of_seats,
      price_per_seat: res.price_per_seat,
      other_cost: res.other_cost,
      usage_based_cost: res.usage_based_cost,
      status: 'ACTIVE',
      source: 'gmail',
      email_recipient: email,
      warning_info,
      email_info,
      type: isB2BSaaSTool_ ? 'b2b_tool' : 'other',
      total_cost: res.total_cost,
    })
    .throwOnError()
}

const updateEmailAccountLastScannedDate = async ({
  email,
  organization_id,
}) => {
  await supabase
    .from('email_account')
    .update({
      last_scanned: new Date().toISOString(),
    })
    .eq('email', email)
    .eq('organization_id', organization_id)
    .throwOnError()
}

export const updateToolAndSubscription = async ({
  res,
  attachmentUrl,
  organization_id,
  email,
  msg,
  owner_org_user_id,
}) => {
  console.log('🚀 res:', res)

  try {
    const vendorNameRaw = JSON.stringify(res.vendor)
    const extracted_vendor_name = await extractVendorName(vendorNameRaw)
    const isB2BSaaSTool_ = await isB2BSaaSTool(vendorNameRaw)
    const vendor = await generateVendor(extracted_vendor_name)

    const tool = await generateTool({
      organization_id,
      vendor,
      isB2BSaaSTool_,
      owner_org_user_id,
    })

    const warning_info = await generateWarningInfo({ res, tool })

    await insertSubscription({
      res,
      tool,
      attachmentUrl,
      msg,
      isB2BSaaSTool_,
      email,
      warning_info,
    })

    await updateEmailAccountLastScannedDate({ email, organization_id })
  } catch (error) {
    console.log('🚀  error:', error)
  }

  // Remove all files in temp folder
  const attachmentsFolder = 'temp/attachments'
  fs.readdirSync(attachmentsFolder).forEach((file) => {
    fs.unlinkSync(path.join(attachmentsFolder, file))
  })

  const receiptsFolder = 'temp/receipts'
  fs.readdirSync(receiptsFolder).forEach((file) => {
    fs.unlinkSync(path.join(receiptsFolder, file))
  })
}

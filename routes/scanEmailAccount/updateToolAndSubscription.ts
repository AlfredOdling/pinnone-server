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

export const updateToolAndSubscription = async ({
  res,
  attachmentUrl,
  organization_id,
  email,
  msg,
  owner_org_user_id,
}) => {
  const vendorNameRaw = JSON.stringify(res.vendor)
  console.log('🚀  vendorNameRaw:', vendorNameRaw)

  const extracted_vendor_name = await extractVendorName(vendorNameRaw)
  console.log('🚀  extracted_vendor_name:', extracted_vendor_name)

  const isB2BSaaSTool_ = await isB2BSaaSTool(vendorNameRaw)
  console.log('🚀  isB2BSaaSTool_:', isB2BSaaSTool_)
  // if (!isB2BSaaSTool_) return

  const existingVendor = await supabase // Don't know what happens if there are multiple vendors with kind of the same name
    .from('vendor')
    .select('*')
    .ilike('name', `%${extracted_vendor_name}%`)
    .single()
  console.log('🚀  existingVendor:', existingVendor)

  let vendor
  if (!existingVendor.data) {
    const newVendor = await addNewVendor(extracted_vendor_name)
    console.log('🚀  newVendor:', newVendor)
    vendor = newVendor.data
  } else {
    vendor = existingVendor.data
  }
  console.log('🚀  vendor:', vendor)

  let tool_res = await supabase
    .from('tool')
    .select('id')
    .eq('organization_id', organization_id)
    .eq('vendor_id', vendor.id)
    .single()
  let tool_id = tool_res.data?.id
  console.log('🚀  tool_res_error 1:', tool_res.error)

  if (!tool_id) {
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
  let same_month = false
  const extractDate = (input: string) => input.split('T')[0]

  existing_subscriptions?.data?.forEach(
    ({
      starts_at,
      next_renewal_date,
      flat_fee_cost,
      price_per_seat,
      usage_based_cost,
      other_cost,
    }) => {
      same_starts_at = res.renewal_start_date === extractDate(starts_at)
      same_next_renewal_date =
        res.renewal_next_date === extractDate(next_renewal_date)

      same_flat_fee_cost = res.flat_fee_cost === flat_fee_cost
      same_price_per_seat = res.price_per_seat === price_per_seat
      same_usage_based_cost = res.usage_based_cost === usage_based_cost
      same_other_cost = res.other_cost === other_cost

      same_month =
        res.renewal_start_date.split('-')[1] ===
        extractDate(starts_at).split('-')[1]
    }
  )

  let same_cost =
    same_flat_fee_cost ||
    same_price_per_seat ||
    same_usage_based_cost ||
    same_other_cost
  let has_conflict = false
  let conflict_info = ''

  if (same_starts_at && same_next_renewal_date) {
    has_conflict = true
    conflict_info = 'You have invoices with the same start and end date.'
  }

  if (same_cost && same_month) {
    has_conflict = true
    conflict_info += ' You have invoices with the same cost this month.'
  }

  if (res.important_info) {
    has_conflict = true
    conflict_info += ' ' + res.important_info
  }

  const email_info = await getInfo(msg)

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
    email_info,
    type: isB2BSaaSTool_ ? 'b2b_tool' : 'other',
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

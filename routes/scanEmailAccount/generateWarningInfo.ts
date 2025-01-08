import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const generateWarningInfo = async ({
  res,
  senderId,
}: {
  res: any
  senderId: number
}) => {
  const existing_subscriptions = await supabase
    .from('receipt')
    .select('*')
    .eq('sender_id', senderId)

  console.log('🚀  existing_subscriptions:', existing_subscriptions)

  let same_starts_at = false
  let same_next_renewal_date = false
  let same_flat_fee_cost = false
  let same_price_per_seat = false
  let same_usage_based_cost = false
  let same_other_cost = false
  let same_month = false

  const extractDate = (input: string) =>
    input.includes('T') ? input.split('T')[0] : input

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

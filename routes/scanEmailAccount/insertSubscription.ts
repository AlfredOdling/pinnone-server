import * as dotenv from 'dotenv'
import { getInfo } from './getInfo'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

dotenv.config()
const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const insertSubscription = async ({
  res,
  tool,
  attachmentUrl,
  msg,
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
      type: res.type,
      total_cost: res.total_cost,
    })
    .throwOnError()
}

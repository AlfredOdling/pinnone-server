import * as dotenv from 'dotenv'
import { getInfo } from './getInfo'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

type Tool = Database['public']['Tables']['tool']['Row']

export const insertSubscription = async ({
  res,
  tool,
  attachmentUrl,
  msg,
  email,
  warning_info,
}: {
  res: any
  tool: Tool
  attachmentUrl: string
  msg: any
  email: string
  warning_info: string
}) => {
  const email_info = await getInfo(msg)

  const {
    renewal_start_date,
    renewal_next_date,
    renewal_frequency,
    currency,
    total_cost,
    pricing_model,
    flat_fee_cost,
    number_of_seats,
    price_per_seat,
    other_cost,
    usage_based_cost,
    due_date,
    date_of_invoice,
    type,
  } = res

  await supabase
    .from('subscription')
    .upsert({
      tool_id: tool.id,
      currency,
      renewal_frequency,

      renewal_start_date: renewal_start_date || null,
      renewal_next_date: renewal_next_date || null,
      due_date: due_date || null,
      date_of_invoice: date_of_invoice || null,
      email_received: new Date(email_info.date).toISOString(),

      receipt_file: attachmentUrl,
      pricing_model,
      flat_fee_cost,
      number_of_seats,
      price_per_seat,
      other_cost,
      usage_based_cost,
      status: 'ACTIVE',
      source: 'gmail',
      email_recipient: email,
      warning_info,
      email_info,
      type,
      total_cost,
    })
    .throwOnError()
}

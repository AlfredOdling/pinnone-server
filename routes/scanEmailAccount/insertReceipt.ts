import * as dotenv from 'dotenv'
import { getInfo } from './getInfo'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'
// import { generateWarningInfo } from './generateWarningInfo'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const insertReceipt = async ({
  senderId,
  res,
  attachmentUrl,
  msg,
  email,
  messageId,
  type,
}: {
  senderId: number
  res: any
  attachmentUrl: string
  msg: any
  email: string
  messageId: string
  type: string
}) => {
  const email_info = await getInfo(msg, type)
  // const warning_info = await generateWarningInfo({ res, senderId })

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
    type_res,
    ocr,
    bank_number,
    document_type,
  } = res

  const res2 = await supabase.from('receipt').upsert({
    sender_id: senderId,
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
    source: 'gmail',
    email_recipient: email,
    // warning_info,
    email_info,
    type: type_res,
    total_cost,
    email_id: messageId,
    ocr,
    bank_number,
    document_type,
  })
}

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 2025-01-01T00:00:00+00:00 should be 2025-01-01
const formatDate = (date: string) => {
  return new Date(date).toISOString().split('T')[0]
}

export const checkForDuplicates = async ({ res }) => {
  const sendersWithReceipts = await supabase
    .from('sender')
    .select('*, receipt(*)')
    .eq('name', res.vendor_name_raw)

  const receipts = sendersWithReceipts.data?.[0]?.receipt
  if (!receipts) return false

  let isDuplicate = false
  for (const receipt of receipts) {
    isDuplicate =
      formatDate(receipt.renewal_start_date) === res.renewal_start_date &&
      formatDate(receipt.renewal_next_date) === res.renewal_next_date &&
      receipt.ocr === res.ocr &&
      receipt.total_cost === res.total_cost

    console.log(
      '🚀  duplication reasoning:',

      isDuplicate,
      res.vendor_name_raw,
      formatDate(receipt.renewal_start_date),
      res.renewal_start_date
    )

    if (isDuplicate) break
  }

  return isDuplicate
}

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
      receipt.renewal_start_date === res.renewal_start_date &&
      receipt.renewal_next_date === res.renewal_next_date &&
      receipt.ocr === res.ocr &&
      receipt.total_cost === res.total_cost

    console.log(
      '🚀  duplication reasoning:',

      isDuplicate,
      res.vendor_name_raw,
      receipt.renewal_start_date,
      res.renewal_start_date
    )

    if (isDuplicate) break
  }

  return isDuplicate
}

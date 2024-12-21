import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const updateEmailAccountLastScannedDate = async ({
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

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const resetScans = async () => {
  const { data, error } = await supabase.from('organization').select('*')

  if (error) {
    throw error
  }

  for (const organization of data) {
    await supabase
      .from('organization')
      .update({
        scanned_emails: 0,
      })
      .eq('id', organization.id)
      .throwOnError()
  }
}

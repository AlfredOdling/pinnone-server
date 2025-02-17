import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'
import { reportUsage } from '../stripeFunctions'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const updateUsage = async ({ organization_id }) => {
  const organization = await supabase
    .from('organization')
    .select('*')
    .eq('id', organization_id)
    .single()
  console.log('🚀 updateUsage organization:', organization)

  const { scanned_emails, stripe_customer_id, onboarded } =
    organization?.data || {}

  if (organization.error) throw organization.error
  // if (!onboarded) return

  if (scanned_emails > 20) {
    await reportUsage({
      event_name: 'email_scans',
      stripe_customer_id,
      value: 1,
    })
  }

  await supabase
    .from('organization')
    .update({
      scanned_emails: scanned_emails + 1,
    })
    .eq('id', organization_id)
    .throwOnError()
}

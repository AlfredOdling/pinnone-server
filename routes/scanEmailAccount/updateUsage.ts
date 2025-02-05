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
  console.log('🚀  organization:', organization)
  const { scanned_emails, stripe_subscription_id, onboarded } =
    organization?.data || {}

  if (organization.error) throw organization.error
  if (!onboarded) return

  await supabase
    .from('organization')
    .update({
      scanned_emails: scanned_emails + 1,
    })
    .eq('id', organization_id)
    .throwOnError()

  if (scanned_emails > 20) {
    await reportUsage({
      usageQuantity: 1,
      stripe_subscription_id,
    })
  }
}

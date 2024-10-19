import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'
import { decrypt, getOrgId, getBrowserHistoryWithVendorId } from './utils'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const syncBrowserHistory = async ({
  encryptedData,
  userId,
}: {
  encryptedData: string
  userId: string
}) => {
  const browserHistory = decrypt(encryptedData)
  const org_id = await getOrgId({ userId })

  const tools = await supabase
    .from('tools')
    .select('*, vendors!inner(*)') // Select the vendors associated with the tools
    .eq('is_tracking', true) // Filter the tools that the org is tracking
    .eq('organization_id', org_id)

  const browserHistoryWithVendorId = getBrowserHistoryWithVendorId(
    browserHistory,
    tools.data,
    userId,
    org_id
  )

  try {
    const user_activity = await supabase
      .from('user_activity')
      .upsert(browserHistoryWithVendorId, {
        onConflict: 'user_id, vendor_id, last_visited',
        ignoreDuplicates: true,
      })

    if (user_activity.error) throw new Error(user_activity.error.message)

    console.log('✅ User activity updated successfully')
  } catch (error) {
    console.error('Error updating user activity:', error)
    throw new Error('Failed to update user activity')
  }
}

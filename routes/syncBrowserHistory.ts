import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'
import { decrypt, getBrowserHistoryWithVendorId, getRootDomain } from './utils'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const syncBrowserHistory = async ({
  encryptedData,
  userId,
  organization_id,
}: {
  encryptedData: string
  userId: string
  organization_id: string
}) => {
  const browserHistory = decrypt(encryptedData)
  console.log('ℹ️ syncBrowserHistory for')
  console.table({ userId, organization_id })

  await detectUntrackedTools({
    browserHistory,
    organization_id,
  })

  return await pushNewUserActivity({
    browserHistory,
    organization_id,
    userId,
  })
}

/**
 * If there is a match between the user browser history and the vendor list,
 * add new tools with the status: not_in_stack
 */
const detectUntrackedTools = async ({ browserHistory, organization_id }) => {
  let detectedRootDomains = browserHistory
    .map((visit) => getRootDomain(visit.url))
    .filter((x) => x)

  // Dedupe
  detectedRootDomains = [...new Set(detectedRootDomains)]
  console.info('🧑🏼‍💻 Detected root domains:', detectedRootDomains)

  const vendors = await supabase
    .from('vendors')
    .select('*')
    .in('root_domain', detectedRootDomains)

  return await supabase
    .from('tools')
    .upsert(
      vendors.data.map((vendor) => ({
        vendor_id: vendor.id,
        organization_id,
        department: vendor.category,
        status: 'not_in_stack',
        is_tracking: false,
      })),
      {
        onConflict: 'vendor_id',
        ignoreDuplicates: true,
      }
    )
    .throwOnError()
}

/**
 * If there is a match between the user browser history and the tools
 * that the org is tracking, push new user_activity
 */
const pushNewUserActivity = async ({
  organization_id,
  browserHistory,
  userId,
}) => {
  const tools = await supabase
    .from('tools')
    .select('*, vendors!inner(*)') // Select the vendors associated with the tools
    .eq('is_tracking', true) // Filter the tools that the org is tracking
    .eq('organization_id', organization_id)

  const browserHistoryWithVendorId = getBrowserHistoryWithVendorId(
    browserHistory,
    tools.data,
    userId
  )

  return await supabase
    .from('user_activity')
    .upsert(browserHistoryWithVendorId, {
      onConflict: 'user_id, vendor_id, last_visited',
      ignoreDuplicates: true,
    })
    .throwOnError()
}

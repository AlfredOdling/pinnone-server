import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'
import { decrypt, getRootDomain, getUserActivities } from './utils'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const syncBrowserHistory = async ({
  encryptedData,
  org_user_id,
  organization_id,
}: {
  encryptedData: string
  org_user_id: number
  organization_id: string
}) => {
  const browserHistory = decrypt(encryptedData)
  // console.log('🚀  browserHistory:', browserHistory)

  await detectUntrackedTools({
    browserHistory,
    organization_id,
  })

  await pushNewUserActivity({
    browserHistory,
    organization_id,
    org_user_id,
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
    .from('vendor')
    .select('*')
    .in('root_domain', detectedRootDomains)

  console.info(
    '⭐️ Detected vendors:',
    vendors.data.map((v) => v.root_domain)
  )

  const newTools = vendors.data.map((vendor) => ({
    vendor_id: vendor.id,
    organization_id,
    department: vendor.category,
    status: 'not_in_stack',
    is_tracking: false,
  }))

  console.log('🚀  newTools:', newTools)

  await supabase
    .from('tool')
    .upsert(newTools, {
      onConflict: 'vendor_id, organization_id',
      ignoreDuplicates: true,
    })
    .throwOnError()
}

/**
 * If there is a match between the user browser history and the tools
 * that the org is tracking, push new user_activity
 */
const pushNewUserActivity = async ({
  organization_id,
  browserHistory,
  org_user_id,
}) => {
  const tools = await supabase
    .from('tool')
    .select('*, vendor!inner(*)') // Select the vendors associated with the tools
    .eq('is_tracking', true) // Filter the tools that the org is tracking
    .eq('organization_id', organization_id)

  const userActivities: any = getUserActivities({
    browserHistory,
    tools: tools.data,
    org_user_id,
  })
  console.log('🚀 new user activities:', userActivities)

  await supabase
    .from('user_activity')
    .upsert(userActivities, {
      onConflict: 'org_user_id, tool_id, last_visited',
      ignoreDuplicates: true,
    })
    .throwOnError()
}

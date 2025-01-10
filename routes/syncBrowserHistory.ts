import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'
import {
  decrypt,
  getUserActivities,
  getVendorRootDomains,
  updateNotification,
} from './utils'

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
  await updateNotification(
    organization_id,
    'activity_sync_browser_history_started'
  )

  const browserHistory = decrypt(encryptedData)

  await addOrgVendors({
    browserHistory,
    organization_id,
  })

  await pushNewUserActivity({
    browserHistory,
    organization_id,
    org_user_id,
  })

  await updateNotification(
    organization_id,
    'activity_sync_browser_history_finished'
  )
}

/**
 * If there is a match between the user browser history and the vendor list,
 * add new org_vendors (from the official vendor list) with status: not_in_stack
 */
const addOrgVendors = async ({ browserHistory, organization_id }) => {
  const detectedRootDomains = getVendorRootDomains(browserHistory)
  console.info('🧑🏼‍💻 Detected root domains:', detectedRootDomains)

  if (!detectedRootDomains.length) {
    await updateNotification(organization_id, 'activity_no_vendors_detected')
    return console.log('No vendors to add')
  }

  const vendors = await supabase
    .from('vendor')
    .select('*')
    .in('root_domain', detectedRootDomains)

  console.info(
    '⭐️ Detected vendors:',
    vendors.data.map((v) => v.root_domain)
  )

  const newOrgVendors = vendors.data
    .map((vendor) => ({
      name: vendor.name,
      description: vendor.description,
      url: vendor.url,
      category: vendor.category,
      logo_url: vendor.logo_url,
      link_to_pricing_page: vendor.link_to_pricing_page,
      root_domain: vendor.root_domain,
      organization_id,
      status: 'not_in_stack',
    }))
    .filter((tool) => tool.status !== 'blocked')

  await supabase.from('org_vendor').upsert(newOrgVendors, {
    onConflict: 'root_domain',
    ignoreDuplicates: true,
  })

  await updateNotification(organization_id, 'activity_new_vendors_detected', {
    vendor_count: newOrgVendors.length,
  })
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
    .select('*, sender(*)') // Select the vendors associated with the tools
    .eq('is_tracking', true) // Filter the tools that the org is tracking
    .eq('status', 'in_stack')
    .eq('organization_id', organization_id)

  const userActivities: any = getUserActivities({
    browserHistory,
    tools: tools.data,
    org_user_id,
  })

  await supabase
    .from('user_activity')
    .upsert(userActivities, {
      onConflict: 'org_user_id, tool_id, last_visited',
      ignoreDuplicates: true,
    })
    .throwOnError()

  await updateNotification(
    organization_id,
    'activity_new_user_activities_detected',
    {
      user_activity_count: userActivities.length,
    }
  )
}

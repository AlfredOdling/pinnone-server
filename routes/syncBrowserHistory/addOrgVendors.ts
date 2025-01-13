import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../../types/supabase'
import { getVendorRootDomains, updateNotification } from '../utils'
import { mapOrgVendorsWithSenders } from './mapOrgVendorsWithSenders'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * If there is a match between the user browser history and the vendor list,
 * add new org_vendors (from the official vendor list) with status: not_in_stack
 */
export const addOrgVendors = async ({ browserHistory, organization_id }) => {
  const detectedRootDomains = getVendorRootDomains(browserHistory)

  if (!detectedRootDomains.length) {
    return await updateNotification({
      organization_id,
      title: 'Finished scanning new vendors',
      dataObject: 'No new vendors detected',
      tag: 'activity_finished',
    })
  }

  const officialVendors = await supabase
    .from('vendor')
    .select('*')
    .in('root_domain', detectedRootDomains)

  const newOrgVendors = officialVendors.data
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

  await updateNotification({
    organization_id,
    title: 'New vendors detected',
    tag: 'activity_finished',
    dataObject: `Detected: ${[
      ...new Set(newOrgVendors.map((v) => v.root_domain)),
    ].join(', ')}`,
  })

  await mapOrgVendorsWithSenders({ organization_id, newOrgVendors })
}

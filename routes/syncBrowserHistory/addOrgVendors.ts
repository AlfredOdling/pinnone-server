import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../../types/supabase'
import { updateNotification } from '../utils'
import { mapOrgVendorsWithSenders } from './mapOrgVendorsWithSenders'
import { extractB2BRootDomain } from './utils'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * If there is a match between the user browser history and the vendor list,
 * add new org_vendors (from the official vendor list) with status: not_in_stack
 */
export const addOrgVendors = async ({
  browserHistory,
  organization_id,
  owner_org_user_id,
}) => {
  const detectedRootDomains = browserHistory
    .map(({ url }) => extractB2BRootDomain(url))
    .filter((domain) => domain) // Remove null values
    .filter((domain, index, self) => self.indexOf(domain) === index) // Remove duplicates

  const officialVendors_ = await supabase
    .from('vendor')
    .select('*')
    .in('root_domain', detectedRootDomains)

  const officialVendors = officialVendors_.data.filter(
    (vendor) => vendor.status !== 'blocked'
  )

  if (!officialVendors.length) {
    return await updateNotification({
      organization_id,
      title: 'Finished scanning new vendors',
      dataObject: 'No new vendors detected',
      tag: 'activity_finished',
    })
  }

  const newOrgVendors = officialVendors.map((vendor) => ({
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

  if (newOrgVendors.length > 0) {
    await updateNotification({
      organization_id,
      title: 'New vendors detected',
      tag: 'activity_finished',
      dataObject: `Detected: ${[
        ...new Set(newOrgVendors.map((v) => v.root_domain)),
      ].join(', ')}`,
    })

    await mapOrgVendorsWithSenders({
      organization_id,
      newOrgVendors,
      owner_org_user_id,
    })
  }
}

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
const log = false

/**
 * If there is a match between the user browser history and the vendor list,
 * add new org_vendors (from the official vendor list) with status: not_in_stack
 */
export const addOrgVendors = async ({
  browserHistory,
  organization_id,
  owner_org_user_id,
}) => {
  log &&
    console.log(
      '🚀 0 organization_id, owner_org_user_id',
      organization_id,
      owner_org_user_id
    )

  const detectedRootDomains = browserHistory
    .map(({ url }) => extractB2BRootDomain(url))
    .filter((domain) => domain) // Remove null values
    .filter((domain, index, self) => self.indexOf(domain) === index) // Remove duplicates

  log &&
    console.log('🚀 1 detectedRootDomains:', detectedRootDomains.slice(0, 5))

  const officialVendors_ = await supabase
    .from('vendor')
    .select('*')
    .in('root_domain', detectedRootDomains)

  log &&
    console.log('🚀 2 officialVendors_:', officialVendors_.data.slice(0, 2))

  const officialVendors = await Promise.resolve(
    officialVendors_.data.filter((vendor) => vendor.status !== 'blocked')
  )

  log && console.log('🚀 3 officialVendors:', officialVendors.slice(0, 2))

  const newOrgVendors = await Promise.resolve(
    officialVendors.map((vendor) => ({
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
  )

  log && console.log('🚀 4 newOrgVendors:', newOrgVendors.slice(0, 2))

  if (newOrgVendors.length > 0) {
    log && console.log('🚀 5 New vendors detected')

    // Upsert and get the new org_vendors
    const org_vendors = await supabase
      .from('org_vendor')
      .upsert(newOrgVendors, {
        onConflict: 'root_domain, organization_id',
        ignoreDuplicates: true,
      })
      .select('*')

    log && console.log('🚀 6 org_vendors:', org_vendors)

    if (org_vendors.data?.length > 0) {
      await updateNotification({
        organization_id,
        title: `${newOrgVendors.length} new tools detected.`,
        tag: 'activity_finished',
        dataObject: `Detected: ${[
          ...new Set(org_vendors.data.map((v) => v.root_domain)),
        ].join(', ')}. Find them under Software -> Detected`,
      })

      await mapOrgVendorsWithSenders({
        organization_id,
        newOrgVendors,
        owner_org_user_id,
        org_vendors,
      })
    } else {
      log && console.log('🚀 7 No new vendors detected')

      return await updateNotification({
        organization_id,
        title: `No new tools detected.`,
        dataObject: 'No new vendors detected',
        tag: 'activity_finished',
      })
    }
  }
}

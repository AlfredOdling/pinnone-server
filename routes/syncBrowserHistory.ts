import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'
import {
  decrypt,
  getUserActivities,
  getVendorRootDomains,
  updateNotification,
} from './utils'
import { NotificationTypes } from './consts'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { MatchedVendors, NewVendors } from './types'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
    NotificationTypes.ACTIVITY_SYNC_BROWSER_HISTORY_STARTED
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
    NotificationTypes.ACTIVITY_SYNC_BROWSER_HISTORY_FINISHED
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
    await updateNotification(
      organization_id,
      NotificationTypes.ACTIVITY_NO_VENDORS_DETECTED
    )
    return console.log('No vendors to add')
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

  await updateNotification(
    organization_id,
    NotificationTypes.ACTIVITY_NEW_VENDORS_DETECTED,
    `Detected: ${newOrgVendors.map((v) => v.root_domain).join(', ')}`
  )

  await mapOrgVendorsWithSenders({ organization_id, newOrgVendors })
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
    NotificationTypes.ACTIVITY_NEW_USER_ACTIVITIES_DETECTED,
    `Detected: ${userActivities.length} new user activities`
  )
}

/**
 * Map the new org_vendors with the senders and create new tools
 */
const mapOrgVendorsWithSenders = async ({ organization_id, newOrgVendors }) => {
  console.log('🚀 1 newOrgVendors:', newOrgVendors)

  // Get the new org_vendors
  const org_vendors = await supabase
    .from('org_vendor')
    .upsert(newOrgVendors, {
      onConflict: 'root_domain',
      ignoreDuplicates: true,
    })
    .select('*')

  console.log('🚀 2 org_vendors:', org_vendors)

  // Get the organization's senders
  const senders = await supabase
    .from('sender')
    .select('*')
    .eq('organization_id', organization_id)

  console.log('🚀 3 senders:', senders)

  // Format the content for OpenAI
  const content = {
    senders: senders.data.map((sender) => ({
      id: sender.id,
      name: sender.name,
    })),
    vendors: org_vendors.data.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
    })),
  }
  console.log('🚀 4 content:', content)

  // Use OpenAI to map the senders to the vendors
  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are a professional data analyst, that knows everything about the B2B SaaS market. ' +
          `
            You will be give two lists: Vendors: [{ id, name }] and Senders: [{ id, name }]
            The vendor is a software vendor, and the sender is the software vendor name that is stated on their inovice.

            Try to map the sender name to the vendor name.
            For example: if you have a sender with the name "Supabase Pte. Ltd.", that should be mapped to a vendor with the name "Supabase".
            
            If there is a match, use the name and id from the vendor.
            If there is no match, just return null.
          `,
      },
      {
        role: 'user',
        content: JSON.stringify(content),
      },
    ],
    response_format: zodResponseFormat(MatchedVendors, 'matchedVendors'),
  })

  // Get the matched org_vendors
  const matchedOrgVendorIds = completion.choices[0].message.parsed.children.map(
    (org_vendor) => org_vendor.id
  )
  console.log('🚀 5 matchedOrgVendorIds:', matchedOrgVendorIds)

  // Map the org_vendor ids to the real data, and create the new tools
  const newTools =
    org_vendors.data
      ?.filter((org_vendor) => matchedOrgVendorIds.includes(org_vendor.id))
      ?.map((org_vendor) => ({
        organization_id,
        org_vendor_id: org_vendor.id,
        sender_id: '',
        owner_org_user_id: 9,

        name: org_vendor.name,
        description: org_vendor.description,
        department: org_vendor.category,
        website: org_vendor.url,

        type: 'software',
        status: 'in_stack',
        is_tracking: true,
        root_domain: org_vendor.root_domain,
        link_to_pricing_page: org_vendor.link_to_pricing_page,
      })) || []

  console.log('🚀 6 newTools:', newTools)

  const res = await supabase.from('tool').upsert(newTools, {
    onConflict: 'root_domain',
    ignoreDuplicates: true,
  })

  console.log('🚀 7 res:', res)
}

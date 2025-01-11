import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { decrypt, getB2BSaasDomains, updateNotification } from './utils'
import { NewVendors } from './types'
import { NotificationTypes } from './consts'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Needed for admin rights
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Update the official vendor list with new vendors
 */
export const updateOfficialVendors = async ({
  encryptedData,
  organization_id,
}: {
  encryptedData: any
  organization_id: string
}) => {
  await updateNotification(
    organization_id,
    NotificationTypes.ACTIVITY_UPDATE_VENDORS_STARTED
  )

  const decryptedData = decrypt(encryptedData)
  const visitedRootDomains = await getB2BSaasDomains(decryptedData)

  if (!visitedRootDomains.length) {
    await updateNotification(
      organization_id,
      NotificationTypes.ACTIVITY_NO_VENDORS_DETECTED
    )
    return console.log('No vendors to add')
  }

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional data analyst, that knows everything about the B2B SaaS market. ' +
            'You are given a list of domains of SaaS apps. Fetch data about the apps.' +
            `
              Instructions for the fields:
              **name**
              The name of the SaaS app.
              
              **description**
              The description of the SaaS app. Dont make it up, so just put an empty string if you dont know it.
              
              **url**
              The url of the SaaS app landing page.
              
              **logo_url**
              The favicon url of the SaaS app. Should be: https://example.com/favicon.ico
              
              **category**
              The category of the SaaS app.
              
              **domain**
              The domain of the SaaS app, that I provided.
              
              **link_to_pricing_page**
              The link to the pricing page of the SaaS app.
            `,
        },
        {
          role: 'user',
          content: JSON.stringify(visitedRootDomains),
        },
      ],
      response_format: zodResponseFormat(NewVendors, 'newVendors'),
    })

    const vendors = await supabase
      .from('vendor')
      .upsert(
        completion.choices[0].message.parsed.children.map((vendor) => ({
          name: vendor.name,
          description: vendor.description,
          url: vendor.url,
          root_domain: vendor.domain,
          logo_url: vendor.logo_url,
          category: vendor.category,
          link_to_pricing_page: vendor.link_to_pricing_page,
        })),
        {
          onConflict: 'root_domain',
          ignoreDuplicates: true,
        }
      )
      .select('id')

    await updateNotification(
      organization_id,
      NotificationTypes.ACTIVITY_VENDORS_ADDED,
      {
        vendor_count: vendors?.data?.length,
      }
    )

    console.log(`✅ ${vendors?.data?.length} new vendors added successfully`)
  } catch (error) {
    console.error('Error processing vendors:', error)
    throw new Error('Failed to process and update vendors')
  }
}

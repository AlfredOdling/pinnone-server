import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../../types/supabase'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { updateNotification } from '../utils'
import { NewVendors } from '../types'
import { detectNewDomains } from './utils'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Needed for admin rights
)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
const log = true

/**
 * Update the official vendor list with new vendors
 */
export const updateOfficialVendors = async ({
  browserHistory,
  organization_id,
}: {
  browserHistory: any
  organization_id: string
}) => {
  const newRootDomains = await detectNewDomains(browserHistory)

  log && console.log('🚀 ----> updateOfficialVendors()', newRootDomains)
  log && console.log('🚀 1 newRootDomains:', newRootDomains)

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
          content: JSON.stringify(newRootDomains),
        },
      ],
      response_format: zodResponseFormat(NewVendors, 'newVendors'),
    })

    log && console.log('🚀 2 completion:', completion.choices[0].message.parsed)

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
      .select('id, root_domain')

    log && console.log('🚀 3 vendors:', vendors)

    if (!vendors?.data.length) {
      log && console.log('🚀 4 No new vendors detected')

      // await updateNotification({
      //   organization_id,
      //   title: 'Done! No new vendors detected',
      //   dataObject: 'No new vendors detected',
      //   tag: 'activity_finished',
      // })
    } else {
      log && console.log('🚀 5 New vendors detected')

      // await updateNotification({
      //   organization_id,
      //   title: `Done! Added ${vendors?.data?.length} new vendors.`,
      //   tag: 'activity_finished',
      //   dataObject: `New vendors: ${vendors?.data
      //     ?.map((v) => v.root_domain)
      //     .join(', ')}`,
      // })
    }
  } catch (error) {
    log && console.log('🚀 6 Error processing vendors', error)

    await updateNotification({
      organization_id,
      title: 'Error processing vendors',
      dataObject: error,
      tag: 'activity_finished_error',
    })
    throw new Error(error)
  }
}

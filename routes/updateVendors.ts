import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { decrypt, getB2BSaasDomains } from './utils'
import { NewVendors } from './types'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Needed for admin rights
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const updateVendors = async ({
  encryptedData,
  organization_id,
}: {
  encryptedData: any
  organization_id: string
}) => {
  console.log('ℹ️ updateVendors for org: ', organization_id)

  const decryptedData = decrypt(encryptedData)
  const visitedRootDomains = await getB2BSaasDomains(decryptedData)

  if (!visitedRootDomains.length) {
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
            'You are given a list or domains of SaaS apps. Fetch data about the apps.',
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
          root_domain: vendor.root_domain,
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
    console.log(`✅ ${vendors?.data?.length} new vendors added successfully`)

    const visitedVendors = await supabase
      .from('vendor')
      .select('*') // Get all existing vendors
      .in('root_domain', visitedRootDomains) // Filter by visited domains

    const res = await supabase.from('tool').upsert(
      visitedVendors.data
        .map((vendor) => ({
          vendor_id: vendor.id,
          organization_id,
          status: 'not_in_stack',
        }))
        .filter((vendor) => vendor.status !== 'blocked'),
      {
        onConflict: 'vendor_id',
        ignoreDuplicates: true,
      }
    )

    if (res.error) {
      console.error('Error updating tools:', res.error)
    }
  } catch (error) {
    console.error('Error processing vendors:', error)
    throw new Error('Failed to process and update vendors')
  }
}

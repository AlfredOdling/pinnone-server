import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { NewVendors } from './types'
import { sendEmail } from './sendEmail'
import { extractB2BRootDomain } from './syncBrowserHistory/utils'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Needed for admin rights
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const addToolsManually = async ({
  vendors,
  organization_id,
  owner_org_user_id,
}) => {
  const detectedRootDomains = vendors
    .map(({ url }) => extractB2BRootDomain(url))
    .filter((domain) => domain) // Remove null values
    .filter((domain, index, self) => self.indexOf(domain) === index) // Remove duplicates

  const existingVendors = await supabase
    .from('vendor')
    .select('root_domain')
    .in('root_domain', detectedRootDomains)

  const oldVendors = detectedRootDomains.filter((domain) =>
    existingVendors.data.map((vendor) => vendor.root_domain).includes(domain)
  )
  const newVendors = detectedRootDomains.filter(
    (domain) =>
      !existingVendors.data.map((vendor) => vendor.root_domain).includes(domain)
  )

  if (newVendors.length > 0) {
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
          content: JSON.stringify(newVendors),
        },
      ],
      response_format: zodResponseFormat(NewVendors, 'newVendors'),
    })

    const upsertedVendors = await supabase
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
      .select('*')
      .throwOnError()

    await supabase
      .from('tool')
      .upsert(
        upsertedVendors.data.map((vendor) => ({
          vendor_id: vendor.id,
          organization_id,
          department: vendor.category,
          owner_org_user_id,
          status: 'in_stack',
          is_tracking: true,
          type: 'software',
        })),
        {
          onConflict: 'vendor_id, organization_id',
          ignoreDuplicates: true,
        }
      )
      .throwOnError()
  }

  if (oldVendors.length > 0) {
    const vendors = await supabase
      .from('vendor')
      .select('id, category')
      .in('root_domain', oldVendors)

    await supabase
      .from('tool')
      .insert(
        vendors.data.map((vendor) => ({
          vendor_id: vendor.id,
          organization_id,
          department: vendor.category,
          owner_org_user_id,
          status: 'in_stack',
          is_tracking: true,
          type: 'software',
        }))
      )
      .throwOnError()

    await sendEmail({
      fromEmail: 'info@pinneone.com',
      toEmail: 'alfredodling@gmail.com',
      emailSubject: 'New manual vendors added',
      emailText: oldVendors.join(', '),
    })
  }
}

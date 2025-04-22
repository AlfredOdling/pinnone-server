import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../../types/supabase'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { updateNotification } from '../utils'
import { Tools } from '../types'
import { getRootDomains } from './utils'

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
 * Enrich the tools with the most likely root domain from the browser history + tool info
 */
export const enrichEmptyTools = async ({
  browserHistory,
  organization_id,
}: {
  browserHistory: any
  organization_id: string
}) => {
  const tools = await supabase
    .from('tool')
    .select('*')
    .eq('organization_id', organization_id)

  const new_root_domains = tools.data
    .map((tool) => {
      let root_domain_match

      if (!tool.root_domain || tool.root_domain === '') {
        const bh = getRootDomains(browserHistory)
        const matches = matchWithRegex(bh, tool.name)
        root_domain_match = matches[0] // TODO: Add support for multiple matches
      }

      if (root_domain_match) {
        return {
          id: tool.id,
          root_domain: root_domain_match,
          name: '',
          description: '',
          logo_url: '',
          category: '',
          link_to_pricing_page: '',
          website: '',
        }
      } else return null
    })
    .filter((x) => x)

  if (new_root_domains.length > 0) {
    try {
      const completion = await openai.beta.chat.completions.parse({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional data analyst, that knows everything about the B2B SaaS market. ' +
              'You are given a list of SaaS apps. Fetch data about the apps.' +
              `
              Instructions for the fields:

              **id**
              The id of the SaaS app. DON'T CHANGE THIS FIELD. KEEP IT AS IS.

              **root_domain**
              The root domain of the SaaS app. DON'T CHANGE THIS FIELD. KEEP IT AS IS.

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

              **link_to_pricing_page**
              The link to the pricing page of the SaaS app.

              **website**
              The website/landing page of the SaaS app.
            `,
          },
          {
            role: 'user',
            content: JSON.stringify(new_root_domains),
          },
        ],
        response_format: zodResponseFormat(Tools, 'newTools'),
      })
      log &&
        console.log('🚀 2 completion:', completion.choices[0].message.parsed)

      completion.choices[0].message.parsed.children.forEach(async (tool) => {
        const tool_res = await supabase
          .from('tool')
          .update({
            name: tool.name,
            root_domain: tool.root_domain,
            is_tracking: true,
            department: tool.category,
            description: tool.description,
            // logo_url: tool.logo_url,
            link_to_pricing_page: tool.link_to_pricing_page,
            website: tool.website,
          })
          .eq('id', tool.id)
          .eq('organization_id', organization_id)
          .select('*')

        console.log('🚀 tool_res:', tool_res)

        await updateNotification({
          organization_id,
          title: 'Connected tools with user activity',
          dataObject: `Connected tools: ${tool_res.data
            .map((t) => t.name)
            .join(', ')}`,
          tag: 'activity_finished',
        })
      })
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
}

const matchWithRegex = (domains, vendorName) => {
  return domains
    .map((domain) => {
      let words = domain.match(/\w+/g) // extract words like ['accounts', 'google', 'com']

      if (words.length === 2) words = words.splice(0, 1)
      if (words.length === 3) words = words.splice(0, 2)

      const pattern = words.join('|') // 'accounts|google|com'
      const regex = new RegExp(pattern, 'i') // case-insensitive

      if (regex.test(vendorName)) {
        console.log('🚀 regex:', regex)
        console.log('🚀 vendorName:', vendorName)
        console.log('🚀 pattern:', pattern)
        console.log('🚀 words:', words)
      }

      return regex.test(vendorName) ? domain : null
    })
    .filter((x) => x)
}

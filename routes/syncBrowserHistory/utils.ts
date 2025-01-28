import { zodResponseFormat } from 'openai/helpers/zod'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'
import { personalUrls, b2bPaths } from './consts'
import { RootDomains } from '../types'

dotenv.config()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Filter in the domains that includes any of the "b2bPaths"
 */
export function extractB2BRootDomain(url: string): string | null {
  if (!URL.canParse(url)) return url
  if (['localhost', '127.0.0.1'].includes(new URL(url).hostname)) return null
  if (personalUrls.includes(url)) return null

  /**
   * Example:
   * Split up domain: https://supabase.com/dashboard/project/rynaksbbtajovnsdwrlg
   * into ['supabase', 'com', 'dashboard', 'project', 'rynaksbbtajovnsdwrlg']
   */
  const domainParts = splitURL(url)

  // Check if ['app', 'supabase', 'com'] includes "console" or "app", etc.
  const hasB2BPath = b2bPaths.some((path) => domainParts.includes(path))

  if (hasB2BPath) {
    // Remove www for edge case such as: "https://www.twilio.com/console/ahoy"
    return new URL(url).hostname.replace('www.', '')
  }
}

/**
 * Get the root domains of new B2B urls. (app.xxx.com, railway.com/dashboard, etc.)
 */
export const detectNewDomains = async (browserHistory_) => {
  const log = false

  let browserHistory = browserHistory_
    .map(({ url }) => extractB2BRootDomain(url))
    .filter((domain) => domain) // Remove null values
    .filter((domain, index, self) => self.indexOf(domain) === index) // Dedupe

  const existingVendors = await supabase
    .from('vendor')
    .select('root_domain, status')
    .in('root_domain', browserHistory)

  // Remove domains that already exist in the database, and that are blocked
  browserHistory = browserHistory.filter(
    (domain) =>
      !existingVendors.data
        ?.filter((v) => v.status !== 'blocked')
        .map((v) => v.root_domain)
        .includes(domain)
  )

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `
            Task Description: You are an AI assistant tasked with analyzing a list of URLs to identify strictly business-related domains (B2B SaaS tools or applications). These tools are services that are used by businesses to run their operations such as productivity tools, marketing tools, sales tools, development tools, communication tools, etc. For each domain, determine the following:

            is_b2b_tool_certainty_score
            Purpose: Evaluate if the domain represents a B2B SaaS tool or business application.
            Scoring Criteria (0–100).

            Example of B2B SaaS tools: hubspot, salesforce, zendesk, intercom, helpscout, freshdesk, teamwork, salesforce, zendesk, intercom, freshdesk, teamwork
            Example of non-B2B SaaS tools: amazon, twitter, facebook, instagram, youtube, pinterest, reddit, quora, medium, banks, healthcare, post offices, etc.
            Do not evaluate the example domains, just use them as a reference.
          `,
        },
        {
          role: 'user',
          content: JSON.stringify(browserHistory),
        },
      ],
      response_format: zodResponseFormat(RootDomains, 'rootDomains'),
    })

    const domains = completion.choices[0].message.parsed.children

    const uniqueDomains = domains.filter(
      (domain, index, self) => self.indexOf(domain) === index
    )
    const filteredDomains = uniqueDomains.filter(
      (d) => d.is_b2b_tool_certainty_score > 35
    )
    const skippedDomains = uniqueDomains.filter(
      (d) => d.is_b2b_tool_certainty_score <= 35
    )

    log && console.info('--------------')
    log &&
      console.info(
        '\x1b[33m%s\x1b[0m',
        '🔍 Visited domains:',
        domains.map((d) => d.domain)
      )

    log &&
      console.info(
        '\x1b[34m%s\x1b[0m',
        '✅ Approved domains (certaintyScore > 35%):',
        filteredDomains.map((d) => d)
      )

    log &&
      console.info(
        '\x1b[31m%s\x1b[0m',
        '🚨 Skipped domains:',
        skippedDomains.map((d) => d)
      )

    return filteredDomains.map((d) => d.domain)
  } catch (error) {
    console.error('Error calling OpenAI API:', error)
    throw new Error('Failed to filter business domains')
  }
}

const splitURL = (url: string) => {
  // Remove the protocol (http, https) and split by slashes
  let parts = url.replace(/https?:\/\//, '').split('/')
  // Split the domain into its parts and merge with the rest of the path
  return parts[0].split('.').concat(parts.slice(1))
}

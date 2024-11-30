import CryptoJS from 'crypto-js'
import { personalUrls } from './consts'
import { zodResponseFormat } from 'openai/helpers/zod'
import { RootDomains } from './types'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

dotenv.config()
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export function getRootDomain(url: string): string | null {
  try {
    const canParse = URL.canParse(url)
    if (!canParse) return url

    // Get the root domain
    const urlObj = new URL(url)
    const domainParts = urlObj.hostname.split('.')

    // Skip '127.0.0.1' and 'localhost'
    if (urlObj.hostname === '127.0.0.1' || urlObj.hostname === 'localhost') {
      return null
    }

    // For domains like 'co.uk', 'github.com', 'linkedin.com'
    if (domainParts.length > 2) {
      return domainParts.slice(-2).join('.') // Returns 'domain.ext'
    }

    return urlObj.hostname // Returns the full hostname if it's not subdomain.ext
  } catch (error) {
    console.error('Invalid URL:', url)
    return null // Handle invalid URLs gracefully
  }
}

// We get the root domains of the vendors that the user has visited
export function getVendorRootDomains(historyArray: { url: string }[]) {
  return (
    historyArray
      .map((entry) => getRootDomain(entry.url))
      // Remove null values
      .filter((domain) => domain)
      // Remove duplicates
      .filter((domain, index, self) => self.indexOf(domain) === index)
      // Remove local domains
      .filter((domain) => !domain.includes('localhost'))
      // Remove 127.0.0.1
      .filter((domain) => !domain.includes('127.0.0.1'))
      // Remove personal urls
      .filter((domain) => !personalUrls.includes(domain))
  )
}

export const getRootDomainsAndFilterSaaS = async ({ decryptedData }) => {
  console.log('⏳ Getting root domains...')

  let browserHistory = decryptedData.map(({ lastVisitTime, url }) => ({
    lastVisitTime,
    url,
  }))

  const existingVendors = await supabase
    .from('vendor')
    .select('root_domain')
    .in('root_domain', getVendorRootDomains(browserHistory))
    .neq('status', 'blocked')

  const notOverlappingVendors = existingVendors.data.map(
    (vendor) => vendor.root_domain
  )

  browserHistory = browserHistory
    .filter(({ url }) => !notOverlappingVendors.includes(getRootDomain(url)))
    .filter(({ url }) => !url.includes('localhost'))
    .filter(({ url }) => !url.includes('127.0.0.1'))
    .filter(({ url }) => !personalUrls.includes(url))

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: `
            Task Description: You are an AI assistant tasked with analyzing a list of URLs from the user’s browser history to identify strictly business-related domains (B2B SaaS tools or applications) and evaluate user engagement with them. For each domain, determine the following:

            is_b2b_tool_certainty_score
            Purpose: Evaluate if the domain represents a B2B SaaS tool or business application.
            Scoring Criteria (0–100):

            100: Definitely a B2B tool. URL patterns include indicators such as "app.", "api.", "dashboard.", "console.", "admin.", "login.", "signup.", "register.", "portal.", etc.
            0: Clearly not a B2B tool (e.g., consumer websites, personal tools) OR only the homepage was visited without app-specific patterns.
            
            
            has_logged_in_to_tool_certainty_score
            Purpose: Assess whether the user actively used the tool or just visited the homepage.
            Scoring Criteria (0–100):

            100: Strong evidence of active usage, such as app-specific patterns (e.g., "app.", "dashboard.", "console.", etc.).
            0: No evidence of interaction; only the homepage or non-app-related URLs (e.g., "example.com") were visited.

            
            Instructions:

            Use URL patterns, page structures, and context to determine if the domain is relevant to B2B SaaS. Look for enterprise features, business-oriented marketing language, pricing pages, or SaaS-related services.
            Focus on whether the URL suggests active tool usage. If the URL history only contains the domain's homepage or lacks app-specific patterns, assign a score of 0, even if it belongs to a B2B SaaS tool.
            Avoid duplicate entries; return only one result per domain.
            In cases of uncertainty or insufficient evidence, assign a score of 0 for both criteria.
            Goal:
            Provide two certainty scores for each domain:

            is_b2b_tool_certainty_score (indicates whether it is a B2B tool).
            has_logged_in_to_tool_certainty_score (indicates evidence of active tool usage).
          `,
        },
        {
          role: 'user',
          content: JSON.stringify(browserHistory.map(({ url }) => url)),
        },
      ],
      response_format: zodResponseFormat(RootDomains, 'rootDomains'),
    })

    const domains = completion.choices[0].message.parsed.children
    const uniqueDomains = domains.filter(
      (domain, index, self) => self.indexOf(domain) === index
    )
    const filteredDomains = uniqueDomains.filter(
      (d) =>
        d.is_b2b_tool_certainty_score > 40 &&
        d.has_logged_in_to_tool_certainty_score > 40
    )
    const skippedDomains = uniqueDomains.filter(
      (d) =>
        d.is_b2b_tool_certainty_score <= 40 ||
        d.has_logged_in_to_tool_certainty_score <= 40
    )

    console.info('--------------')
    console.info(
      '\x1b[33m%s\x1b[0m',
      '🔍 Visited domains:',
      domains.map((d) => d.domain)
    )

    console.info(
      '\x1b[34m%s\x1b[0m',
      '✅ Approved domains (certaintyScore > 40%):',
      filteredDomains.map((d) => d)
    )

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

export const getOrgUsers = async ({ user_id }) => {
  const { data: org_users } = await supabase
    .from('org_user')
    .select('*')
    .eq('user_id', user_id)
    .throwOnError()
  return org_users
}

export const decrypt = (encryptedData) => {
  const decryptedData = CryptoJS.AES.decrypt(
    encryptedData,
    ENCRYPTION_KEY
  ).toString(CryptoJS.enc.Utf8)
  const browserHistory = JSON.parse(decryptedData)

  return browserHistory as { lastVisitTime: string; url: string }[]
}

export const getUserActivities = ({
  browserHistory,
  tools,
  org_user_id,
}: {
  browserHistory: { lastVisitTime: string; url: string }[]
  tools: Database['public']['Tables']['tool']['Row'][]
  org_user_id: string
}) => {
  return browserHistory
    .map((visit) => {
      const rootDomain = getVendorRootDomains([visit])[0]
      const matchingTool = tools?.find(
        // @ts-ignore
        (tool) => tool.vendor.root_domain === rootDomain
      )
      if (!matchingTool) return null

      return {
        org_user_id,
        tool_id: matchingTool.id,
        last_visited: new Date(visit.lastVisitTime).toISOString(),
      }
    })
    .filter(Boolean)
}

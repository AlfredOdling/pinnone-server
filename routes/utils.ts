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

const b2bPaths = [
  'dashboard',
  'app',
  'project',
  'projects',
  'team',
  'account',
  'accounts',
  'sales',
  'billing',
  'team',
]

export function getRootDomain({
  url,
  shouldFilterB2B = true,
}: {
  url: string
  shouldFilterB2B?: boolean
}): string | null {
  try {
    const canParse = URL.canParse(url)
    if (!canParse) return url
    const urlObj = new URL(url)

    const domainParts = urlObj.hostname
      .split('.')
      .filter((domainPart) => domainPart !== 'www')

    const hasB2BPath = b2bPaths.some((segment) =>
      urlObj.pathname.toLowerCase().includes(segment)
    )
    const hasSubdomain = domainParts.length > 2
    const isB2Burl = hasB2BPath || hasSubdomain

    if (shouldFilterB2B && isB2Burl) return urlObj.hostname
    if (!shouldFilterB2B) return urlObj.hostname
  } catch (error) {
    // Handle invalid URLs gracefully
    console.error('Invalid URL:', url)
    return null
  }
}

// We get the root domains of the vendors that the user has visited
export function getVendorRootDomains(historyArray: { url: string }[]) {
  return (
    historyArray
      .map((entry) => getRootDomain({ url: entry.url }))
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

/**
 * Get the root domains of B2B urls. (app.xxx.com, railway.com/dashboard, etc.)
 */
export const getB2BSaasDomains = async (decryptedData) => {
  console.log('⏳ Getting root domains...')

  let browserHistory = decryptedData
    .map(({ lastVisitTime, url }) => ({
      lastVisitTime,
      url,
    }))
    // Initial filters
    .filter(({ url }) => !url.includes('localhost'))
    .filter(({ url }) => !url.includes('127.0.0.1'))
    .filter(({ url }) => !personalUrls.includes(url))
    .map(({ url }) => getRootDomain(url))
    // Remove null values
    .filter((domain) => domain)
    // Dedupe
    .filter((domain, index, self) => self.indexOf(domain) === index)

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
  console.log('🚀  browserHistory22:', browserHistory)

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

            Example of B2B SaaS tools: app.hubspot.com, app.salesforce.com, app.zendesk.com, app.intercom.com, app.helpscout.net, app.freshdesk.com, app.teamwork.com, app.salesforce.com, app.zendesk.com, app.intercom.com, app.freshdesk.com, app.teamwork.com
            Example of non-B2B SaaS tools: amazon.com, twitter.com, facebook.com, instagram.com, youtube.com, linkedin.com, pinterest.com, reddit.com, quora.com, medium.com, banks, healthcare, etc.
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
      console.log('🚀  visit:', visit)

      const rootDomain = getRootDomain({
        url: visit.url,
        shouldFilterB2B: false,
      })

      const matchingTool = tools?.find(
        (tool) => tool.root_domain === rootDomain
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

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
    .from('vendors')
    .select('root_domain')
    .in('root_domain', getVendorRootDomains(browserHistory))

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
          content:
            'You are an AI assistant tasked with identifying strictly business-related domains. ' +
            'You will be given a list of urls that a user has visited. Use all the information provided to determine if each domain is a B2B SaaS tool or business application. ' +
            'Your job is to determine if each domain is a B2B SaaS tool or business application. ' +
            'For each domain, assign a certainty score between 0 and 100: ' +
            '100 = Definitely a B2B tool (e.g. Salesforce, Workday, business productivity tools) ' +
            '0 = Not a B2B tool (consumer websites, personal tools, etc). ' +
            'Look for clear indicators like enterprise features, B2B pricing pages, and business-focused marketing language. ' +
            'Also look for cues in the url such as: "app.", "api.", "dashboard.", "console.", "admin.", "login.", "signup.", "register.", "portal.", "console.", "app.", "api.", "dashboard.", "console.", etc. ' +
            'If there is any doubt, score it as 0.' +
            'Only return one SaaS app for each domain. No duplicates.',
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
    const filteredDomains = uniqueDomains.filter((d) => d.certaintyScore > 40)
    const skippedDomains = uniqueDomains.filter((d) => d.certaintyScore <= 40)

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

export const getOrgIds = async ({ userId }) => {
  const { data: org_ids } = await supabase
    .from('users_organizations_roles')
    .select('organization_id')
    .eq('user_id', userId)

  const dedupedOrgIds = [...new Set(org_ids.map((org) => org.organization_id))]
  return dedupedOrgIds
}

export const decrypt = (encryptedData) => {
  const decryptedData = CryptoJS.AES.decrypt(
    encryptedData,
    ENCRYPTION_KEY
  ).toString(CryptoJS.enc.Utf8)
  const browserHistory = JSON.parse(decryptedData)

  return browserHistory as { lastVisitTime: string; url: string }[]
}

export const getBrowserHistoryWithVendorId = (
  browserHistory,
  trackedTools,
  userId
) => {
  return browserHistory
    .map((visit) => {
      const rootDomain = getVendorRootDomains([visit])[0]
      const matchingTool = trackedTools?.find(
        (tool) => tool.vendors.root_domain === rootDomain
      )

      if (!matchingTool) return null

      return {
        user_id: userId,
        vendor_id: matchingTool.vendor_id,
        last_visited: new Date(visit.lastVisitTime).toISOString(),
      }
    })
    .filter(Boolean)
}

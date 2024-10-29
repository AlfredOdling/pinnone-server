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
  )
}

export const getRootDomainsAndFilterSaaS = async ({ decryptedData }) => {
  console.log('⏳ Getting root domains...')

  const browserHistory = decryptedData.map(({ lastVisitTime, url }) => ({
    lastVisitTime,
    url,
  }))

  // Get root domains, and manual filtering
  const visitedDomains = getVendorRootDomains(browserHistory).filter(
    (domain) => !personalUrls.includes(domain)
  )

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content:
            'You are an AI assistant tasked with identifying strictly business-related domains. ' +
            'Your job is to filter out any personal websites, non-business utilities, or non-app/tool domains. ' +
            'Only return domains for SaaS apps or tools used in professional, business contexts.',
        },
        {
          role: 'user',
          content: JSON.stringify(visitedDomains),
        },
      ],
      response_format: zodResponseFormat(RootDomains, 'rootDomains'),
    })

    const approvedDomains = JSON.parse(
      completion.choices[0].message.content
    )?.children

    console.info('--------------')
    console.info('\x1b[33m%s\x1b[0m', '🔍 Visited domains:', visitedDomains)
    console.info(
      '\x1b[31m%s\x1b[0m',
      '🚨 Skipped domains:',
      visitedDomains.filter((domain) => !approvedDomains.includes(domain))
    )
    console.info('\x1b[34m%s\x1b[0m', '✅ Approved domains:', approvedDomains)

    return approvedDomains as string[]
  } catch (error) {
    console.error('Error calling OpenAI API:', error)
    throw new Error('Failed to filter business domains')
  }
}

export const getOrgId = async ({ userId }) => {
  const { data: org_ids } = await supabase
    .from('users_organizations_roles')
    .select('organization_id')
    .eq('user_id', userId)
  const org_id = org_ids[0].organization_id

  return org_id
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

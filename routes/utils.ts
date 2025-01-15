import CryptoJS from 'crypto-js'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'
import { extractB2BRootDomain } from './syncBrowserHistory/utils'

dotenv.config()
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const updateNotification = async ({
  organization_id,
  title,
  tag,
  dataObject,
  dataArray,
}: {
  organization_id: string
  title: string
  tag?: string
  dataObject?: any
  dataArray?: any[]
}) =>
  await supabase
    .from('notification')
    .insert({
      organization_id,
      created_at: new Date().toISOString(),
      title,
      tag,
      dataArray,
      dataObject,
    })
    .eq('organization_id', organization_id)

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
      const rootDomain = extractB2BRootDomain(visit.url)

      const matchingTool = tools?.find(
        (tool) => tool.root_domain === rootDomain
      )
      if (!matchingTool) return null

      return {
        org_user_id,
        tool_id: matchingTool.id,
        root_domain: rootDomain,
        last_visited: new Date(visit.lastVisitTime).toISOString(),
      }
    })
    .filter(Boolean)
}

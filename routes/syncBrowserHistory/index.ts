import { createClient } from '@supabase/supabase-js'
import { updateOfficialVendors } from '../updateOfficialVendors'
import { decrypt } from '../utils'
import { addOrgVendors } from './addOrgVendors'
import { pushNewUserActivity } from './pushNewUserActivity'
import * as dotenv from 'dotenv'
import { Database } from '../../types/supabase'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const syncBrowserHistory = async ({
  encryptedData,
  org_user_id,
  organization_id,
}: {
  encryptedData: string
  org_user_id: number
  organization_id: string
}) => {
  const browserHistory = decrypt(encryptedData)

  const unvisited_browser_history = await filterUnvisitedBrowserHistory({
    browserHistory,
    org_user_id,
  })

  await updateOfficialVendors({
    browserHistory: unvisited_browser_history,
    organization_id,
  })

  await addOrgVendors({
    browserHistory: unvisited_browser_history,
    organization_id,
    owner_org_user_id: org_user_id,
  })

  await pushNewUserActivity({
    browserHistory: unvisited_browser_history,
    organization_id,
    org_user_id,
  })
}

const filterUnvisitedBrowserHistory = async ({
  browserHistory,
  org_user_id,
}) => {
  const res = await supabase
    .from('user_activity')
    .select('last_visited')
    .eq('org_user_id', org_user_id)
    .order('last_visited', { ascending: false })
    .limit(1)
    .single()
  const last_visited_in_ms = new Date(res.data.last_visited).getTime()

  const unvisited_browser_history = browserHistory.filter(
    (item) => Number(item.lastVisitTime) > last_visited_in_ms
  )

  return unvisited_browser_history
}

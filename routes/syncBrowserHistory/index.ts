import { createClient } from '@supabase/supabase-js'
import { decrypt, updateNotification } from '../utils'
import { updateUserActivity } from './pushNewUserActivity'
import * as dotenv from 'dotenv'
import { Database } from '../../types/supabase'
import { enrichEmptyTools } from './enrichEmptyTools'

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
  await updateNotification({
    organization_id,
    title: 'Started analyzing activity',
    dataObject: 'Syncing user activity. Might take a few minutes.',
    tag: 'activity_started',
  })

  const browserHistory = decrypt(encryptedData)

  const unvisited_browser_history = await filterInUnvisitedBrowserHistory({
    browserHistory,
    org_user_id,
  })

  await enrichEmptyTools({
    browserHistory: unvisited_browser_history,
    organization_id,
  })

  return await updateUserActivity({
    browserHistory: unvisited_browser_history,
    organization_id,
    org_user_id,
  })
}

const filterInUnvisitedBrowserHistory = async ({
  browserHistory,
  org_user_id,
}) => {
  const res = await supabase
    .from('user_activity')
    .select('last_visited')
    .eq('org_user_id', org_user_id)
    .order('last_visited', { ascending: false })

  let unvisited_browser_history = browserHistory
  if (res.data?.length) {
    const last_visited_in_ms = new Date(res.data[0].last_visited).getTime()

    unvisited_browser_history = browserHistory.filter(
      (item) => Number(item.lastVisitTime) > last_visited_in_ms
    )
  }

  return unvisited_browser_history
}

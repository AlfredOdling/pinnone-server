import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../../types/supabase'
import { getUserActivities, updateNotification } from '../utils'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const log = true

/**
 * If there is a match between the user browser history and the tools
 * that the org is tracking, push new user_activity
 */
export const updateUserActivity = async ({
  organization_id,
  browserHistory,
  org_user_id,
}) => {
  log &&
    console.log(
      '🚀 ----> pushNewUserActivity(): organization_id, org_user_id, browserHistory',
      organization_id,
      org_user_id,
      browserHistory.slice(0, 2)
    )

  await updateNotification({
    organization_id,
    title: 'Analyzing user activity',
    tag: 'activity_starting',
  })

  const tools = await supabase
    .from('tool')
    .select('*, sender(*)') // Select the vendors associated with the tools
    .eq('is_tracking', true) // Filter the tools that the org is tracking
    .eq('status', 'in_stack')
    .eq('organization_id', organization_id)

  log && console.log('🚀 0 tools:', tools.data.slice(0, 2))

  const userActivities: any = getUserActivities({
    browserHistory,
    tools: tools.data,
    org_user_id,
  })

  log && console.log('🚀 1 userActivities:', userActivities.slice(0, 2))

  const res = await supabase
    .from('user_activity')
    .upsert(
      // Just to filter out root_domain from the array
      userActivities.map((activity) => ({
        org_user_id,
        tool_id: activity.tool_id,
        last_visited: activity.last_visited,
      })),
      {
        onConflict: 'org_user_id, tool_id, last_visited',
        ignoreDuplicates: true,
      }
    )
    .select('*, tool(*)')
    .throwOnError()

  log && console.log('🚀 2 user_activity:', res.data.slice(0, 2))

  if (res.data?.length > 0) {
    await updateNotification({
      organization_id,
      title: `New user activities detected.`,
      tag: 'activity_finished',
      dataObject: `Detected new user activities from ${[
        ...new Set(res.data.map((activity) => activity.tool.name)),
      ].join(', ')}`,
    })
  } else {
    log && console.log('🚀 3 No new activity detected', res)

    return await updateNotification({
      organization_id,
      title: 'No new activity detected',
      tag: 'activity_finished',
    })
  }
}

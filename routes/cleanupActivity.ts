import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Needed for admin rights
)

export const cleanupActivity = async () => {
  const { data: userActivities } = await supabase
    .from('user_activity')
    .select('*')

  // Group activities by org_user_id
  const groupedActivities = userActivities.reduce((acc, activity) => {
    if (!acc[activity.org_user_id]) {
      acc[activity.org_user_id] = []
    }
    acc[activity.org_user_id].push(activity)
    return acc
  }, {})

  // For each group with more than 15 activities, delete the oldest ones
  for (const orgUserId in groupedActivities) {
    const activities = groupedActivities[orgUserId]
    if (activities.length > 15) {
      // Sort by created_at descending to keep the most recent
      const sortedActivities = activities.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      // Get IDs of activities to delete (all after index 14)
      const activitiesToDelete = sortedActivities.slice(15).map((act) => act.id)

      // Delete the overflow activities
      await supabase.from('user_activity').delete().in('id', activitiesToDelete)
    }
  }
}

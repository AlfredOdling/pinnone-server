import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'

dotenv.config()

// THANKS AI for this workable but ugly code

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Needed for admin rights
)

export const cleanupNotifications = async () => {
  const { data: notifications } = await supabase
    .from('notification')
    .select('*')

  // Group notifications by organization_id and tag
  const groupedNotifications = notifications.reduce((acc, notification) => {
    if (!acc[notification.organization_id]) {
      acc[notification.organization_id] = {
        activity: [],
        email: [],
      }
    }
    if (notification.tag === 'activity') {
      acc[notification.organization_id].activity.push(notification)
    } else if (notification.tag === 'email') {
      acc[notification.organization_id].email.push(notification)
    }
    return acc
  }, {})

  // For each organization, handle activity and email notifications separately
  for (const organizationId in groupedNotifications) {
    const orgNotifications = groupedNotifications[organizationId]

    // Handle activity notifications
    if (orgNotifications.activity.length > 10) {
      const sortedActivityNotifications = orgNotifications.activity.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      const activityNotificationsToDelete = sortedActivityNotifications
        .slice(10)
        .map((not) => not.id)

      if (activityNotificationsToDelete.length > 0) {
        await supabase
          .from('notification')
          .delete()
          .in('id', activityNotificationsToDelete)
      }
    }

    // Handle email notifications
    if (orgNotifications.email.length > 10) {
      const sortedEmailNotifications = orgNotifications.email.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      const emailNotificationsToDelete = sortedEmailNotifications
        .slice(10)
        .map((not) => not.id)

      if (emailNotificationsToDelete.length > 0) {
        await supabase
          .from('notification')
          .delete()
          .in('id', emailNotificationsToDelete)
      }
    }
  }
}

import { decrypt, updateNotification } from '../utils'
import { NotificationTypes } from '../consts'
import { addOrgVendors } from './addOrgVendors'
import { pushNewUserActivity } from './pushNewUserActivity'

export const syncBrowserHistory = async ({
  encryptedData,
  org_user_id,
  organization_id,
}: {
  encryptedData: string
  org_user_id: number
  organization_id: string
}) => {
  await updateNotification(
    organization_id,
    NotificationTypes.ACTIVITY_SYNC_BROWSER_HISTORY_STARTED
  )

  const browserHistory = decrypt(encryptedData)

  await addOrgVendors({
    browserHistory,
    organization_id,
  })

  await pushNewUserActivity({
    browserHistory,
    organization_id,
    org_user_id,
  })

  await updateNotification(
    organization_id,
    NotificationTypes.ACTIVITY_SYNC_BROWSER_HISTORY_FINISHED
  )
}

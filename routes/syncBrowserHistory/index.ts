import { decrypt } from '../utils'
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
  const browserHistory = decrypt(encryptedData)

  await addOrgVendors({
    browserHistory,
    organization_id,
    owner_org_user_id: org_user_id,
  })

  await pushNewUserActivity({
    browserHistory,
    organization_id,
    org_user_id,
  })
}

import { syncBrowserHistory } from '../routes/syncBrowserHistory'
import { getOrgUsers } from '../routes/utils'

const syncBrowserHistoryWorker = async ({ user_id, encryptedData }) => {
  try {
    const orgUsers = await getOrgUsers({ user_id })

    return await Promise.all(
      orgUsers.map((orgUser) =>
        syncBrowserHistory({
          encryptedData,
          org_user_id: orgUser.id,
          organization_id: orgUser.organization_id,
        })
      )
    )
  } catch (error) {
    console.error(error)
    throw error
  }
}

export default syncBrowserHistoryWorker

import { scanEmailAccount } from '../routes/scanEmailAccount'

const scanEmailAccountWorker = async ({
  email,
  organization_id,
  owner_org_user_id,
  after,
  before,
}) => {
  try {
    const tokens = await scanEmailAccount({
      email,
      organization_id,
      owner_org_user_id,
      after,
      before,
    })

    return tokens
  } catch (error) {
    console.error('Error in scanEmailAccountWorker:', error)
    throw error
  }
}

export default scanEmailAccountWorker

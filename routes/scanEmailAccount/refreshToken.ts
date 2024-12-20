import * as dotenv from 'dotenv'

import { UserRefreshClient } from 'google-auth-library'

dotenv.config()

export const refreshToken = async (refreshToken: string) => {
  const user = new UserRefreshClient(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    refreshToken
  )

  const { credentials } = await user.refreshAccessToken() // optain new tokens
  return credentials
}

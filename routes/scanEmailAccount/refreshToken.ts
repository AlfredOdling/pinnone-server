import * as dotenv from 'dotenv'

import { UserRefreshClient } from 'google-auth-library'
import { Database } from '../../types/supabase'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const refreshToken = async ({ refreshToken, email }) => {
  console.log('🚀  refreshToken, email:', refreshToken, email)

  const user = new UserRefreshClient(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    refreshToken
  )

  const { credentials } = await user.refreshAccessToken() // optain new tokens
  console.log('🚀  credentials:', credentials)

  // const res = await supabase.from('email_account').update({
  //   email,
  //   access_token: credentials.access_token,
  //   refresh_token: credentials.refresh_token,
  //   expiry_date: credentials.expiry_date,
  // })

  // console.log('🚀  res:', res)
}

import * as dotenv from 'dotenv'
import { UserRefreshClient } from 'google-auth-library'
import { Database } from '../../types/supabase'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const refreshTokens = async () => {
  const email_accounts = await supabase.from('email_account').select('*')

  for (const emailAccount of email_accounts.data) {
    const user = new UserRefreshClient(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      emailAccount.refresh_token
    )

    const { credentials } = await user.refreshAccessToken() // optain new tokens
    console.log('🚀  credentials:', credentials)

    await supabase
      .from('email_account')
      .update({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
        expiry_date: credentials.expiry_date,
      })
      .eq('id', emailAccount.id)
      .select('id')
  }
}

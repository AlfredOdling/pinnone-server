import { OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

dotenv.config()

const oAuth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
)

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const googleAuth = async ({
  code,
  organization_id,
}: {
  code: string
  organization_id: string
}) => {
  const { tokens } = await oAuth2Client.getToken(code)

  // Get user info from Google using access token
  oAuth2Client.setCredentials(tokens)
  const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client })
  const { data: userInfo } = await oauth2.userinfo.get()

  // Check if email account exists
  const { data: existingAccount } = await supabase
    .from('email_account')
    .select()
    .eq('email', userInfo.email)
    .single()

  // If no existing account, create new one
  if (!existingAccount) {
    await supabase.from('email_account').insert({
      email: userInfo.email,
      provider: 'google',
      organization_id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    })
  }

  return tokens
}

import { google } from 'googleapis'
import * as dotenv from 'dotenv'

import { OAuth2Client } from 'google-auth-library'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'
import { analyzeReceipt } from './analyzeReceipt'

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

export const scanEmailAccount = async ({
  email,
  organization_id,
  owner_org_user_id,
  after,
  before,
}: {
  email: string
  organization_id: string
  owner_org_user_id: number
  after: string
  before: string
}) => {
  const { data: emailAccount } = await supabase
    .from('email_account')
    .select()
    .eq('email', email)
    .eq('organization_id', organization_id)
    .single()

  if (!emailAccount) throw new Error('Email account not found')

  try {
    oAuth2Client.setCredentials({
      access_token: emailAccount.access_token,
      refresh_token: emailAccount.refresh_token,
    })
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

    const query = `(invoice | receipt | faktura | kvitto) has:attachment after:${after} before:${before}`
    console.log('🚀  query:', query)

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
    })

    const messages = response.data.messages || []

    for (const message of messages) {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
      })

      const payload = msg.data.payload
      const parts = payload?.parts || []

      let foundPdf = false
      for (const part of parts) {
        if (foundPdf) break

        if (
          part.filename &&
          part.body &&
          part.body.attachmentId &&
          part.filename.includes('pdf')
        ) {
          await analyzeReceipt({
            gmail,
            messageId: message.id!,
            part,
            organization_id,
            email,
            msg,
            owner_org_user_id,
          })
          foundPdf = true
        }
      }
    }
  } catch (error) {
    console.error('Error in scanEmails:', error)
    throw error
  }
}

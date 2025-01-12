import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { OAuth2Client } from 'google-auth-library'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'
import { analyzeReceipt } from './analyzeReceipt'
import { createLabel } from './createLabel'
import { refreshToken } from './refreshToken'
import { updateNotification } from '../utils'
import { NotificationTypes } from '../consts'

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

  if (!emailAccount) {
    throw new Error('Email account not found')
  }

  try {
    oAuth2Client.setCredentials({
      access_token: emailAccount.access_token,
      refresh_token: emailAccount.refresh_token,
    })
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })
    const tasksApi = google.tasks({ version: 'v1', auth: oAuth2Client })
    const receiptsLabelId = await createLabel(gmail)

    const query = `(invoice | receipt | faktura | kvitto) after:${after} before:${before}`
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

      const emailId = await supabase
        .from('receipt')
        .select('email_id')
        .eq('email_id', message.id!)

      if (emailId.data.length > 0) continue

      const payload = msg.data.payload
      const parts = payload?.parts || []
      const hasAttachments = parts.length > 0

      await updateNotification(
        organization_id,
        NotificationTypes.EMAIL_STARTING_TO_SCAN,
        `Scanning email ${messages.indexOf(message) + 1} of ${messages.length}`
      )

      if (hasAttachments) {
        let foundPdf = false

        for (const part of parts) {
          if (foundPdf) break

          if (
            part.filename !== '' &&
            part.body &&
            part.body.attachmentId &&
            !part.filename.includes('zip')
          ) {
            await analyzeReceipt({
              gmail,
              tasksApi,
              messageId: message.id!,
              part,
              organization_id,
              email,
              msg,
              owner_org_user_id,
              type: part.filename.includes('pdf') ? 'pdf' : 'html',
            })
            foundPdf = true
          }
        }
      } else if (!hasAttachments) {
        await analyzeReceipt({
          gmail,
          tasksApi,
          messageId: message.id!,
          organization_id,
          email,
          msg,
          owner_org_user_id,
          type: 'html_no_attachments',
        })
      }

      // Move message to Receipts label
      await gmail.users.messages.modify({
        userId: 'me',
        id: message.id!,
        requestBody: {
          addLabelIds: [receiptsLabelId],
          removeLabelIds: ['INBOX'],
        },
      })
    }

    await updateNotification(
      organization_id,
      NotificationTypes.EMAIL_SCAN_ACCOUNT_FINISHED,
      `Finished scanning ${messages.length}/${messages.length} emails`
    )
  } catch (error) {
    const invalid_grant = error.message === 'invalid_grant'

    if (invalid_grant) {
      await refreshToken({
        refreshToken: emailAccount.refresh_token,
        email: emailAccount.email,
      })
    } else {
      throw error
    }
  } finally {
    // Remove all files in temp folder
    const attachmentsFolder = 'temp/attachments'
    fs.readdirSync(attachmentsFolder).forEach((file) => {
      fs.unlinkSync(path.join(attachmentsFolder, file))
    })
    const receiptsFolder = 'temp/receipts'
    fs.readdirSync(receiptsFolder).forEach((file) => {
      fs.unlinkSync(path.join(receiptsFolder, file))
    })
  }
}

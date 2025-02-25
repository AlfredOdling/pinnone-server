import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
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
  after,
  before,
}: {
  email: string
  after: string
  before: string
}) => {
  const { data: emailAccount } = await supabase
    .from('email_account')
    .select()
    .eq('email', email)
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

    const query = `(invoice OR receipt OR faktura OR kvitto) in:(receipts OR inbox) after:${after} before:${before}`
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

      const receipt = await supabase
        .from('receipt')
        .select('*, sender(*)')
        .eq('email_id', message.id!)

      if (receipt.data.length > 0) {
        console.log('🪂 Skipping receipt:', receipt)
        continue
      }

      const payload = msg.data.payload
      const parts = payload?.parts || []
      const hasAttachments = parts.length > 0

      console.log(
        '🚀  subject:',
        payload?.headers?.find((h) => h.name === 'Subject')?.value
      )
      console.log(
        '🚀  from:',
        payload?.headers?.find((h) => h.name === 'From')?.value
      )

      if (hasAttachments) {
        let foundPdf = false

        for (const part of parts) {
          if (foundPdf) break

          if (
            part.filename !== '' &&
            part.body &&
            part.body.attachmentId &&
            part.filename.includes('pdf')
          ) {
            await analyzeReceipt({
              gmail,
              messageId: message.id!,
              part,
              email,
              msg,
              type: 'pdf',
            })
            foundPdf = true
          }
        }
      } else if (!hasAttachments) {
        await analyzeReceipt({
          gmail,
          messageId: message.id!,
          email,
          msg,
          type: 'html_no_attachments',
        })
      }
    }
  } catch (error) {
    throw error
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

import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { OAuth2Client } from 'google-auth-library'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'
import { analyzeReceipt } from './analyzeReceipt'
import { createReceiptsLabel } from './createLabel'
import { updateNotification } from '../utils'
import { JSDOM } from 'jsdom'

dotenv.config()

// Dra ut alla mejl från perioden
// kolla ämnesraderna med AI om det är rätt mejl
// kolla

function stripHtml(html) {
  // Create a DOM from the HTML using JSDOM
  const dom = new JSDOM(html)

  // Extract and return the text content
  return dom.window.document.body.textContent.trim()
}

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
  await updateNotification({
    organization_id,
    title: `Scan started`,
    tag: 'email_scanning',
    dataObject: `Scanning emails`,
  })

  const { data: orgUser } = await supabase
    .from('org_user')
    .select()
    .eq('organization_id', organization_id)
    .eq('id', owner_org_user_id)
    .single()

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
    const receiptsLabelId = await createReceiptsLabel(gmail)

    const filter =
      orgUser.filter_emails && orgUser.email_filter
        ? orgUser.email_filter
            .split(',')
            .map((email) => `-from:${email.trim()}`)
            .join(' ')
        : ''
    console.log('🚀  filter:', filter)

    const query = `(invoice OR receipt OR faktura OR kvitto) in:(receipts OR inbox) after:${after} before:${before} ${filter}`
    const query2 = `in:(receipts OR inbox) after:${after} before:${before} ${filter}`

    console.log('🚀  query:', query)

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
    })
    const response2 = await gmail.users.messages.list({
      userId: 'me',
      q: query2,
    })
    const messages = response.data.messages || []
    const messages2 = response2.data.messages || []

    // deduplicate messages
    const deduplicatedMessages = [...messages, ...messages2].filter(
      (message, index, self) =>
        index === self.findIndex((t) => t.id === message.id)
    )

    for (const message of messages) {
      console.log('🚀  message:', message)

      continue
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
      })

      const payload = msg.data.payload

      let htmlBody = ''
      if (msg.data.payload.body.data) {
        htmlBody = Buffer.from(msg.data.payload.body.data, 'base64').toString(
          'utf-8'
        )
      }

      if (msg?.data?.payload?.parts?.[0]?.parts?.[1]?.body?.data) {
        htmlBody = Buffer.from(
          msg.data.payload.parts[0].parts[1].body.data,
          'base64'
        ).toString('utf-8')
      }

      console.log('🚀  htmlBody:', stripHtml(htmlBody))

      console.log(
        '🚀  payload:',
        payload?.parts.map((p) => p.filename)
      )
      console.log(
        '🚀  subject:',
        payload?.headers?.find((h) => h.name === 'Subject')?.value
      )
      console.log(
        '🚀  from:',
        payload?.headers?.find((h) => h.name === 'From')?.value
      )
    }

    for (const message of messages) {
      continue
      const organization = await supabase
        .from('organization')
        .select('*')
        .eq('id', organization_id)
        .single()

      if (
        organization.data.stripe_status !== 'paid' &&
        organization.data.scanned_emails >= 20
      ) {
        return {
          error: 'No scans left',
        }
      }

      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
      })

      const receipt = await supabase
        .from('receipt')
        .select('*, sender(*)')
        .eq('email_id', message.id!)
        .eq('sender.organization_id', organization_id)

      if (receipt.data.length > 0) {
        console.log('🪂 Skipping receipt:', receipt)
        continue
      }

      const payload = msg.data.payload

      const parts = payload?.parts || []
      const hasAttachments = parts.length > 0

      await updateNotification({
        organization_id,
        title: `Analyzing email from ${
          payload?.headers?.find((h) => h.name === 'From')?.value
        }`,
        tag: 'email',
        dataObject: `Analyzing email ${messages.indexOf(message) + 1} of ${
          messages.length
        }: ${payload?.headers?.find((h) => h.name === 'Subject')?.value}`,
      })

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
              orgUser,
              gmail,
              tasksApi,
              messageId: message.id!,
              part,
              organization_id,
              email,
              msg,
              owner_org_user_id,
              type: 'pdf',
            })
            foundPdf = true
          }
        }
      } else if (!hasAttachments) {
        await analyzeReceipt({
          orgUser,
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

      if (orgUser?.sort_gmail) {
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
    }

    await updateNotification({
      organization_id,
      title: `Finished scanning ${messages.length} emails`,
      tag: 'email_finished',
      dataObject: `Finished scanning ${messages.length}/${messages.length} emails`,
    })
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

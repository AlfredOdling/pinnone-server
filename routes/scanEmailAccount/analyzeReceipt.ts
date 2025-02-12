import { analyzeReceiptWithOpenAI } from './analyzeReceiptWithOpenAI'
import { convertFileAndUpload } from './convertFileAndUpload'
import { convertHtmlToPng } from './convertHtmlToPng'
import { downloadFile } from './downloadFile'
import { updateEmailAccountLastScannedDate } from './updateEmailAccountLastScannedDate'
import { generateSender } from './generateSender'
import { insertReceipt } from './insertReceipt'
import { generateTool } from './generateTool'
import { updateNotification } from '../utils'
import { checkForDuplicates } from './checkForDuplicates'
import { createDuplicateLabel } from './createLabel'
import { updateUsage } from './updateUsage'

export const analyzeReceipt = async ({
  orgUser,
  gmail,
  tasksApi,
  messageId,
  part = [],
  organization_id,
  email,
  msg,
  owner_org_user_id,
  type,
}: {
  orgUser: any
  gmail: any
  tasksApi: any
  messageId: string
  part?: any
  organization_id: string
  email: string
  msg: any
  owner_org_user_id: number
  type: string
}) => {
  await updateEmailAccountLastScannedDate({ email, organization_id })

  try {
    if (
      process.env.NODE_ENV === 'development' &&
      (type === 'html' || type === 'html_no_attachments')
    ) {
      console.log('💻 skipping convertHtmlToPng in dev')
      return
    }

    let fileUrl
    if (type === 'html_no_attachments') {
      fileUrl = await convertHtmlToPng({ msg, type })
    } else if (type === 'pdf') {
      fileUrl = await convertFileAndUpload({ gmail, messageId, part })
    }

    const res = await analyzeReceiptWithOpenAI(fileUrl.base64Image)
    console.log('🚀  res.is_a_receipt_or_invoice:', res.is_a_receipt_or_invoice)
    if (!res.is_a_receipt_or_invoice) return

    const hasDuplicates = await checkForDuplicates({
      res,
      organization_id,
    })

    if (hasDuplicates) {
      console.log('🚀  hasDuplicates:', hasDuplicates)

      const duplicateLabelId = await createDuplicateLabel(gmail)

      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [duplicateLabelId],
        },
      })

      return
    }

    const attachmentUrl = await downloadFile({
      res,
      downloadUrl: fileUrl.publicUrl,
    })

    const sender = await generateSender({
      senderName: res.vendor_name_raw,
      organization_id,
    })

    if (!sender) {
      console.log('🚀  sender:', sender)
      return new Error('Sender not found')
    }

    if (res.type === 'software') {
      await generateTool({
        organization_id,
        sender,
        owner_org_user_id,
      })
    }

    await insertReceipt({
      senderId: sender.id,
      res,
      attachmentUrl,
      msg,
      email,
      messageId,
      type,
    })

    await updateUsage({ organization_id })

    if (
      orgUser.calendar_reminders &&
      res.ocr &&
      res.bank_number &&
      res.due_date
    ) {
      const task = {
        title: `💳 Payment due for ${res.vendor_name} of ${res.total_cost} ${res.currency}`,
        notes: `
        🗓️ Due date: ${res.due_date} (in 3 days)
        🏦 Bank account number: ${res.bank_number}
        #️⃣ OCR: ${res.ocr}

        🔗 Link to invoice: ${attachmentUrl}
        `,
        due: new Date(
          new Date(`${res.due_date}T23:59:59.000Z`).getTime() -
            3 * 24 * 60 * 60 * 1000
        ).toISOString(),
      }

      await tasksApi.tasks.insert({
        tasklist: '@default',
        requestBody: task,
      })
    }
  } catch (error) {
    console.error('Error in analyzeReceipt:', error)

    await updateNotification({
      organization_id,
      title: `Error analyzing email`,
      tag: 'email_finished',
      dataObject: `Error analyzing email ${messageId}`,
    })
    throw error
  }
}

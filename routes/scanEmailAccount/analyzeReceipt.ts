import { analyzeReceiptWithOpenAI } from './analyzeReceiptWithOpenAI'

import { convertFileAndUpload } from './convertFileAndUpload'
import { convertHtmlToPng } from './convertHtmlToPng'
import { downloadFile } from './downloadFile'
import { updateEmailAccountLastScannedDate } from './updateEmailAccountLastScannedDate'
import { generateSender } from './generateSender'
import { insertReceipt } from './insertReceipt'
import { generateTool } from './generateTool'

export const analyzeReceipt = async ({
  gmail,
  messageId,
  part = [],
  organization_id,
  email,
  msg,
  owner_org_user_id,
  type,
}: {
  gmail: any
  messageId: string
  part?: any
  organization_id: string
  email: string
  msg: any
  owner_org_user_id: number
  type: string
}) => {
  try {
    let fileUrl
    if (type === 'html' || type === 'html_no_attachments') {
      fileUrl = await convertHtmlToPng({ msg, type })
    } else if (type === 'pdf') {
      fileUrl = await convertFileAndUpload({ gmail, messageId, part })
    }

    const res = await analyzeReceiptWithOpenAI(fileUrl.base64Image)
    if (!res.is_a_receipt_or_invoice) return

    const attachmentUrl = await downloadFile({
      res,
      downloadUrl: fileUrl.publicUrl,
    })

    const sender = await generateSender({
      senderName: res.vendor_name_raw,
      organization_id,
    })

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

    await updateEmailAccountLastScannedDate({ email, organization_id })
  } catch (error) {
    console.error('Error in analyzeReceipt:', error)
    throw error
  }
}

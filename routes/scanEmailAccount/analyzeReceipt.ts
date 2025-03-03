import { analyzeReceiptWithOpenAI } from './analyzeReceiptWithOpenAI'
import { convertFileAndUpload } from './convertFileAndUpload'
import { convertHtmlToPng } from './convertHtmlToPng'
import { downloadFile } from './downloadFile'
import { updateEmailAccountLastScannedDate } from './updateEmailAccountLastScannedDate'
import { generateOrFetchSender } from './generateSender'
import { insertReceipt } from './insertReceipt'
import { updateNotification } from '../utils'
import { checkForDuplicates } from './checkForDuplicates'
// import { updateUsage } from './updateUsage'
import { insertOrgVendor } from './insertOrgVendor'
import { generateTool } from './generateTool'

export const analyzeReceipt = async ({
  gmail,
  messageId,
  part = [],
  organization_id,
  email,
  msg,
  type,
  owner_org_user_id,
}: {
  gmail: any
  messageId: string
  part?: any
  organization_id: string
  email: string
  msg: any
  type: string
  owner_org_user_id: number
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
    console.log('🚀  res.number_of_characters:', res.number_of_characters)

    if (
      !res.is_a_receipt_or_invoice ||
      res.number_of_characters < 10 ||
      res.type !== 'software'
    ) {
      console.log('🚀  skipping receipt: ', res)
      return
    }

    const hasDuplicates = await checkForDuplicates({
      res,
      organization_id,
    })

    if (hasDuplicates) {
      console.log('🚀  skipping duplicate receipt: ', res)
      return
    }

    const attachmentUrl = await downloadFile({
      res,
      downloadUrl: fileUrl.publicUrl,
    })

    const sender = await generateOrFetchSender({
      senderName: res.vendor_name_raw,
      organization_id,
    })

    if (!sender) {
      console.log('🚀  sender:', sender)
      return new Error('Sender not found')
    }

    await generateTool({
      organization_id,
      sender,
      owner_org_user_id,
    })

    await insertReceipt({
      senderId: sender.id,
      res,
      attachmentUrl,
      msg,
      email,
      messageId,
      type,
    })

    await insertOrgVendor({
      organization_id,
      res,
    })

    // await updateUsage({ organization_id })
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

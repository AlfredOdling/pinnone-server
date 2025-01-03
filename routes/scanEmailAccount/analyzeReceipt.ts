import { analyzeReceiptWithOpenAI } from './analyzeReceiptWithOpenAI'

import { convertFileAndUpload } from './convertFileAndUpload'
import { convertHtmlToPng } from './convertHtmlToPng'
import { downloadFile } from './downloadFile'
import { updateEmailAccountLastScannedDate } from './updateEmailAccountLastScannedDate'
import { generateSender } from './generateVendor'
import { generateTool } from './generateTool'
import { insertReceipt } from './insertReceipt'
import { generateWarningInfo } from './generateWarningInfo'

export const analyzeReceipt = async ({
  gmail,
  messageId,
  part,
  organization_id,
  email,
  msg,
  owner_org_user_id,
  type,
}) => {
  let fileUrl

  try {
    if (type === 'noPDF') {
      fileUrl = await convertHtmlToPng({ msg })
    }
    if (type === 'pdf') {
      fileUrl = await convertFileAndUpload({ gmail, messageId, part })
    }

    const res = await analyzeReceiptWithOpenAI(fileUrl.base64Image)
    console.log('🚀  res:', res)
    if (!res.is_a_receipt_or_invoice) return

    const attachmentUrl = await downloadFile({
      res,
      downloadUrl: fileUrl.publicUrl,
    })

    // const vendorName =
    //   res.type === 'software' ? res.vendor_name : res.vendor_name_raw

    const sender = await generateSender({
      senderName: res.vendor_name_raw,
    })

    // const tool = await generateTool({
    //   organization_id,
    //   vendor,
    //   type: res.type,
    //   owner_org_user_id,
    // })

    // const warning_info = await generateWarningInfo({ res })

    await insertReceipt({
      senderId: sender.id,
      res,
      attachmentUrl,
      msg,
      email,
      warning_info: '',
      messageId,
    })

    await updateEmailAccountLastScannedDate({ email, organization_id })
  } catch (error) {
    console.error('Error in analyzeReceipt:', error)
    throw error
  }
}

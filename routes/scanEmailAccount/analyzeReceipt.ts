import { analyzeReceiptWithOpenAI } from './analyzeReceiptWithOpenAI'

import { convertFileAndUpload } from './convertFileAndUpload'
import { convertHtmlToPng } from './convertHtmlToPng'
import { downloadFile } from './downloadFile'
import { updateEmailAccountLastScannedDate } from './updateEmailAccountLastScannedDate'
import { generateVendor } from './generateVendor'
import { generateTool } from './generateTool'
import { insertSubscription } from './insertSubscription'
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
      fileUrl = await convertHtmlToPng({ gmail, messageId, msg })
    }
    if (type === 'pdf') {
      fileUrl = await convertFileAndUpload({ gmail, messageId, part })
    }

    const res = await analyzeReceiptWithOpenAI(fileUrl.base64Image)
    console.log('🚀  res:', res)

    const attachmentUrl = await downloadFile({
      res,
      downloadUrl: fileUrl.publicUrl,
    })

    const vendor = await generateVendor(
      res.type === 'software' ? res.vendor_name : res.vendor_name_raw
    )
    console.log('🚀  vendor:', vendor)

    const tool = await generateTool({
      organization_id,
      vendor: vendor,
      type: res.type,
      owner_org_user_id,
    })
    console.log('🚀  tool:', tool)

    const warning_info = await generateWarningInfo({ res, tool })
    console.log('🚀  warning_info:', warning_info)

    await insertSubscription({
      res,
      tool,
      attachmentUrl,
      msg,
      email,
      warning_info,
    })

    await updateEmailAccountLastScannedDate({ email, organization_id })
  } catch (error) {
    console.error('Error in analyzeReceipt:', error)
    throw error
  }
}

import { analyzeReceiptWithOpenAI } from './analyzeReceiptWithOpenAI'

import { convertFileAndUpload } from './convertFileAndUpload'
import { convertHtmlToPng } from './convertHtmlToPng'
import { downloadFile } from './downloadFile'
import { updateToolAndSubscription } from './updateToolAndSubscription'

export async function analyzeReceipt({
  gmail,
  messageId,
  part,
  organization_id,
  email,
  msg,
  owner_org_user_id,
  type,
}) {
  let fileUrl

  if (type === 'noPDF') {
    fileUrl = await convertHtmlToPng({ gmail, messageId, msg })
  }
  if (type === 'pdf') {
    fileUrl = await convertFileAndUpload({ gmail, messageId, part })
  }

  const res = await analyzeReceiptWithOpenAI(fileUrl.base64Image)

  const {
    vendor,
    date_of_invoice,
    total_cost,
    currency,
    invoice_or_receipt,
    is_something_else,
  } = res

  if (is_something_else) {
    console.log('🚀  is_something_else:', res.is_something_else)
    console.log('🚀  res:', res)
    return
  }

  const newfilename = `temp/receipts/${date_of_invoice}-${vendor}-${total_cost}-${currency}-${invoice_or_receipt}.png`
  const downloadUrl = fileUrl.publicUrl

  const attachmentUrl = await downloadFile({ downloadUrl, newfilename })

  await updateToolAndSubscription({
    res,
    attachmentUrl,
    organization_id,
    email,
    msg,
    owner_org_user_id,
  })
}

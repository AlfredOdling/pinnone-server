import { analyzeReceiptWithOpenAI } from './analyzeReceiptWithOpenAI'

import { convertFileAndUpload } from './convertFileAndUpload'
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
}) {
  const fileUrl = await convertFileAndUpload(gmail, messageId, part)
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

  const newfilename = `${date_of_invoice}-${vendor}-${total_cost}-${currency}-${invoice_or_receipt}.png`
  const downloadUrl = fileUrl.publicUrl

  const publicUrlData = await downloadFile({ downloadUrl, newfilename })

  await updateToolAndSubscription({
    res,
    attachmentUrl: publicUrlData.publicUrl,
    organization_id,
    email,
    msg,
    owner_org_user_id,
  })
}

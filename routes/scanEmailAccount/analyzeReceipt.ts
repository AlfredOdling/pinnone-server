import { analyzeReceiptWithOpenAI } from './analyzeReceiptWithOpenAI'

import { convertFileAndUpload } from './convertFileAndUpload'
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
  console.log('🚀  res:', res)

  await updateToolAndSubscription({
    res,
    attachmentUrl: fileUrl.publicUrl,
    organization_id,
    email,
    msg,
    owner_org_user_id,
  })
}

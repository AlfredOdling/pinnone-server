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

  const attachmentUrl = await downloadFile({
    res,
    downloadUrl: fileUrl.publicUrl,
  })

  await updateToolAndSubscription({
    res,
    attachmentUrl,
    organization_id,
    email,
    msg,
    owner_org_user_id,
  })
}

import * as dotenv from 'dotenv'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'
import { pdf } from 'pdf-to-img'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const convertFileAndUpload = async (
  gmail,
  messageId: string,
  part: any
) => {
  const attachment = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId: messageId,
    id: part.body.attachmentId,
  })

  const base64 = Buffer.from(attachment.data.data, 'base64')

  const filename = part.filename.replace('/', '')
  fs.writeFileSync('attachments_temp/' + filename, base64)

  const document = await pdf('attachments_temp/' + filename, { scale: 3 })
  let filePathToUpload = ''

  let counter = 1
  for await (const image of document) {
    const fileName = 'attachments_temp/' + filename + '_' + counter + '.png'
    filePathToUpload = fileName
    fs.writeFileSync(fileName, image)
    counter++
  }

  // Upload the last generated image to Supabase storage
  const fileBuffer = fs.readFileSync(filePathToUpload)
  const base64Image = fileBuffer.toString('base64')

  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(`${Date.now()}_${filename}.png`, fileBuffer, {
      contentType: 'image/png',
      upsert: true,
    })

  const { data: publicUrlData } = supabase.storage
    .from('receipts')
    .getPublicUrl(data.path)

  if (error) {
    throw new Error('Failed to upload file:' + error.message)
  }

  // Cleanup temp files
  fs.unlinkSync('attachments_temp/' + filename)
  fs.unlinkSync(filePathToUpload)

  return { base64Image, publicUrl: publicUrlData.publicUrl }
}

import * as dotenv from 'dotenv'
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'
import { pdf } from 'pdf-to-img'
import sharp from 'sharp'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const sanitizeKey = (key: string) => {
  // Replace spaces with underscores
  return key.replace(/\s/g, '_')
}

export const convertFileAndUpload = async ({ gmail, messageId, part }) => {
  const attachment = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId: messageId,
    id: part.body.attachmentId,
  })

  const base64 = Buffer.from(attachment.data.data, 'base64')
  const filename_ = part.filename.replace('/', '')
  console.log('🚀  filename_:', filename_)
  const filename = sanitizeKey(filename_)
  console.log('🚀  filename:', filename)

  fs.writeFileSync('temp/attachments/' + filename, base64)

  const document = await pdf('temp/attachments/' + filename, { scale: 3 })
  let images = []

  let counter = 1
  for await (const image of document) {
    const fileName = 'temp/attachments/' + filename + '_' + counter + '.png'
    fs.writeFileSync(fileName, image)
    images.push(fileName)
    counter++
  }

  // Get dimensions of first image to use as base
  const firstImageMetadata = await sharp(images[0]).metadata()
  const totalHeight = firstImageMetadata.height * images.length

  // Create array of image inputs with y offsets
  const compositeImages = images.map((image, index) => ({
    input: image,
    top: index * firstImageMetadata.height,
    left: 0,
  }))

  // Merge all images into one
  const mergedImagePath = 'temp/attachments/' + filename + '_merged.png'
  console.log('🚀  mergedImagePath:', mergedImagePath)

  await sharp({
    create: {
      width: firstImageMetadata.width,
      height: totalHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite(compositeImages)
    .toFile(mergedImagePath)

  // Upload the merged image to Supabase storage
  const fileBuffer = fs.readFileSync(mergedImagePath)
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(`${Date.now()}_${filename}_merged.png`, fileBuffer, {
      contentType: 'image/png',
      upsert: true,
    })

  console.log('🚀  data:', data)

  if (error) {
    throw new Error('Failed to upload file:' + error.message)
  }

  const { data: publicUrlData } = supabase.storage
    .from('receipts')
    .getPublicUrl(data.path)

  // Read file as base64 for OpenAI analysis
  const base64Image = fileBuffer.toString('base64')

  return {
    publicUrl: publicUrlData.publicUrl,
    base64Image: base64Image,
  }
}

import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'

import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'
import { sendEmail } from './sendEmail'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const emailReceipts = async ({
  fromEmail,
  toEmail,
  fileUrls,
}: {
  fromEmail: string
  toEmail: string
  fileUrls: string[]
}) => {
  // Create temp directory if it doesn't exist
  const tempDir = path.join(process.cwd(), 'temp')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
  }

  // Download all files to temp directory
  const downloadPromises = fileUrls.map(async (url) => {
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    const originalName = url.split('/').pop()
    const filePath = path.join(tempDir, originalName)
    fs.writeFileSync(filePath, Buffer.from(buffer))
    return filePath
  })

  const downloadedFiles = await Promise.all(downloadPromises)

  // Create zip file
  const zip = new AdmZip()
  downloadedFiles.forEach((filePath) => {
    zip.addLocalFile(filePath)
  })

  const zipPath = path.join(tempDir, 'receipts.zip')
  zip.writeZip(zipPath)

  // Upload zip to Supabase storage
  const zipBuffer = fs.readFileSync(zipPath)
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(`${Date.now()}_receipts.zip`, zipBuffer)

  if (error) throw error

  // Get download URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('receipts').getPublicUrl(data.path)

  // Clean up temp files
  downloadedFiles.forEach((filePath) => fs.unlinkSync(filePath))
  fs.unlinkSync(zipPath)

  sendEmail({
    fromEmail,
    toEmail,
    emailSubject: '[PinnOne] Receipts',
    emailText: `Here are your receipts. Download them here: ${publicUrl}
    
    Created by https://pinn.one/
    `,
  })
}

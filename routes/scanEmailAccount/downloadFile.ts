import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { Database } from '../../types/supabase'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const downloadFile = async ({ res, downloadUrl }) => {
  const newfilename = `temp/receipts/${res.date_of_invoice}-${res.vendor_name}-${res.total_cost}-${res.currency}-${res.invoice_or_receipt}.png`

  try {
    const response = await fetch(downloadUrl)

    if (!response.ok) {
      throw new Error('statusText: ' + response.statusText)
    }

    const buffer = await response.arrayBuffer()
    fs.writeFileSync(newfilename, Buffer.from(buffer))

    const fileBuffer = fs.readFileSync(newfilename)
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(newfilename, fileBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    const { data: publicUrlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(data.path)

    if (error) {
      throw new Error('Failed to upload file:' + error.message)
    }

    return publicUrlData.publicUrl
  } catch (error) {
    console.error('Error downloading the file:', error.message)
  }
}

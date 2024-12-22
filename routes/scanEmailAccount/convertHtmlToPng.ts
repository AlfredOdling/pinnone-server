import puppeteer from 'puppeteer'
import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const convertHtmlToPng = async ({ msg }) => {
  let htmlBody = ''
  if (msg?.data?.payload?.parts?.[0]?.parts?.[1]?.body?.data) {
    htmlBody = Buffer.from(
      msg.data.payload.parts[0].parts[1].body.data,
      'base64'
    ).toString('utf-8')
  }

  // Launch browser and create new page
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  // Set content and wait for network idle
  await page.setContent(htmlBody)
  await page.waitForNetworkIdle()

  // Take screenshot
  const screenshot = await page.screenshot({
    fullPage: true,
    encoding: 'base64',
  })

  await browser.close()

  const filename = `temp/attachments/${uuidv4()}.png`

  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(filename, Buffer.from(screenshot, 'base64'), {
      contentType: 'image/png',
    })

  if (error) throw error

  const { data: publicUrl } = supabase.storage
    .from('receipts')
    .getPublicUrl(filename)

  return {
    base64Image: screenshot,
    publicUrl: publicUrl.publicUrl,
  }
}

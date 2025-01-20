import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

chromium.setGraphicsMode = true

export const convertHtmlToPng = async ({ msg, type }) => {
  let htmlBody = ''
  if (type === 'html_no_attachments') {
    if (msg.data.payload.body.data) {
      htmlBody = Buffer.from(msg.data.payload.body.data, 'base64').toString(
        'utf-8'
      )
    }
  } else {
    if (msg?.data?.payload?.parts?.[0]?.parts?.[1]?.body?.data) {
      htmlBody = Buffer.from(
        msg.data.payload.parts[0].parts[1].body.data,
        'base64'
      ).toString('utf-8')
    }
  }

  // Launch browser and create new page
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--disable-dev-shm-usage'],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar'
    ),
    protocolTimeout: 240_000,
    ignoreHTTPSErrors: true,
  })

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

import * as dotenv from 'dotenv'
import OpenAI from 'openai'

import { zodResponseFormat } from 'openai/helpers/zod'
import { IsB2BSaaSTool } from '../types'

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const isB2BSaaSTool = async (vendorName) => {
  const completion1 = await openai.beta.chat.completions.parse({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `This is the vendor name from an invoice. Is this a B2B SaaS tool? Exclude tools that are accounting, billing, invoicing, etc. My definition of B2B SaaS tool is tools similar to tools like Slack, Zoom, Notion, Supabase, Salesforce, Hubspot, Framer, ChatGPT, etc.`,
      },
      {
        role: 'user',
        content: vendorName,
      },
    ],
    response_format: zodResponseFormat(IsB2BSaaSTool, 'isB2BSaaSTool'),
  })

  return completion1.choices[0].message.parsed.is_b2b_saas_tool
}

import * as dotenv from 'dotenv'
import OpenAI from 'openai'

import { zodResponseFormat } from 'openai/helpers/zod'
import { NewVendor } from '../types'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const addNewSender = async ({ senderName }: { senderName: string }) => {
  // const completion2 = await openai.beta.chat.completions.parse({
  //   model: 'gpt-4o',
  //   messages: [
  //     {
  //       role: 'system',
  //       content:
  //         'You are a professional data analyst, that knows everything about the B2B SaaS market. ' +
  //         'You are given a name of a SaaS app and its website. (The website link can be empty) ' +
  //         'Fetch data about the app.',
  //     },
  //     {
  //       role: 'user',
  //       content: `vendorName: ${vendorName}, website: ${website}`,
  //     },
  //   ],
  //   response_format: zodResponseFormat(NewVendor, 'newVendor'),
  // })
  // const vendor_ = completion2.choices[0].message.parsed.children

  const vendor = await supabase
    .from('sender')
    .insert({
      name: senderName,
      category: 'Other',
    })
    .select('*')
    .throwOnError()

  return vendor
}

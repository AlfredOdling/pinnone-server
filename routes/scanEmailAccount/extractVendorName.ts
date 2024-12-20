import * as dotenv from 'dotenv'
import OpenAI from 'openai'

import { zodResponseFormat } from 'openai/helpers/zod'
import { VendorName } from '../types'

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const extractVendorName = async (vendor) => {
  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `
        Extract the vendor name from the following name. 
        The name is from an invoice, so it might be a bit different than the actual name of the vendor.
        We just want the name of the vendor.
        
        For example, if the name is "Framer B.V.", return "Framer". And if the is "Supabase Pte. Ltd.", return "Supabase".
        And so on.
        `,
      },
      {
        role: 'user',
        content: vendor,
      },
    ],
    response_format: zodResponseFormat(VendorName, 'vendorName'),
  })

  return completion.choices[0].message.parsed.extracted_vendor_name
}

import * as dotenv from 'dotenv'
import OpenAI from 'openai'

import { zodResponseFormat } from 'openai/helpers/zod'
import { MailAnalysis } from '../types'

dotenv.config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const analyzeReceiptWithOpenAI = async (base64Image: string) => {
  // Remove any potential file path prefix and get just the base64 string
  const base64Data = base64Image.includes(',')
    ? base64Image.split(',')[1]
    : base64Image

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `
              You will be given an image of an invoice.
              Fill out the following JSON with the information from the image.
              
              IMPORTANT 1: If you are unsure about the pricing model at all, just set the pricing model to FLAT_FEE,
              and set the flat_fee_cost to the total cost of the invoice.

              IMPORTANT 2: If you are unsure of the renewal_frequency at all, just set it to MONTHLY.
              
              IMPORTANT 3: Keep in mind that the invoice can be in Swedish. So for example Invoice = "Faktura", receipt = "Kvitto".
              
              IMPORTANT 4: To be able to calculate everything correctly, make up a plan on what order you need to do things.

              --This is the instructions for the JSON fields--

              **vendor_name_raw**
              This is the name of the company that is providing the service.

              **vendor_name**
              Extract the vendor name from the following name. 
              The name is from an invoice, so it might be a bit different than the actual name of the vendor.
              We just want the name of the vendor.
        
              For example, if the name is "Framer B.V.", return "Framer". And if the is "Supabase Pte. Ltd.", return "Supabase".
              And so on.

              **renewal_start_date**
              Should be in the format: YYYY-MM-DD.
              This is the date for the start of the invoice period.
              If you are unsure, use the first day of the due date month.

              **renewal_next_date**
              Should be in the format: YYYY-MM-DD.
              This is the date for the end of the invoice period.
              If you are unsure, use the last day of the due date month.

              **renewal_frequency**
              If there is no period mentioned, it probably is just a one time payment and its should be OTHER.
              If renewal_start_date and renewal_next_date spans 12 months, its YEARLY.
              If renewal_start_date and renewal_next_date spans 3 months, its QUARTERLY.
              If renewal_start_date and renewal_next_date spans 1 month, its MONTHLY.
              For example: if renewal_start_date = 2024-12-01 and renewal_next_date = 2024-12-31, this spans a month, so renewal_frequency should be MONTHLY.
              
              **pricing_model**
              Evidence for USAGE_BASED pricing model should be some measurement of unit usage.
              For example: compute, storage, network, disk, processing power, emails sent, number of something that has been used, or similar.
              
              Evidence for PER_SEAT pricing model should be that it says something about SEATS or USERS specifically.
              Its not enough with evidence that shows it to have price per unit.
              Price per unit and price per seat are NOT the same thing.

              **number_of_seats**
              If pricing_model is PER_SEAT, take the total number of seats.
              For example, if the invoice says 5 seats for X, and 3 seats for Y, then the number of seats is 8.

              **price_per_seat**
              If pricing_model is PER_SEAT, just take the total cost and divide it by the number of seats.
              For example, if the total cost is 1000 and the number of seats is 10, then the price per seat is 100.

              **due_date**
              This is the date when the invoice is due, i.e when the invoice is expected to be paid.
              If its a receipt or you are unsure, set it empty.

              **important_info**
              This is urgent important information about if the invoice is a reminder (late payment). In your response, use the words "late payment" in your description if it is.

              **date_of_invoice**
              Should be in the format: YYYY-MM-DD.
              This is the date for the invoice.

              **total_cost**
              This is the total cost of the invoice.

              **company_website**
              This is the website of the company that is providing the service.
              If you find a website adress in the invoice, use that.
              There might might be different websites, one corresponding to the vendor, 
              and another one corresponding to some intermediary actor. Always use the one connected to the vendor.
              If you don't find a website adress, set it to empty string.

              **root_domain**
              This is the root domain of the company that is providing the service.
              For example, if the website is https://www.supabase.com/pricing, then the root domain is supabase.com.
              If you don't find a website adress, set it to empty string.

              **type**
              Decide what type of vendor this receipt is from. You have three options:
              - software: If the vendor is a B2B SaaS tool.
              - service: If the vendor is a consulting service.
              - other: If the vendor is something else.

              **is_a_receipt_or_invoice**
              This is true if you find evidence that the this image is a COMPLETE receipt or invoice (not just a partial invoice).
              Also, if the document is stating that it is page 2 or 3 or similar, then it is not a complete invoice. I just want the first page.
              Analyze the provided document and determine if it is a complete invoice. A complete invoice must include the following details:
              - Invoice number
              - Date of issue
              - Billing information (e.g., sender and recipient details)

              **ocr**
              This is the OCR number from the image. Should be a string of numbers, and look something like this: 506101435042358.
              If you are unsure, set it to empty string.

              **bank_number**
              This is the bank account number from the image. Should be a string of numbers, and look something like this: 5020-7042.
              If you are unsure, set it to empty string.
            `,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64Data}`,
            },
          },
        ],
      },
    ],
    response_format: zodResponseFormat(MailAnalysis, 'MailAnalysis'),
  })

  console.log('🚀 res:', JSON.parse(response.choices[0].message.content))

  return JSON.parse(
    response.choices[0].message.content
  ) as typeof MailAnalysis._type
}

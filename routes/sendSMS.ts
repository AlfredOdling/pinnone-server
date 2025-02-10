import { createClient } from '@supabase/supabase-js'
import _ from 'lodash'
import * as dotenv from 'dotenv'
import twilio from 'twilio'

import { Database } from '../types/supabase'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export const sendSMS = async () => {
  const org_users = await supabase
    .from('org_user')
    .select(`*, user!org_user_user_id_fkey(*), role(*), organization(*)`)

  const phoneNumbers = org_users.data
    ?.filter((org_user) => org_user.sms_reminders)
    .map((org_user) => org_user.user.phone)

  const { data: senders } = await supabase
    .from('sender')
    .select('*, receipt(*)')

  const receipts = senders?.flatMap(
    (sender) =>
      sender.receipt?.map((receipt) => ({
        ...receipt,
        name: sender.name,
      })) || []
  )

  for (const receiptObject of receipts) {
    if (
      receiptObject.due_date &&
      receiptObject.ocr &&
      receiptObject.bank_number
    ) {
      const dueDate = receiptObject.due_date.split('T')[0]
      const today = new Date().toISOString().split('T')[0]

      if (dueDate !== today) {
        phoneNumbers.forEach((phoneNumber) => {
          if (phoneNumber.includes('+')) {
            client.messages
              .create({
                body:
                  'Hi! The following invoice is due in three days: ' +
                  receiptObject.name +
                  ' - ' +
                  receiptObject.total_cost +
                  ' ' +
                  receiptObject.currency,
                from: '+12765301433',
                to: phoneNumber,
              })
              .then((message) => console.log(message.sid))
          }
        })
      }
    }
  }
}

// sendSMS()

// client.messages
//   .create({
//     body:
//       'Hi! The following invoice is due in three days:' +
//       `AB Consulting - 900 USD
//       Invoice: https://shorturl.at/bxE5L`,
//     from: '+12765301433',
//     to: '+46736868686',
//   })
//   .then((message) => console.log(message.sid))

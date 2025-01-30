import { createClient } from '@supabase/supabase-js'
import _ from 'lodash'
import * as dotenv from 'dotenv'

import { Database } from '../types/supabase'
import { scanEmailAccount } from './scanEmailAccount'
import { emailReceipts } from './emailReceipts'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const autoAccounting = async () => {
  const org_users = await supabase
    .from('org_user')
    .select(`*, user!org_user_user_id_fkey(*)`)
    .eq('auto_accounting', true)

  const emails = org_users.data.map((org_user) => org_user.user.email)

  const email_accounts = await supabase
    .from('email_account')
    .select(`*`)
    .in('email', emails)

  for (const email_account of email_accounts.data) {
    const res = await scanEmailAccount({
      email: email_account.email,
      organization_id: email_account.organization_id,
      owner_org_user_id: org_users.data.find(
        (org_user) => org_user.user.email === email_account.email
      ).id,
      after: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split('T')[0],
      before: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        .toISOString()
        .split('T')[0],
    })

    // Skicka till accountanterna
    // await emailReceipts({
    //   fromEmail: email_account.email,
    //   toEmail: email_account.email,
    //   fileUrls: res.data.map((receipt) => receipt.file_url),
    //   sendType: 'auto',
    // })

    // Skicka sen ett mejl till user med en sammanfattning av månaden
  }
}

autoAccounting()

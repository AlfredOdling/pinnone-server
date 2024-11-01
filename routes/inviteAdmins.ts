import { createClient } from '@supabase/supabase-js'
import _ from 'lodash'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'
import { sendEmail } from './sendEmail'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Needed for admin rights
)

export const inviteAdmins = async ({ emails, organization_id }) => {
  const emails_ = emails.split(',').map((email) => email.trim())

  const invitePromises = emails_.map(async (email) => {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      await supabase.from('users_organizations_roles').insert({
        user_id: existingUser.id,
        organization_id: organization_id,
        role_id: 3,
      })

      await sendEmail({
        fromEmail: 'info@pinneone.com',
        toEmail: email,
        emailSubject: '(PinnOne) Admin role added to your account',
        emailText:
          'You are now a part of the organization. If you already have the extension installed, you will are all set.',
      })

      return existingUser
    }

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        organization_id: organization_id,
        role: 'admin',
      },
      redirectTo: process.env.REACT_APP_FE_SERVER_URL,
    })

    if (error) throw error
    return data
  })

  await Promise.all(invitePromises)
}

import { createClient } from '@supabase/supabase-js'
import _ from 'lodash'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'
import { sendEmail } from './sendEmail'
import { Roles } from './consts'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Needed for admin rights
)

export const inviteExtensionUsers = async ({ emails, organization_id }) => {
  const emails_ = emails.split(',').map((email) => email.trim())

  await Promise.all(
    emails_.map(async (email) => {
      try {
        const { data: existingUser } = await supabase
          .from('user')
          .select('id')
          .eq('email', email)
          .single()

        if (existingUser) {
          await supabase.from('org_user').insert({
            user_id: existingUser.id,
            organization_id: organization_id,
            role_id: Roles.EXTENSION_USER,
          })

          await sendEmail({
            fromEmail: 'info@pinneone.com',
            toEmail: email,
            emailSubject: '(PinnOne) Extension user role added to your account',
            emailText:
              'You are now a part of the organization. If you already have the extension installed, you are all set.',
          })
          return existingUser
        } else {
          const { data } = await supabase.auth.admin.inviteUserByEmail(email, {
            data: {
              organization_id: organization_id,
              role: 'extension_user',
            },
            redirectTo: process.env.REACT_APP_FE_SERVER_URL + '/extension',
          })
          return data
        }
      } catch (error) {
        throw error
      }
    })
  )
}

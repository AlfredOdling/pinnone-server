import { createClient } from '@supabase/supabase-js'
import _ from 'lodash'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Needed for admin rights
)

export const inviteAdmins = async ({ emails, organization_id }) => {
  const emails_ = emails.split(',').map((email) => email.trim())

  try {
    const invitePromises = emails_.map(async (email) => {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            organization_id: organization_id,
            role: 'admin',
          },
          redirectTo: 'http://127.0.0.1:3000', //process.env.NETLIFY_WEB_ADDRESS,
        }
      )
      if (error) throw error
      return data
    })

    await Promise.all(invitePromises)
    return { success: true, message: 'All admins invited successfully' }
  } catch (error) {
    console.error('Error inviting admins:', error)
    return {
      success: false,
      error: error.message || 'An error occurred while inviting admins',
    }
  }
}

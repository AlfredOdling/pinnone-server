import { createClient } from '@supabase/supabase-js'
import _ from 'lodash'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Needed for admin rights
)

export const deleteExtensionUser = async ({ id }) => {
  try {
    const { data, error } = await supabase.auth.admin.deleteUser(id)
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error deleting extension user:', error)
    return {
      success: false,
      error: error.message || 'An error occurred while deleting extension user',
    }
  }
}

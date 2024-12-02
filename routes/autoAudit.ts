import { createClient } from '@supabase/supabase-js'
import _ from 'lodash'
import cron from 'node-cron'
import * as dotenv from 'dotenv'

import { Database } from '../types/supabase'
import { askTeam } from './askTeam'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const autoAudit = async () => {
  // Define company-specific cron jobs
  const companyCronJobs = await supabase.from('organization').select('*')

  // Store scheduled job identifiers
  const scheduledJobs = new Set()

  // Schedule cron jobs for each company
  companyCronJobs.data.forEach(({ auto_audit_cron, id }) => {
    // Check if the job for this organization is already scheduled
    if (!scheduledJobs.has(id)) {
      cron.schedule(auto_audit_cron, async () => {
        await askTeam({ message: 'Hello', organization_id: id })
      })
      // Add the job identifier to the set
      scheduledJobs.add(id)
    }
  })
}

// Crontab expression
// * * * * *
// │ │ │ │ │
// │ │ │ │ └─────────── Day of the week (0 - 6)
// │ │ │ └───────────── Month (1 - 12)
// │ │ └─────────────── Day of the month (1 - 31)
// │ └───────────────── Hour (0 - 23)
// └─────────────────── Minute (0 - 59)

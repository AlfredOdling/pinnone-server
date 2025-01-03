import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'
import { sendEmail } from './sendEmail'

function dedupeArray(array) {
  const seen = new Set()
  return array?.filter((item) => {
    const uniqueId = item.org_user.id // Using tool.id for deduplication
    if (seen.has(uniqueId)) {
      return false // Skip if already seen
    }
    seen.add(uniqueId)
    return true // Include if not seen
  })
}

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Needed for admin rights
)

export const askTeam = async ({ message, organization_id }) => {
  const { data: orgUsers } = await supabase
    .from('org_user')
    .select('*')
    .eq('organization_id', organization_id)

  const { data: userActivities } = await supabase
    .from('user_activity')
    .select('*, org_user(*, user(*)), tool(*, vendor(*), receipt(*))')
    .in(
      'org_user_id',
      orgUsers.map((orgUser) => orgUser.id)
    )

  const { data: tools } = await supabase
    .from('tool')
    .select('*')
    .eq('organization_id', organization_id)

  const dedupedUserActivities = dedupeArray(userActivities)

  const toolsToUpdate = tools
    .filter((tool) => !tool.status_should_be)
    .filter((tool) => tool.status === 'not_in_stack')

  for (const tool of toolsToUpdate) {
    await supabase
      .from('tool')
      .update({ status_should_be: 'not_set' })
      .eq('id', tool.id)
  }

  for (const dedupedUserActivity of dedupedUserActivities) {
    await sendEmail({
      fromEmail: 'info@pinneone.com',
      toEmail: dedupedUserActivity.org_user.user.email,
      emailSubject: '[PinnOne] Validate tool tracking',
      emailText: `${message}\n\nLink: ${process.env.REACT_APP_FE_SERVER_URL}/validate-domains\n\n- PinnOne`,
    })
  }
}

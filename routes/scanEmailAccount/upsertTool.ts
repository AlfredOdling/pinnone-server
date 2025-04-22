import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

type Sender = Database['public']['Tables']['sender']['Row']

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const upsertTool = async ({
  organization_id,
  sender,
  owner_org_user_id,
}: {
  organization_id: string
  sender: Sender
  owner_org_user_id: number
}) => {
  let tool_res = await supabase
    .from('tool')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('sender_id', sender.id)
    .throwOnError()
  let tool = tool_res

  if (!tool.data?.length) {
    tool_res = await supabase
      .from('tool')
      .insert({
        name: sender.name,
        organization_id,
        sender_id: sender.id,
        status: 'not_in_stack',
        is_tracking: false,
        department: sender.category,
        owner_org_user_id,
        type: 'software',
      })
      .select('*')
      .throwOnError()
    tool = tool_res
  }

  return tool.data[0]
}

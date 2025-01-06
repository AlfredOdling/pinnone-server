import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

type Sender = Database['public']['Tables']['sender']['Row']
export const generateTool = async ({
  organization_id,
  sender,
  type,
  owner_org_user_id,
}: {
  organization_id: string
  sender: Sender
  type: string
  owner_org_user_id: number
}) => {
  let tool_res = await supabase
    .from('tool')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('sender_id', sender.id) // TODO: detta ska vara kopplat: tools som har senders
    .throwOnError()
  let tool = tool_res

  if (!tool.data?.length) {
    tool_res = await supabase
      .from('tool')
      .insert({
        organization_id,
        status: 'in_stack',
        is_tracking: type === 'software',
        is_desktop_tool: type !== 'software',
        department: sender.category,
        owner_org_user_id,
        type,
      })
      .select('*')
      .throwOnError()
    tool = tool_res
  }

  return tool.data[0]
}

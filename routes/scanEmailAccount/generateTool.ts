import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const generateTool = async ({
  organization_id,
  vendor,
  type,
  owner_org_user_id,
}) => {
  const vendor_ = vendor.data[0]

  let tool_res = await supabase
    .from('tool')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('vendor_id', vendor_.id)
    .single()
  let tool = tool_res.data

  if (!tool) {
    tool_res = await supabase
      .from('tool')
      .insert({
        organization_id,
        vendor_id: vendor_.id,
        status: 'in_stack',
        is_tracking: type === 'software',
        is_desktop_tool: type !== 'software',
        department: vendor_.category,
        owner_org_user_id,
        type,
      })
      .select('*')
      .single()
      .throwOnError()
    tool = tool_res.data
  }

  return tool
}

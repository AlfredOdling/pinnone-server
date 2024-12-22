import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

type Vendor = Database['public']['Tables']['vendor']['Row']

export const generateTool = async ({
  organization_id,
  vendor,
  type,
  owner_org_user_id,
}: {
  organization_id: string
  vendor: Vendor
  type: string
  owner_org_user_id: number
}) => {
  let tool_res = await supabase
    .from('tool')
    .select('*')
    .eq('organization_id', organization_id)
    .eq('vendor_id', vendor.id)
    .throwOnError()
  let tool = tool_res

  if (!tool.data?.length) {
    tool_res = await supabase
      .from('tool')
      .insert({
        organization_id,
        vendor_id: vendor.id,
        status: 'in_stack',
        is_tracking: type === 'software',
        is_desktop_tool: type !== 'software',
        department: vendor.category,
        owner_org_user_id,
        type,
      })
      .select('*')
      .throwOnError()
    tool = tool_res
  }

  return tool.data[0]
}

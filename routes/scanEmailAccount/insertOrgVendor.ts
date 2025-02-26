import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../../types/supabase'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const insertOrgVendor = async ({ res, organization_id }) => {
  console.log('🚀 insertOrgVendor res:', res)
  const org_vendors = await supabase.from('org_vendor').upsert(
    {
      name: res.vendor_name_raw,
      description: res.vendor_description,
      url: res.vendor_url,
      category: res.vendor_category,
      logo_url: res.vendor_logo_url,
      link_to_pricing_page: res.vendor_link_to_pricing_page,
      root_domain: res.vendor_root_domain || '',
      organization_id,
      status: 'not_in_stack',
      source: 'email_scan',
    },
    {
      onConflict: 'root_domain, organization_id',
      ignoreDuplicates: true,
    }
  )
  console.log('🚀 org_vendors:', org_vendors)
}

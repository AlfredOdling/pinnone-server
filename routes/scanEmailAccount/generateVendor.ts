import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'
import { addNewVendor } from './addNewVendor'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const generateVendor = async ({
  vendorName,
  website,
}: {
  vendorName: string
  website: string
}) => {
  let vendor
  const existingVendor = await supabase
    .from('vendor')
    .select('*')
    .ilike('name', `%${vendorName}%`)
    .throwOnError()

  if (!existingVendor.data?.length) {
    const newVendor = await addNewVendor({ vendorName, website })
    vendor = newVendor
  } else {
    vendor = existingVendor
  }

  return vendor.data[0]
}

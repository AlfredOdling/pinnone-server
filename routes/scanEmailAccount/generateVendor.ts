import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'
import { addNewVendor } from './addNewVendor'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const generateVendor = async (extracted_vendor_name: string) => {
  let vendor
  const existingVendor = await supabase
    .from('vendor')
    .select('*')
    .eq('name', extracted_vendor_name)
    .throwOnError()

  if (!existingVendor.data?.length) {
    const newVendor = await addNewVendor(extracted_vendor_name)
    vendor = newVendor
  } else {
    vendor = existingVendor
  }

  return vendor.data[0]
}

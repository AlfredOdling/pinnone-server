import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const generateOrFetchSender = async ({
  senderName,
  organization_id,
}: {
  senderName: string
  organization_id: string
}) => {
  let sender
  const existingSender = await supabase
    .from('sender')
    .select('*')
    .eq('name', senderName)
    .eq('organization_id', organization_id)
    .throwOnError()
  console.log('🚀  existingSender:', existingSender)

  if (!existingSender.data?.length) {
    const newSender = await supabase
      .from('sender')
      .upsert(
        {
          name: senderName,
          category: 'Other',
          organization_id,
        },
        {
          onConflict: 'name, organization_id',
          ignoreDuplicates: true,
        }
      )
      .select('*')
    console.log('🚀  newSender:', newSender)
    sender = newSender
  } else {
    sender = existingSender
  }

  return sender?.data?.[0] || null
}

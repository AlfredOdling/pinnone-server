import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const generateSender = async ({
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

  if (!existingSender.data?.length) {
    const newSender = await supabase
      .from('sender')
      .insert({
        name: senderName,
        category: 'Other',
        organization_id,
      })
      .select('*')
    sender = newSender
  } else {
    sender = existingSender
  }

  return sender.data[0]
}

import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'
import { addNewSender } from './addNewVendor'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const generateSender = async ({
  senderName,
}: {
  senderName: string
}) => {
  let sender
  const existingSender = await supabase
    .from('sender')
    .select('*')
    .eq('name', senderName)
    .throwOnError()

  if (!existingSender.data?.length) {
    const newSender = await addNewSender({ senderName })
    sender = newSender
  } else {
    sender = existingSender
  }

  return sender.data[0]
}

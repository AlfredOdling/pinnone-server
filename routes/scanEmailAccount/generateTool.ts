import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/supabase'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { MatchedVendorsSenders } from '../types'

type Sender = Database['public']['Tables']['sender']['Row']

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const generateTool = async ({
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

  const orgVendorId = await matchSenderWithOrgVendor(sender, organization_id)

  if (!tool.data?.length) {
    tool_res = await supabase
      .from('tool')
      .insert({
        name: sender.name,
        organization_id,
        sender_id: sender.id,
        org_vendor_id: orgVendorId,
        status: 'in_stack',
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

const matchSenderWithOrgVendor = async (
  sender: Sender,
  organization_id: string
) => {
  const org_vendors = await supabase
    .from('org_vendor')
    .select('id, name')
    .eq('organization_id', organization_id)

  // Format the content for OpenAI
  const content = {
    senders: [{ id: sender.id, name: sender.name }],
    vendors: org_vendors.data.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
    })),
  }
  console.log('🚀 --- Matching the new sender to a vendor ---')
  console.log('🚀 1 content:', content)

  // Use OpenAI to map the senders to the vendors
  const completion = await openai.beta.chat.completions.parse({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are a professional data analyst, that knows everything about the B2B SaaS market. ' +
          `
            You will be give two lists: Vendors: [{ id, name }] and Senders: [{ id, name }]
            The vendor is a software vendor, and the sender is the software vendor name that is stated on their inovice.

            Try to map the vendor name to the sender name.
            For example: if you have a vendor with the name "Supabase", that should be mapped to a sender with the name "Supabase Pte. Ltd.".
            
            If there is a match, use the name and id from the vendor and sender.
            If there is no match, just return null.
          `,
      },
      {
        role: 'user',
        content: JSON.stringify(content),
      },
    ],
    response_format: zodResponseFormat(
      MatchedVendorsSenders,
      'matchedVendorsSenders'
    ),
  })

  console.log('🚀 4 completion:', completion.choices[0].message.parsed.children)

  return completion.choices[0].message.parsed.children[0].vendor_id || null
}

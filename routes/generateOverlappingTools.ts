import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { OverlappingToolsList } from './types'

dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Needed for admin rights
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const generateOverlappingTools = async ({
  organization_id,
}: {
  organization_id: string
}) => {
  const tools = await supabase
    .from('tool')
    .select(`*`)
    .eq('organization_id', organization_id)
    .eq('status', 'in_stack')

  const toolsList = tools.data.map((tool) => tool.name)

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Are there any tools that are overlapping in terms of usage? I'm looking to save money and i dont want to pay for tools that are similar. Only if there are overlapping tools, then you should answer. They should not just be kind of the same, they should be VERY similar.`,
        },
        {
          role: 'user',
          content: JSON.stringify(toolsList),
        },
      ],
      response_format: zodResponseFormat(
        OverlappingToolsList,
        'overlappingToolsList'
      ),
    })
    const res1 = await supabase
      .from('overlapping_tool')
      .delete()
      .eq('organization_id', organization_id)
    console.log('🚀  res1:', res1)

    const res2 = await supabase.from('overlapping_tool').insert(
      // @ts-ignore
      completion.choices[0].message.parsed.children?.map((tool) => ({
        title: tool.overlap_category,
        description: tool.description,
        overlappingtools: tool.overlappingTools,
        organization_id,
      }))
    )
    console.log('🚀  res2:', res2)
  } catch (error) {
    console.error('Error processing vendors:', error)
    throw new Error('Failed to process and update vendors')
  }
}

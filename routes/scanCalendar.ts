import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import fs from 'fs'
import OpenAI from 'openai'

import { OAuth2Client, UserRefreshClient } from 'google-auth-library'
import { zodResponseFormat } from 'openai/helpers/zod'
import { ToolCost2 } from './types'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'
import { pdf } from 'pdf-to-img'

dotenv.config()

const oAuth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
)

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getCalendarEvents(
  oAuth2Client,
  calendarId = 'primary',
  timeMin,
  timeMax
) {
  // Initialize the Google Calendar API
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })

  try {
    // Fetch events from the calendar
    const res = await calendar.events.list({
      calendarId: calendarId, // 'primary' is the default calendar
      timeMin: timeMin, // Start date-time (ISO string)
      timeMax: timeMax, // End date-time (ISO string)
      singleEvents: true, // Expand recurring events into single instances
      orderBy: 'startTime', // Order by start time
    })

    // Extract event summaries
    const events = res.data.items || []

    const eventSummaries = events.map((event) => event.summary || '(No title)')

    const events2 = events.map((event) => event)

    return events2
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    throw error
  }
}

export const scanCalendar = async ({
  email,
  organization_id,
  after,
  before,
}: {
  email: string
  organization_id: string
  after: string
  before: string
}) => {
  const { data: emailAccount } = await supabase
    .from('email_account')
    .select()
    .eq('email', email)
    .eq('organization_id', organization_id)
    .single()

  if (!emailAccount) throw new Error('Email account not found')

  try {
    oAuth2Client.setCredentials({
      access_token: emailAccount.access_token,
      refresh_token: emailAccount.refresh_token,
    })

    const timeMin = '2024-01-01T00:00:00Z' // Start date (ISO format)
    const timeMax = '2024-12-31T23:59:59Z' // End date (ISO format)

    try {
      const events = await getCalendarEvents(
        oAuth2Client,
        'primary',
        timeMin,
        timeMax
      )

      const month_map = {
        '1': 'January',
        '2': 'February',
        '3': 'March',
        '4': 'April',
        '5': 'May',
        '6': 'June',
        '7': 'July',
        '8': 'August',
        '9': 'September',
        '10': 'October',
        '11': 'November',
        '12': 'December',
      }

      let travel_days_total_per_month = {
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0,
        '6': 0,
        '7': 0,
        '8': 0,
        '9': 0,
        '10': 0,
        '11': 0,
        '12': 0,
      }

      const filteredEvents = events.filter((event) =>
        event.summary.includes('[expense]')
      )

      for (const event of filteredEvents) {
        const start_date = event.start?.date
        const [start_year, start_month, start_day] = start_date?.split('-')

        const end_date = event.end?.date
        const [end_year, end_month, end_day] = end_date?.split('-')

        travel_days_total_per_month[start_month] +=
          Number(end_day) - Number(start_day)
      }

      // Iterate underlag
      for (const month in travel_days_total_per_month) {
        console.log(
          `Travel days in ${month_map[month]} is ${travel_days_total_per_month[month]}`
        )
      }
    } catch (err) {
      console.error('Error:', err.message)
    }
  } catch (error) {
    console.error('Error in scanEmails:', error)
    throw error
  }
}

scanCalendar({
  email: 'alfred@flexone.vc',
  organization_id: 'b34cd74c-b805-416c-b4d9-a41dc0173d3c',
  after: '2023/5/31',
  before: '2024/6/1',
})

import { google } from 'googleapis'
import * as dotenv from 'dotenv'

import { OAuth2Client } from 'google-auth-library'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/supabase'

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
  timeMin,
  timeMax,
}: {
  email: string
  organization_id: string
  timeMin: string
  timeMax: string
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

    try {
      const events = await getCalendarEvents(
        oAuth2Client,
        'primary',
        timeMin,
        timeMax
      )

      const filteredEvents = events.filter((event) => {
        return event.summary && event.summary.includes('[expense]')
      })

      let travelDays = {
        '2023': {
          '5': 0,
          '6': 0,
          '7': 0,
          '8': 0,
          '9': 0,
          '10': 0,
          '11': 0,
          '12': 0,
        },
        '2024': {
          '1': 0,
          '2': 0,
          '3': 0,
          '4': 0,
          '5': 0,
          '6': 0,
        },
      }

      for (const event of filteredEvents) {
        const start_date = event.start?.date
        const [start_year, start_month, start_day] = start_date?.split('-')

        console.log(`${start_date} / ${start_year} ${start_month} ${start_day}`)

        const end_date = event.end?.date
        const [end_year, end_month, end_day] = end_date?.split('-')

        console.log(`${end_date} / ${end_year} ${end_month} ${end_day}`)

        const monthDiff = Number(end_day) - Number(start_day)

        console.log('🚀  monthDiff:', monthDiff)

        travelDays[start_year][start_month] += monthDiff

        // travel_days_total_per_month[start_month] +=
        //   Number(end_day) - Number(start_day)
      }

      console.log('🚀  travelDays:', travelDays)

      // Iterate underlag
      // for (const month in travel_days_total_per_month) {
      //   console.log(
      //     `Travel days in ${month_map[month]} is ${travel_days_total_per_month[month]}`
      //   )
      // }
    } catch (err) {
      console.error('Error:', err.message)
    }
  } catch (error) {
    console.error('Error in scanEmails:', error)
    throw error
  }
}

scanCalendar({
  email: 'alfredodling@gmail.com',
  organization_id: 'b34cd74c-b805-416c-b4d9-a41dc0173d3c',
  timeMin: '2023-05-31T00:00:00Z',
  timeMax: '2024-06-01T23:59:59Z',
})

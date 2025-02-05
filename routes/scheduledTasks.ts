import cron from 'node-cron'
import { sendSMS } from './sendSMS'
import { cleanupNotifications } from './cleanupActivity'
import { refreshTokens } from './scanEmailAccount/refreshToken'
import { resetScans } from './resetScans'

export const scheduledTasks = () => {
  // Runs every day at 12:00
  // cron.schedule(`0 12 * * *`, async () => {
  //   console.log('🚀 autoAudit starting...')
  //   await autoAudit()
  // })

  // Runs every day at 12:00 -- Send SMS reminders
  cron.schedule(`0 12 * * *`, async () => {
    console.log('🚀 scheduleSMS starting...')
    await sendSMS()
  })

  // Runs every day at 13:00 -- Cleanup notifications data
  cron.schedule(`0 13 * * *`, async () => {
    console.log('🚀 Cleaning up notifications data starting...')
    await cleanupNotifications()
  })

  // Runs every day at 09:00 -- Refresh tokens
  cron.schedule(`0 09 * * *`, async () => {
    console.log('🚀 refreshTokens starting...')
    await refreshTokens()
  })

  // Runs 12:00 last of every month -- Auto-accounting
  // cron.schedule(`0 12 * * 31`, async () => {
  //   console.log('🚀 Auto-accounting starting...')
  //   await autoAccounting()
  // })

  // Runs 01:00 first day of every month -- Fill up scans left
  cron.schedule(`0 1 1 * *`, async () => {
    console.log('🚀 Reset scans...')
    await resetScans()
  })
}

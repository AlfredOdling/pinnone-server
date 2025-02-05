import { Router, Request, Response } from 'express'
import { inviteAdmins } from './inviteAdmins'
import { inviteExtensionUsers } from './inviteExtensionUsers'
import { deleteExtensionUser } from './deleteExtensionUser'
import { addToolsManually } from './addToolsManually'
import { generateOverlappingTools } from './generateOverlappingTools'
import { handleStripeWebhooks } from './handleStripeWebhooks'
import { askTeam } from './askTeam'
import { sendExtensionInvite } from './sendExtensionInvite'
import { scanEmailAccount } from './scanEmailAccount'
import { emailReceipts } from './emailReceipts'
import { googleAuth } from './scanEmailAccount/authGoogle'
import { Piscina } from 'piscina'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
import { createCheckoutSession } from './stripeFunctions'
import { scheduledTasks } from './scheduledTasks'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const syncBrowserHistoryPool = new Piscina({
  filename: path.resolve(__dirname, '../workers/syncBrowserHistoryWorker.ts'),
  minThreads: 3,
  maxThreads: os.cpus().length,
})

// Function to log pool stats every 5 seconds
setInterval(async () => {
  console.log('------ 💻 Pool stats:')
  console.table({
    maxThreads: syncBrowserHistoryPool.maxThreads,
    minThreads: syncBrowserHistoryPool.minThreads,
    threads: syncBrowserHistoryPool.threads.length,
    queueSize: syncBrowserHistoryPool.queueSize,
    needsDrain: syncBrowserHistoryPool.needsDrain,
    utilization: Math.round(syncBrowserHistoryPool.utilization * 100),
    taskMeanWait: syncBrowserHistoryPool.waitTime.mean,
  })
}, 25000)

// Runs all cron-jobs
scheduledTasks()

const router = Router()

router.post('/webhook', async (req: Request, res: Response) => {
  await handleStripeWebhooks(req, res)
})

router.post('/invite-admins', async (req: Request, res: Response) => {
  const { emails, organization_id } = req.body

  try {
    await inviteAdmins({ emails, organization_id })
    res.status(200).send()
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
  }
})

router.post('/invite-extension-users', async (req: Request, res: Response) => {
  const { emails, organization_id } = req.body

  try {
    await inviteExtensionUsers({ emails, organization_id })
    res.status(200).send()
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
  }
})

router.post('/send-extension-invite', async (req: Request, res: Response) => {
  const { emails } = req.body
  console.log('🚀 sendExtensionInvite  emails:', emails)

  try {
    await sendExtensionInvite({ emails })
    res.status(200).send()
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
  }
})

router.post('/syncBrowserHistory', async (req: Request, res: Response) => {
  const { data } = req.body
  const props = {
    user_id: data.user_id,
    encryptedData: data.encryptedData,
  }

  try {
    console.log('🔥 --- syncBrowserHistory starting for: ', data.user_id)
    await syncBrowserHistoryPool.run(props)
    console.log('✅ --- syncBrowserHistory done!')

    res.status(200).send()
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
  }
})

router.post('/delete-extension-user', async (req: Request, res: Response) => {
  const { id } = req.body
  try {
    await deleteExtensionUser({ id })

    res.status(200).send()
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
  }
})

router.post('/add-tools-manually', async (req: Request, res: Response) => {
  const { vendors, organization_id, owner_org_user_id } = req.body
  console.log('⏳ addToolsManually loading...')

  try {
    await addToolsManually({
      vendors,
      organization_id,
      owner_org_user_id,
    })

    console.info('addToolsManually done ✅')
    res.status(200).send()
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
  }
})

router.post(
  '/generate-overlapping-tools',
  async (req: Request, res: Response) => {
    const { organization_id } = req.body
    console.log('--------⏳ generateOverlappingTools starting...')

    try {
      await generateOverlappingTools({
        organization_id,
      })

      console.info('--------generateOverlappingTools done ✅')
      res.status(200).send()
    } catch (error) {
      console.error(error)
      res.status(500).send({ error: 'Failed', msg: error.message })
    }
  }
)

router.post('/ask-team', async (req: Request, res: Response) => {
  const { message, organization_id } = req.body

  try {
    await askTeam({ message, organization_id })
    res.status(200).send()
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
  }
})

router.post('/auth/google', async (req, res) => {
  const tokens = await googleAuth({
    code: req.body.code,
    organization_id: req.body.organization_id,
  })
  res.json(tokens)
})

router.post('/scan-email-account', async (req, res) => {
  const tokens = await scanEmailAccount({
    email: req.body.email,
    organization_id: req.body.organization_id,
    owner_org_user_id: req.body.org_user_id,
    after: req.body.after,
    before: req.body.before,
  })
  res.json(tokens)
})

router.post('/email-receipts', async (req, res) => {
  const {
    fromEmail,
    toEmail,
    fileUrls,
    sendType,
    organization_id,

    org_user_id,
  } = req.body
  await emailReceipts({
    fromEmail,
    toEmail,
    fileUrls,
    sendType,
    organization_id,
    org_user_id,
  })
  res.json({ data: 'Receipts emailed' })
})

router.post('/create-checkout-session', async (req, res) => {
  const { email } = req.body

  try {
    const url = await createCheckoutSession(email)
    res.json({ url })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
})

export default router

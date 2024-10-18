import { Router, Request, Response } from 'express'
import { sendEmail } from './sendEmail'
import { inviteAdmins } from './inviteAdmins'
import { inviteExtensionUsers } from './inviteExtensionUsers'
import { updateVendors } from './updateVendors'
import { syncBrowserHistory } from './syncBrowserHistory'

const router = Router()

router.post('/emailEditRequirement', async (req: Request, res: Response) => {
  const { email } = req.body

  try {
    const data = await sendEmail({
      emailSubject: 'Edit Requirement',
      toEmail: email,
      emailText: `Hello, you have been invited to edit a requirement. Please login to your account to view the requirement under "My requests".`,
      fromEmail: '',
    })
    res.status(200).send({ data })
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error })
  }
})

router.post('/inviteAdmins', async (req: Request, res: Response) => {
  const { emails, organization_id } = req.body

  try {
    await inviteAdmins({ emails, organization_id })
    res.status(200).send({ data: 'Invited' })
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error })
  }
})

// inviteExtenstionUsers
router.post('/inviteExtensionUsers', async (req: Request, res: Response) => {
  const { emails, organization_id } = req.body

  try {
    await inviteExtensionUsers({ emails, organization_id })
    res.status(200).send({ data: 'Invited' })
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error })
  }
})

router.post('/updateVendors', async (req: Request, res: Response) => {
  const { data } = req.body
  console.log('⏳ updateVendors loading...')

  try {
    await updateVendors({
      encryptedData: data.encryptedData,
      userId: data.userId,
    })

    res.status(200).send({ data: 'History retrieved' })
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
  }
})

router.post('/syncBrowserHistory', async (req: Request, res: Response) => {
  const { data } = req.body
  console.log('⏳ syncBrowserHistory loading...')

  try {
    await syncBrowserHistory({
      encryptedData: data.encryptedData,
      userId: data.userId,
    })

    res.status(200).send({ data: 'History retrieved' })
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
  }
})

export default router

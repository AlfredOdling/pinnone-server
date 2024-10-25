import { Router, Request, Response } from 'express'
import { sendEmail } from './sendEmail'
import { inviteAdmins } from './inviteAdmins'
import { inviteExtensionUsers } from './inviteExtensionUsers'
import { syncBrowserHistory } from './syncBrowserHistory'
import { deleteExtensionUser } from './deleteExtensionUser'
import { addVendors } from './addVendors'

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

router.post('/deleteExtensionUser', async (req: Request, res: Response) => {
  const { id } = req.body
  await deleteExtensionUser({ id })
})

router.post('/addVendors', async (req: Request, res: Response) => {
  const { vendors, organization_id, budget_owner_id } = req.body
  console.log('⏳ addVendors loading...')

  try {
    await addVendors({
      vendors,
      organization_id,
      budget_owner_id,
    })

    res.status(200).send({ data: 'History retrieved' })
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
  }
})

export default router

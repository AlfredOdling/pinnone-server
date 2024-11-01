import { Router, Request, Response } from 'express'
import { sendEmail } from './sendEmail'
import { inviteAdmins } from './inviteAdmins'
import { inviteExtensionUsers } from './inviteExtensionUsers'
import { syncBrowserHistory } from './syncBrowserHistory'
import { deleteExtensionUser } from './deleteExtensionUser'
import { addVendors } from './addVendors'
import { updateVendors } from './updateVendors'
// import express from 'express'
// import { handleStripeWebhooks } from './handleStripeWebhooks'

const router = Router()

// router.post(
//   '/webhook',
//   express.raw({ type: 'application/json' }),
//   async (req: Request, res: Response) => {
//     console.log('🚀  res:', res)
//     console.log('🚀  req:', req)
//     await handleStripeWebhooks(req, res)
//   }
// )

router.post('/inviteAdmins', async (req: Request, res: Response) => {
  const { emails, organization_id } = req.body

  try {
    await inviteAdmins({ emails, organization_id })
    res.status(200).send()
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
  }
})

router.post('/inviteExtensionUsers', async (req: Request, res: Response) => {
  const { emails, organization_id } = req.body

  try {
    await inviteExtensionUsers({ emails, organization_id })
    res.status(200).send()
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

    res.status(200).send()
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
  }
})

router.post('/deleteExtensionUser', async (req: Request, res: Response) => {
  const { id } = req.body
  try {
    await deleteExtensionUser({ id })
    res.status(200).send()
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
  }
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

    res.status(200).send()
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
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

export default router

import { Router, Request, Response } from 'express'
import { inviteAdmins } from './inviteAdmins'
import { inviteExtensionUsers } from './inviteExtensionUsers'
import { syncBrowserHistory } from './syncBrowserHistory'
import { deleteExtensionUser } from './deleteExtensionUser'
import { addVendors } from './addVendors'
import { updateVendors } from './updateVendors'
import { getOrgUsers } from './utils'
import { generateOverlappingTools } from './generateOverlappingTools'
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
  console.log('--------⏳ syncBrowserHistory starting')
  try {
    const orgUsers = await getOrgUsers({ user_id: data.user_id })
    console.log('🚀 syncBrowserHistory orgUsers:', orgUsers)

    await Promise.all(
      orgUsers.map((orgUser) =>
        syncBrowserHistory({
          encryptedData: data.encryptedData,
          org_user_id: orgUser.id,
          organization_id: orgUser.organization_id,
        })
      )
    )

    console.info('--------syncBrowserHistory done ✅')
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
  const { vendors, organization_id, owner_org_user_id } = req.body
  console.log('⏳ addVendors loading...')

  try {
    await addVendors({
      vendors,
      organization_id,
      owner_org_user_id,
    })

    console.info('addVendors done ✅')
    res.status(200).send()
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
  }
})

router.post('/updateVendors', async (req: Request, res: Response) => {
  const { data } = req.body
  console.log('--------⏳ updateVendors starting...')

  try {
    const orgUsers = await getOrgUsers({ user_id: data.user_id })
    console.log('🚀 updateVendors orgUsers:', orgUsers)

    await Promise.all(
      orgUsers.map((orgUser) =>
        updateVendors({
          encryptedData: data.encryptedData,
          organization_id: orgUser.organization_id,
        })
      )
    )

    console.info('--------updateVendors done ✅')
    res.status(200).send({ data: 'History retrieved' })
  } catch (error) {
    console.error(error)
    res.status(500).send({ error: 'Failed', msg: error.message })
  }
})

router.post(
  '/generateOverlappingTools',
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

export default router

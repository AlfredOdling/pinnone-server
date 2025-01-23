import { Request, Response } from 'express'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import _ from 'lodash'
import * as dotenv from 'dotenv'
import { Database } from '../types/supabase'
dotenv.config()

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export const handleStripeWebhooks = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature']
  let event
  console.log('🚀  event:', event)

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.log('🚀  err:', err)
    res.status(400).send('Webhook Error' + err.message)
  }

  if (event.type === 'customer.subscription.created') {
    const productIdCreated = event.data.object.items.data[0].price.product
    await SubscriptionCreated(event.data.object, productIdCreated)
  }

  if (event.type === 'customer.subscription.updated') {
    const productIdUpdated = event.data.object.items.data[0].price.product
    await SubscriptionUpdated(event.data.object, productIdUpdated)
  }

  if (event.type === 'customer.subscription.deleted') {
    const productIdDeleted = event.data.object.items.data[0].price.product
    await SubscriptionDeleted(event.data.object, productIdDeleted)
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send()
}

const SubscriptionCreated = async (obj: any, productId: string) => {
  const customer: any = await stripe.customers.retrieve(obj.customer)
  console.log('🚀  created:', customer)

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(
    customer.email,
    {
      data: {
        team_name: 'NewCo',
        role: 'superadmin',
        stripe_product_id: productId,
      },
      redirectTo: process.env.REACT_APP_FE_SERVER_URL,
    }
  )

  console.log('🚀  data:', data)
  console.log('🚀  error:', error)
}

const SubscriptionUpdated = async (obj: any, productId: string) => {
  const customer: any = await stripe.customers.retrieve(obj.customer)
  console.log('🚀  updated:', customer)
  console.log('🚀  productId:', productId)

  const res = await supabase
    .from('user')
    .select(`current_org_id`)
    .eq('email', 'alfredodling@gmail.com')
    .single()
  console.log('🚀 current_org_id res:', res)
  const current_org_id = res.data.current_org_id

  const { data, error } = await supabase
    .from('organization')
    .update({
      stripe_product_id: productId,
    })
    .eq('id', current_org_id)
    .select()

  console.log('🚀  data:', data)
  console.log('🚀  error:', error)
}

const SubscriptionDeleted = async (obj: any, productId: string) => {
  const customer: any = await stripe.customers.retrieve(obj.customer)
  console.log('🚀  deleted:', customer)
  console.log('🚀  productId:', productId)

  // const res = await supabase
  //   .from('profiles')
  //   .select(`profiles_companies_roles (company_id)`)
  //   .eq('email', customer.email)

  // const company_id = res.data[0].profiles_companies_roles[0].company_id

  // await supabase
  //   .from('companies')
  //   .update({
  //     // @ts-ignore
  //     consultants_limit: 5,
  //   })
  //   .eq('id', company_id)
  //   .select()
}

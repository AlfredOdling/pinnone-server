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

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
    console.log('🚀  event:', event)
  } catch (err) {
    console.log('🚀  err:', err)
    res.status(400).send('Webhook Error' + err.message)
  }

  switch (event.type) {
    case 'customer.subscription.created':
      const productIdCreated = event.data.object.items.data[0].price.product // Extract product_id
      console.log('🚀  productIdCreated:', productIdCreated)
      await SubscriptionCreated(event.data.object, productIdCreated)
      break

    case 'customer.subscription.updated':
      const productIdUpdated = event.data.object.items.data[0].price.product // Extract product_id
      console.log('🚀  productIdUpdated:', productIdUpdated)
      await SubscriptionUpdated(event.data.object)
      break

    case 'customer.subscription.deleted':
      const productIdDeleted = event.data.object.items.data[0].price.product // Extract product_id
      console.log('🚀  productIdDeleted:', productIdDeleted)
      await SubscriptionDeleted(event.data.object)
      break
  }
  // Return a 200 response to acknowledge receipt of the event
  res.send()
}

const SubscriptionCreated = async (obj: any, productId: string) => {
  const customer: any = await stripe.customers.retrieve(obj.customer)
  console.log('🚀  created:', customer)

  // const { data, error } = await supabase.auth.signInWithOtp({
  //   email: customer.email,
  //   options: {
  //     emailRedirectTo: process.env.REACT_APP_FE_SERVER_URL,
  //     data: {
  //       team_name: 'My Company',
  //       role: 'superadmin',
  //       stripe_product_id: productId,
  //     },
  //   },
  // })

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(
    customer.email,
    {
      data: {
        team_name: 'My Company',
        role: 'superadmin',
        stripe_product_id: productId,
      },
      redirectTo: process.env.REACT_APP_FE_SERVER_URL,
    }
  )

  console.log('🚀  data:', data)
  console.log('🚀  error:', error)
}

const SubscriptionUpdated = async (obj: any) => {
  const customer: any = await stripe.customers.retrieve(obj.customer)
  const quantity = obj.quantity
  console.log('🚀  updated customer:', customer)

  // const res = await supabase
  //   .from('profiles')
  //   .select(`profiles_companies_roles (company_id)`)
  //   .eq('email', customer.email)

  // const company_id = res.data[0].profiles_companies_roles[0].company_id

  // await supabase
  //   .from('companies')
  //   .update({
  //     // @ts-ignore
  //     consultants_limit: quantity,
  //   })
  //   .eq('id', company_id)
  //   .select()
}

const SubscriptionDeleted = async (obj: any) => {
  const customer: any = await stripe.customers.retrieve(obj.customer)
  console.log('🚀  deleted:')

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

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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export const handleStripeWebhooks = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.log('🚀  err:', err)
    res.status(400).send('Webhook Error' + err.message)
  }

  switch (event.type) {
    case 'customer.subscription.created':
      await SubsriptionCreated(event.data.object)
      break
    case 'customer.subscription.updated':
      await SubsriptionUpdated(event.data.object)
      break
    case 'customer.subscription.deleted':
      await SubsriptionDeleted(event.data.object)
      break
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send()
}

const SubsriptionCreated = async (obj: any) => {
  const customer: any = await stripe.customers.retrieve(obj.customer)
  const quantity = obj.quantity

  const res = await supabase
    .from('organization')
    .update({
      //   subscription_plan: 'obj.id',
      //   payment_plan: 'pro',
    })
    .eq('email', customer.email)
}

const SubsriptionUpdated = async (obj: any) => {
  const customer: any = await stripe.customers.retrieve(obj.customer)
  const quantity = obj.quantity
  console.log('🚀  updated:', quantity)

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

const SubsriptionDeleted = async (obj: any) => {
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

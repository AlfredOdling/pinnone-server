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
  } catch (err) {
    console.log('🚀  err:', err)
    return res.status(400).send('Webhook Error' + err.message)
  }

  if (event.type === 'checkout.session.completed') {
    await CheckoutSessionCompleted(event)
  }

  if (event.type === 'customer.subscription.deleted') {
    await CustomerSubscriptionDeleted(event.data.object)
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send()
}

const CheckoutSessionCompleted = async (event: any) => {
  try {
    const session = event.data.object

    // Retrieve full subscription details
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription
    )

    const current_org_id = await supabase
      .from('user')
      .select('current_org_id')
      .eq('email', session.customer_email)
      .single()

    await supabase
      .from('organization')
      .update({
        stripe_status: 'paid',
        stripe_email: session.customer_email,
        stripe_customer_id: session.customer,

        stripe_subscription_id: subscription.id,
        stripe_subscription_item_id_1: subscription.items.data[1].id, // Needed for metering
        stripe_subscription_item_id_2: subscription.items.data[2].id, // Needed for metering
      })
      .eq('id', current_org_id.data.current_org_id)
      .select()
  } catch (error) {
    console.error('Error in CheckoutSessionCompleted:', error)
    throw error
  }
}

const CustomerSubscriptionDeleted = async (obj: any) => {
  const customer: any = await stripe.customers.retrieve(obj.customer)
  console.log('🚀  customer:', customer)

  const res = await supabase
    .from('user')
    .select('current_org_id')
    .eq('email', customer.email)
    .single()

  console.log('🚀 current_org_id res:', res)

  const res2 = await supabase
    .from('organization')
    .update({
      stripe_status: 'cancelled',
    })
    .eq('id', res.data.current_org_id)
    .select()

  // await stripe.subscriptions.del(obj.id)
  console.log('🚀  res2:', res2)
}

//https://chatgpt.com/share/67ab48de-a214-8013-ab37-63bc33ade311

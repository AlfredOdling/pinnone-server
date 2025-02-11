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
  console.log('🚀  event:', event)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    // Retrieve full subscription details
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription
    )

    // Store customer & subscription in your database
    console.log('🚀  subscription:', {
      email: session.customer_email,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionItemId: subscription.items.data[1].id, // Needed for metering
    })
  }
}

const CheckoutSessionCompleted2 = async (event: any) => {
  console.log('🚀  ----:', event.data.object)
  const customer: any = await stripe.customers.retrieve(
    event.data.object.customer
  )
  console.log('🚀  customer:', customer)

  const subscriptionId = event.data.object.subscription
  console.log('🚀  subscriptionId:', subscriptionId)
  const subscriptionItems = await stripe.subscriptionItems.list({
    subscription: subscriptionId,
  })
  console.log('🚀  subscriptionItems:', subscriptionItems)

  const subscriptionItemId = subscriptionItems.data[1].id
  console.log('🚀  subscriptionItemId:', subscriptionItemId)

  const res = await supabase
    .from('user')
    .select('current_org_id')
    .eq('email', customer.email)
    .single()
  console.log('🚀 current_org_id res:', res)

  const res2 = await supabase
    .from('organization')
    .update({
      stripe_status: 'paid',
      stripe_subscription_id: subscriptionItemId,
      stripe_email: customer.email,
    })
    .eq('id', res.data.current_org_id)
    .select()

  console.log('🚀  res2:', res2)
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

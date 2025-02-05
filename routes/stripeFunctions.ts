import Stripe from 'stripe'
import * as dotenv from 'dotenv'
dotenv.config()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
// const supabase = createClient<Database>(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// )

export const createCheckoutSession = async (email: string) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      success_url: process.env.REACT_APP_FE_SERVER_URL,
      cancel_url: process.env.REACT_APP_FE_SERVER_URL,
      customer_email: email,
      allow_promotion_codes: true,

      line_items: [
        {
          price: 'price_1Qoi3iGe99DvGeXP2W1uGsoR',
          quantity: 1,
        },
        {
          price: 'price_1Qoi5kGe99DvGeXPdwhpclSQ',
        },
        {
          price: 'price_1Qoi6tGe99DvGeXPcdlgv3S4',
        },
      ],
    })

    return session.url
  } catch (error) {
    console.error(error)
    throw error
  }
}

export const reportUsage = async ({
  usageQuantity,
  stripe_subscription_id,
}: {
  usageQuantity: number
  stripe_subscription_id: string
}) => {
  await stripe.subscriptionItems.createUsageRecord(stripe_subscription_id, {
    quantity: usageQuantity,
    timestamp: 'now', // Use actual timestamp if needed
    action: 'increment', // Adds to current period
  })
}

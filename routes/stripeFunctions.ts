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
  await stripe.billing.meterEvents.create({
    event_name: 'email_scans',
    payload: {
      value: '1',
      stripe_customer_id: 'cus_NciAYcXfLnqBoz',
    },
  })
}

//   },

//   rawType: 'invalid_request_error',

//   code: undefined,

//   doc_url: undefined,

//   param: 'subscription_item',

//   detail: undefined,

//   headers: {

//     server: 'nginx',

//     date: 'Mon, 10 Feb 2025 22:51:19 GMT',

//     'content-type': 'application/json',

//     'content-length': '349',

//     connection: 'keep-alive',

//     'access-control-allow-credentials': 'true',

//     'access-control-allow-methods': 'GET, HEAD, PUT, PATCH, POST, DELETE',

//     'access-control-allow-origin': '*',

//     'access-control-expose-headers': 'Request-Id, Stripe-Manage-Version, Stripe-Should-Retry, X-Stripe-External-Auth-Required, X-Stripe-Privileged-Session-Required',

//     'access-control-max-age': '300',

//     'cache-control': 'no-cache, no-store',

//     'content-security-policy': "base-uri 'none'; default-src 'none'; form-action 'none'; frame-ancestors 'none'; img-src 'self'; script-src 'self' 'report-sample'; style-src 'self'; worker-src 'none'; upgrade-insecure-requests; report-uri https://q.stripe.com/csp-violation?q=tHIK5nGJLNN0K-Lzff1xNdicqc-qCiwp4MYX2_NPcxIY5z71MaA4xBfFsgQCmgTWPcyi0BCbiiwMKDHJ";,

//     'cross-origin-opener-policy-report-only': 'same-origin; report-to="coop"',

//     'idempotency-key': 'stripe-node-retry-eb322c66-d78a-4920-a07e-709d5608a36a',

//     'original-request': 'req_lhdmD3oVliDajS',

//     'report-to': '{"group":"coop","max_age":8640,"endpoints":[{"url":"https://q.stripe.com/coop-report";}],"include_subdomains":true}',

//     'reporting-endpoints': 'coop="https://q.stripe.com/coop-report"';,

//     'request-id': 'req_lhdmD3oVliDajS',

//     'stripe-should-retry': 'false',

//     'stripe-version': '2024-12-18.acacia',

//     vary: 'Origin',

//     'x-stripe-priority-routing-enabled': 'true',

//     'x-stripe-routing-context-priority-tier': 'livemode',

//     'x-wc': 'AB',

//     'strict-transport-security': 'max-age=63072000; includeSubDomains; preload'

//   },

//   requestId: 'req_lhdmD3oVliDajS',

//   statusCode: 400,

//   userMessage: undefined,

//   charge: undefined,

//   decline_code: undefined,

//   payment_intent: undefined,

//   payment_method: undefined,

//   payment_method_type: undefined,

//   setup_intent: undefined,

//   source: undefined

// }

// Error: Cannot create a usage record for `si_RkRZDOFoFK0lDA` because it is not on the legacy metered billing system. Call /v1/billing/meter_events instead.

//     at generateV1Error (file:///app/node_modules/stripe/esm/Error.js:8:20)

//     at res.toJSON.then.StripeAPIError.message (file:///app/node_modules/stripe/esm/RequestSender.js:105:31)

//     at processTicksAndRejections (node:internal/process/task_queues:95:5)

// error Command failed with exit code 1.

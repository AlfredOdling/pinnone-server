import { z } from 'zod'

export const Vendor = z.object({
  name: z.string(),
  description: z.string(),
  url: z.string(),
  logo_url: z.string(),
  category: z.enum([
    'IT',
    'Product',
    'Marketing',
    'HR',
    'Sales',
    'Data & Analytics',
    'Engineering',
    'Finance',
    'Customer Success',
    'Legal',
    'Other',
  ]),
  root_domain: z.string(),
  link_to_pricing_page: z.string(),
})

export const NewVendors = z.lazy(() =>
  z.object({
    children: z.array(Vendor),
  })
)

export const NewVendor = z.lazy(() =>
  z.object({
    children: Vendor,
  })
)

export const Urls = z.lazy(() =>
  z.object({
    children: z.array(z.string()),
  })
)

export const RootDomains = z.lazy(() =>
  z.object({
    children: z.array(
      z.object({
        domain: z.string(),
        is_b2b_tool_certainty_score: z.number(),
      })
    ),
  })
)

const OverlappingTool = z.object({
  overlap_category: z.string(), // Title of the category
  description: z.string(), // Description of the category's purpose
  overlappingTools: z.array(z.string()), // List of tools that overlap within this category
})

export const OverlappingToolsList = z.object({
  children: z.array(OverlappingTool),
})

export const VendorName = z.object({
  extracted_vendor_name: z.string(),
})

export const IsB2BSaaSTool = z.object({
  is_b2b_saas_tool: z.boolean(),
})

export const ToolCost = z.object({
  vendor: z.string(),
  renewal_frequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']),
  renewal_start_date: z.string(),
  renewal_next_date: z.string(),

  pricing_model: z.enum(['FLAT_FEE', 'USAGE_BASED', 'PER_SEAT']),
  currency: z.enum([
    'USD',
    'SEK',
    'EUR',
    'GBP',
    'NOK',
    'DKK',
    'CHF',
    'CAD',
    'AUD',
    'NZD',
    'JPY',
  ]),

  flat_fee_cost: z.number(),
  number_of_seats: z.number(),
  price_per_seat: z.number(),
  usage_based_cost: z.number(),
  other_cost: z.number(),
  invoice_or_receipt: z.enum(['INVOICE', 'RECEIPT']),
  due_date: z.string(),
  important_info: z.string(),
})

export const ToolCost2 = z.object({
  vendor: z.string(),
  date_of_invoice: z.string(),
  currency: z.enum(['USD', 'SEK', 'EUR']),
  total_cost: z.number(),
  invoice_or_receipt: z.enum(['INVOICE', 'RECEIPT']),
  is_something_else: z.boolean(),
})

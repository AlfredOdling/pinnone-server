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

export const RootDomains = z.lazy(() =>
  z.object({
    children: z.array(z.string()),
  })
)

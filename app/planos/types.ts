export interface EnrollmentPlan {
  id: string
  name: string
  price: number
  registration_fee: number | null
  frequency_per_week: number | null
  duration_months: number | null
  sibling_discount_percent: number | null
  includes_uniform: boolean | null
  is_active: boolean | null
}

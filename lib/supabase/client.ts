import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://abqznplxpkgknzwuurce.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicXpucGx4cGtna256d3V1cmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMTA3MTQsImV4cCI6MjEwMzg4NjcxNH0.4Li9lncSjP-gTP0Le3I16N-ZPa-K0LirKClStvnCU9U'
  )
}

import { createBrowserClient } from '@supabase/ssr'
import { publicSupabaseConfig,fetchWithTimeout } from './config'

export function createClient() {
  const { url, key } = publicSupabaseConfig()
  return createBrowserClient(url, key,{global:{fetch:fetchWithTimeout}})
}

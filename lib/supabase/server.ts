import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { publicSupabaseConfig,fetchWithTimeout } from './config'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, key } = publicSupabaseConfig()

  return createServerClient(
    url,
    key,
    {
      global:{fetch:fetchWithTimeout},
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignorado em Server Components de leitura pura
          }
        },
      },
    }
  )
}

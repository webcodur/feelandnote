import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_DB_API_URL!,
    process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY!
  )
}

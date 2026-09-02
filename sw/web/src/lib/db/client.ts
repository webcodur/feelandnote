import { createBrowserClient } from '@supabase/ssr'

import { Database } from "@/types/database.generated";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_DB_API_URL!,
    process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY!
  )
}

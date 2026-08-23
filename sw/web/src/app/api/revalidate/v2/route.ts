import { revalidateTag } from 'next/cache'
import { type NextRequest } from 'next/server'

import { purgeCloudflareByTags } from '@/lib/cloudflarePurge'
import { createRevalidationHandler } from '../handler'

const handleBulkRevalidation = createRevalidationHandler({
  expireTag: (tag) => revalidateTag(tag, { expire: 0 }),
  purgeByTags: purgeCloudflareByTags,
}, 'bulk')

/**
 * Versioned bulk-only cache invalidation endpoint.
 *
 * Old web deployments do not have this route, while new legacy routes reject bulk before mutation.
 * That makes either web/web-bo rollout order fail closed instead of falling back to a zone purge.
 */
export async function POST(request: NextRequest) {
  return handleBulkRevalidation(request)
}

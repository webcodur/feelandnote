'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-auth'
import { assertRemotionLocal } from '@/lib/remotion-local'
import {
  auditBookRecommendResources,
  syncBookRecommendResources,
  type BookResourceAudit,
  type SyncBookResourcesInput,
  type SyncBookResourcesResult,
} from '@/lib/book-recommend-resources'

export async function getBookRecommendResourceAudit(): Promise<BookResourceAudit> {
  await requireAdmin()
  assertRemotionLocal()
  return auditBookRecommendResources()
}

export async function syncBookRecommendResourceAction(
  input: SyncBookResourcesInput = {},
): Promise<SyncBookResourcesResult> {
  await requireAdmin()
  assertRemotionLocal()
  const result = await syncBookRecommendResources(input)
  revalidatePath('/book-recommend')
  return result
}


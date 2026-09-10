'use server'

import { createClient } from '@/lib/db/server'
import { refreshBookMetadata } from '@feelandnote/shared/lib/book-metadata'

interface UpdateContentMetadataParams {
  id: string
  metadata: Record<string, unknown>
  subtype?: string
}

// 여러 콘텐츠 메타데이터 일괄 업데이트
export async function batchUpdateContentMetadata(
  items: UpdateContentMetadataParams[]
) {
  const db = await createClient()
  if (!items.length) return { success: true, updated: 0 }

  const { data: contents, error } = await db.from('contents')
    .select('id,type,metadata').in('id', items.map((item) => item.id))
  if (error) throw error
  const types = new Map(contents.map((content) => [content.id, content.type]))
  const previous = new Map(contents.map((content) => [content.id, content.metadata as Record<string, unknown> | null]))

  // 병렬로 업데이트
  const results = await Promise.allSettled(
    items.filter((item) => types.has(item.id)).map((item) =>
      db
        .from('contents')
        .update({
          metadata: types.get(item.id) === 'BOOK' ? refreshBookMetadata(previous.get(item.id) ?? null, item.metadata) : item.metadata,
          subtype: item.subtype || null,
        })
        .eq('id', item.id)
    )
  )

  const successCount = results.filter(
    (r) => r.status === 'fulfilled' && !r.value.error
  ).length

  return { success: true, updated: successCount }
}

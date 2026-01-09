'use server'

import { createClient } from '@/lib/supabase/server'

interface UpdateContentMetadataParams {
  id: string
  metadata: Record<string, unknown>
  subtype?: string
}

// 단일 콘텐츠 메타데이터 업데이트
export async function updateContentMetadata(params: UpdateContentMetadataParams) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('contents')
    .update({
      metadata: params.metadata,
      subtype: params.subtype || null,
    })
    .eq('id', params.id)

  if (error) {
    console.error('메타데이터 업데이트 에러:', error)
    return { success: false }
  }

  return { success: true }
}

// 여러 콘텐츠 메타데이터 일괄 업데이트
export async function batchUpdateContentMetadata(
  items: UpdateContentMetadataParams[]
) {
  const supabase = await createClient()

  // 병렬로 업데이트
  const results = await Promise.allSettled(
    items.map((item) =>
      supabase
        .from('contents')
        .update({
          metadata: item.metadata,
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

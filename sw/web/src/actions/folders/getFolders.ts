'use server'

import { createClient } from '@/lib/supabase/server'
import type { ContentType, FolderWithCount } from '@/types/database'

interface GetFoldersParams {
  contentType?: ContentType
}

export async function getFolders(params: GetFoldersParams = {}): Promise<FolderWithCount[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  let query = supabase
    .from('folders')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (params.contentType) {
    query = query.eq('content_type', params.contentType)
  }

  const { data: folders, error } = await query

  if (error) {
    console.error('폴더 조회 에러:', error)
    return []
  }

  // 각 폴더의 콘텐츠 수 조회
  const folderIds = folders.map(f => f.id)

  if (folderIds.length === 0) {
    return []
  }

  const { data: counts } = await supabase
    .from('user_contents')
    .select('folder_id')
    .eq('user_id', user.id)
    .in('folder_id', folderIds)

  const countMap: Record<string, number> = {}
  ;(counts || []).forEach(item => {
    if (item.folder_id) {
      countMap[item.folder_id] = (countMap[item.folder_id] || 0) + 1
    }
  })

  return folders.map(folder => ({
    ...folder,
    content_count: countMap[folder.id] || 0,
  }))
}

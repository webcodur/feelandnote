'use server'

import { createClient } from '@/lib/supabase/server'

export interface TagCount {
  id: string
  name: string
  color: string
  description: string | null
  count: number
}

interface TagCountRow {
  tag_id: string
  tag_name: string
  tag_color: string
  tag_description: string | null
  celeb_count: number
}

export async function getTagCounts(): Promise<TagCount[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_tag_celeb_counts')

  if (error) {
    console.error('태그 카운트 조회 에러:', error)
    return []
  }

  return (data ?? []).map((row: TagCountRow) => ({
    id: row.tag_id,
    name: row.tag_name,
    color: row.tag_color,
    description: row.tag_description,
    count: Number(row.celeb_count),
  }))
}

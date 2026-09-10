import type { Json } from '@/types/database.generated'

export type Snapshot = Json

export interface NoteSection {
  id: string
  note_id: string
  title: string
  memo: string | null
  is_completed: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  user_id: string
  content_id: string
  memo: string | null
  snapshot: Snapshot | null
  created_at: string
  updated_at: string
  sections?: NoteSection[]
}

export interface NoteWithContent extends Note {
  content: {
    id: string
    title: string
    type: string
    thumbnail_url: string | null
    creator: string | null
  }
}

export type VisibilityType = 'public' | 'followers' | 'private'

export interface Snapshot {
  context?: string
  progress?: number
}

export interface Template {
  context?: string
  summary?: string
  questions?: string
  moment?: string
  quote?: string
  change?: string
}

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
  visibility: VisibilityType
  snapshot: Snapshot
  template: Template
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

'use server'

import { createClient } from '@/lib/supabase/server'
import type { AcademyLessonProgress } from '@/types/academy'

interface AcademyLessonProgressRow {
  id: string
  user_id: string
  category_id: string
  sub_category_id: string
  lesson_id: string
  is_completed: boolean
  completed_at: string | null
  last_studied_at: string
  created_at: string
  updated_at: string
}

interface AcademyLessonProgressParams {
  categoryId: string
  subCategoryId: string
  lessonId: string
}

interface AcademyLessonProgressResult {
  success: boolean
  data: AcademyLessonProgress | null
  message?: string
}

interface AcademyLessonProgressState {
  isSignedIn: boolean
  progress: AcademyLessonProgress[]
}

function mapAcademyLessonProgress(row: AcademyLessonProgressRow): AcademyLessonProgress {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    subCategoryId: row.sub_category_id,
    lessonId: row.lesson_id,
    isCompleted: row.is_completed,
    completedAt: row.completed_at,
    lastStudiedAt: row.last_studied_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function getSignedInUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, user }
}

async function upsertAcademyLessonProgress(
  params: AcademyLessonProgressParams,
  updates: Partial<AcademyLessonProgressRow>,
): Promise<AcademyLessonProgressResult> {
  const { supabase, user } = await getSignedInUser()

  if (!user) {
    return {
      success: false,
      data: null,
      message: 'UNAUTHORIZED',
    }
  }

  const timestamp = new Date().toISOString()
  const payload = {
    user_id: user.id,
    category_id: params.categoryId,
    sub_category_id: params.subCategoryId,
    lesson_id: params.lessonId,
    updated_at: timestamp,
    ...updates,
  }

  const { data, error } = await supabase
    .from('academy_lesson_progress')
    .upsert(payload, { onConflict: 'user_id,lesson_id' })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[academy progress upsert]', error)
    return {
      success: false,
      data: null,
      message: 'SAVE_FAILED',
    }
  }

  return {
    success: true,
    data: mapAcademyLessonProgress(data as AcademyLessonProgressRow),
  }
}

export async function getAcademyLessonProgressState(): Promise<AcademyLessonProgressState> {
  const { supabase, user } = await getSignedInUser()

  if (!user) {
    return {
      isSignedIn: false,
      progress: [],
    }
  }

  const { data, error } = await supabase
    .from('academy_lesson_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('last_studied_at', { ascending: false })

  if (error) {
    console.error('[academy progress select]', error)
    return {
      isSignedIn: true,
      progress: [],
    }
  }

  return {
    isSignedIn: true,
    progress: (data ?? []).map((row) => mapAcademyLessonProgress(row as AcademyLessonProgressRow)),
  }
}

export async function touchAcademyLessonProgress(
  params: AcademyLessonProgressParams,
): Promise<AcademyLessonProgressResult> {
  const timestamp = new Date().toISOString()

  return upsertAcademyLessonProgress(params, {
    last_studied_at: timestamp,
    updated_at: timestamp,
  })
}

export async function setAcademyLessonCompletion(
  params: AcademyLessonProgressParams & { isCompleted: boolean },
): Promise<AcademyLessonProgressResult> {
  const timestamp = new Date().toISOString()

  return upsertAcademyLessonProgress(params, {
    is_completed: params.isCompleted,
    completed_at: params.isCompleted ? timestamp : null,
    last_studied_at: timestamp,
    updated_at: timestamp,
  })
}

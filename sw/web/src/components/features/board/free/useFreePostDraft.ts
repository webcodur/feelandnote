'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import type { FreePost } from '@/types/database'
import { createFreePost, updateFreePost } from '@/actions/board/free'

// 익명 필명은 고정하지 않는다(고정하면 익명이 아니라 부계정이 된다).
// 대신 직전에 쓴 필명을 이 기기에 기억해 기본값으로 채워준다 — 매번 치는 번거로움만 덜어낸다.
const NICKNAME_STORAGE_KEY = 'feelandnote.freeBoard.nickname'

export function loadRememberedNickname(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(NICKNAME_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function rememberNickname(nickname: string) {
  if (typeof window === 'undefined') return
  try {
    const trimmed = nickname.trim()
    if (trimmed) window.localStorage.setItem(NICKNAME_STORAGE_KEY, trimmed)
    else window.localStorage.removeItem(NICKNAME_STORAGE_KEY)
  } catch {
    // 저장 불가(사생활 보호 모드 등) — 기억 기능만 포기하고 작성은 계속 진행한다
  }
}

interface UseFreePostDraftParams {
  mode: 'create' | 'edit'
  isLoggedIn: boolean
  initialData?: FreePost
  needsPassword?: boolean
  onSuccess: (post: FreePost) => void
}

export function useFreePostDraft({ mode, isLoggedIn, initialData, needsPassword = false, onSuccess }: UseFreePostDraftParams) {
  const t = useTranslations('board')
  const [nickname, setNickname] = useState(initialData?.nickname ?? '')
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [content, setContent] = useState(initialData?.content ?? '')
  const [password, setPassword] = useState('')
  const [anonymous, setAnonymous] = useState(initialData?.is_anonymous ?? false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 기억해둔 필명을 기본값으로 채운다 — 새 글일 때만(수정은 그 글의 필명을 유지).
  // localStorage는 서버에 없으므로 초기값이 아니라 마운트 후에 읽어야 한다(하이드레이션 불일치 방지).
  useEffect(() => {
    if (mode !== 'create') return
    const remembered = loadRememberedNickname()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 저장소(localStorage) 동기화. 초기값으로 옮기면 SSR과 값이 갈린다
    if (remembered) setNickname(remembered)
  }, [mode])

  // 비밀번호 입력이 필요한 경우: 작성(비로그인) 또는 수정(익명 글)
  const passwordRequired = mode === 'create' ? !isLoggedIn : needsPassword
  // 필명 입력칸 노출: 비로그인은 항상, 로그인은 익명 선택 시(계정 글은 프로필 닉네임을 쓴다)
  const nicknameVisible = mode === 'create' && (!isLoggedIn || anonymous)

  const reset = () => {
    setTitle('')
    setContent('')
    setPassword('')
    setAnonymous(false)
    setError(null)
  }

  const submit = async () => {
    setError(null)

    if (passwordRequired && !/^[0-9]{4}$/.test(password)) {
      setError(t('free.passwordHint'))
      return
    }

    setIsSubmitting(true)
    const trimmedNickname = nickname.trim() || undefined
    const result =
      mode === 'create'
        ? await createFreePost(
            isLoggedIn
              ? { title, content, anonymous, nickname: anonymous ? trimmedNickname : undefined }
              : { title, content, nickname: trimmedNickname, password },
          )
        : await updateFreePost(
            needsPassword
              ? { id: initialData!.id, title, content, password }
              : { id: initialData!.id, title, content },
          )

    if (result.success) {
      if (nicknameVisible) rememberNickname(nickname)
      onSuccess(result.data)
      return
    }

    setError(result.message)
    setIsSubmitting(false)
  }

  return {
    nickname, setNickname,
    title, setTitle,
    content, setContent,
    password, setPassword,
    anonymous, setAnonymous,
    isSubmitting, error,
    passwordRequired, nicknameVisible,
    submit, reset,
  }
}

export type FreePostDraft = ReturnType<typeof useFreePostDraft>

'use client'

import { useState, useEffect, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { FreePost } from '@/types/database'
import { createFreePost, updateFreePost } from '@/actions/board/free'
import { resolveLocale } from '@/types/locale'

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
  const tError = useTranslations('actionErrors')
  const locale = resolveLocale(useLocale())
  const [nickname, setNickname] = useState(initialData?.nickname ?? '')
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [content, setContent] = useState(initialData?.content ?? '')
  const [password, setPassword] = useState('')
  const [anonymous, setAnonymous] = useState(initialData?.is_anonymous ?? false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlightRef = useRef(false)

  // 기억해둔 필명을 기본값으로 채운다 — 새 글일 때만(수정은 그 글의 필명을 유지).
  // localStorage는 서버에 없으므로 초기값이 아니라 마운트 후에 읽어야 한다(하이드레이션 불일치 방지).
  useEffect(() => {
    if (mode !== 'create') return
    const remembered = loadRememberedNickname()
    if (remembered) setNickname(remembered)
  }, [mode])

  // 비밀번호 입력이 필요한 경우: 작성(비로그인) 또는 수정(익명 글)
  const passwordRequired = mode === 'create' ? !isLoggedIn : needsPassword
  // 필명 입력칸 노출: 비로그인은 항상, 로그인은 익명 선택 시(계정 글은 프로필 닉네임을 쓴다)
  const nicknameVisible = mode === 'create' && (!isLoggedIn || anonymous)

  // 작성기를 다시 쓸 수 있는 상태로 되돌린다.
  // 제출 중 표시도 함께 내려야 한다 — 자리를 뜨지 않는 화면(홈)은 이 훅이 그대로 살아 있어서
  // 여기서 안 내리면 다음에 열었을 때 버튼이 "저장 중"에 잠긴 채로 남는다
  const reset = () => {
    setTitle('')
    setContent('')
    setPassword('')
    setAnonymous(false)
    setError(null)
    inFlightRef.current = false
    setIsSubmitting(false)
  }

  const submit = async () => {
    // 연타로 두 번 등록되는 것을 막는다. 화면 표시용 상태는 그리기가 한 박자 늦어 가드로 못 쓴다
    if (inFlightRef.current) return
    setError(null)

    if (passwordRequired && !/^[0-9]{4}$/.test(password)) {
      setError(t('free.passwordHint'))
      return
    }

    inFlightRef.current = true
    setIsSubmitting(true)
    const trimmedNickname = nickname.trim() || undefined

    try {
      const result =
        mode === 'create'
          ? await createFreePost(
              isLoggedIn
                ? { locale, title, content, anonymous, nickname: anonymous ? trimmedNickname : undefined }
                : { locale, title, content, nickname: trimmedNickname, password },
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

      setError(tError(result.error))
    } catch {
      // 서버까지 못 갔거나 응답이 깨진 경우. 여기서 잡지 않으면 버튼이 "저장 중"에 영영 잠긴다
      setError(tError('UNKNOWN_ERROR'))
    } finally {
      // 성공·실패·중단 어느 쪽이든 반드시 푼다.
      // 성공 뒤 다른 화면으로 넘어가는 경우에도 되돌아왔을 때 잠겨 있지 않도록 한다
      inFlightRef.current = false
      setIsSubmitting(false)
    }
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

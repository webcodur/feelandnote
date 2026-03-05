'use client'

import { useEffect, useCallback } from 'react'
import type { DialogEntry, GameSettings } from '@/lib/game/suikoden/types'

interface Props {
  queue: DialogEntry[]
  settings: GameSettings
  onDismiss: () => void
}

export default function DialogSnackbar({ queue, settings, onDismiss }: Props) {
  const current = queue[0]

  // auto 모드: 3초 후 자동 소멸
  useEffect(() => {
    if (!current || settings.dialogMode !== 'auto') return
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [current?.id, settings.dialogMode, onDismiss])

  // manual 모드: Space/Enter로 닫기
  useEffect(() => {
    if (!current || settings.dialogMode !== 'manual') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        onDismiss()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [current?.id, settings.dialogMode, onDismiss])

  if (!current) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-md animate-slide-up">
      <div className="bg-stone-900/95 border border-amber-500/30 rounded-lg shadow-lg backdrop-blur-sm p-3">
        <div className="flex items-start gap-3">
          {/* 아바타 */}
          <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-700 shrink-0 border border-stone-600">
            {current.avatarUrl ? (
              <img
                src={current.avatarUrl}
                alt={current.characterName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm">
                {current.characterName[0]}
              </div>
            )}
          </div>

          {/* 내용 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-300 truncate">
                {current.characterName}
              </span>
              <button
                onClick={onDismiss}
                className="text-stone-500 hover:text-stone-300 text-xs ml-2 shrink-0"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-stone-200 leading-relaxed">
              {current.message}
            </p>
          </div>
        </div>

        {/* 큐 인디케이터 + 모드 힌트 */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            {queue.length > 1 && (
              <span className="text-[9px] text-stone-500">
                +{queue.length - 1}개 대기
              </span>
            )}
          </div>
          {settings.dialogMode === 'manual' && (
            <span className="text-[9px] text-stone-600">
              Space / Enter / ✕
            </span>
          )}
          {settings.dialogMode === 'auto' && (
            <div className="h-0.5 w-16 bg-stone-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500/50 rounded-full"
                style={{ animation: 'dialogTimer 3s linear forwards' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

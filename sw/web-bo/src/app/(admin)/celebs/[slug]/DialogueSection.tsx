'use client'

import { useLangMode } from '@/contexts/LangModeContext'
import type { DialogueLines } from '@/actions/admin/dialogues'

const DIALOGUE_TYPE_LABELS: Record<string, string> = {
  greeting: '인사',
  roll_call: '호명',
  deploy: '출전 시',
  battle_win: '승리',
  battle_draw: '무승부',
  battle_lose: '패배',
  clash_attack: '공격',
}

const TONE_LABELS: Record<string, string> = {
  loyal: '충의',
  composed: '침착',
  bold: '당돌',
  humble: '겸양',
  gentle: '온화',
  free: '호방',
}

const TYPES = [
  'greeting', 'roll_call', 'deploy',
  'battle_win', 'battle_draw', 'battle_lose', 'clash_attack',
] as const

interface Props {
  lines: DialogueLines | null
  linesEn: DialogueLines | null
  speechTone?: string | null
}

function DialogueGrid({ data, label }: { data: DialogueLines; label?: string }) {
  return (
    <div className="space-y-4">
      {label && <p className="text-xs font-medium text-text-secondary">{label}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TYPES.map((type) => (
          <div key={type} className="space-y-1.5">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              {DIALOGUE_TYPE_LABELS[type] ?? type}
            </p>
            {data[type]?.map((line, i) => (
              <p key={i} className="text-sm text-text-primary bg-bg-secondary rounded-lg px-3 py-1.5 break-all">
                {line || <span className="text-text-secondary italic">비어있음</span>}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function countLines(data: DialogueLines | null) {
  if (!data) return 0
  return Object.values(data).flat().filter((l) => l?.trim()).length
}

export default function DialogueSection({ lines, linesEn, speechTone }: Props) {
  const langMode = useLangMode()
  const toneLabel = speechTone ? TONE_LABELS[speechTone] || speechTone : null
  const hasKo = lines !== null
  const hasEn = linesEn !== null

  const visibleCount = langMode === 'en'
    ? countLines(linesEn)
    : langMode === 'ko'
      ? countLines(lines)
      : countLines(lines) + countLines(linesEn)

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2 flex-wrap">
        {toneLabel && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            말투: {toneLabel}
          </span>
        )}
        {visibleCount > 0 && (
          <span className="text-xs text-text-secondary ml-auto">
            {visibleCount}/{langMode === 'both' ? 42 : 21}
          </span>
        )}
      </div>

      {/* 대사 목록 */}
      {langMode === 'both' ? (
        <div className="grid grid-cols-2 gap-6">
          <div>
            {hasKo ? (
              <DialogueGrid data={lines!} label="국문" />
            ) : (
              <p className="text-sm text-text-secondary">등록된 한국어 대사가 없습니다.</p>
            )}
          </div>
          <div>
            {hasEn ? (
              <DialogueGrid data={linesEn!} label="EN" />
            ) : (
              <p className="text-sm text-text-secondary">등록된 영어 대사가 없습니다.</p>
            )}
          </div>
        </div>
      ) : langMode === 'ko' ? (
        hasKo ? (
          <DialogueGrid data={lines!} />
        ) : (
          <p className="text-sm text-text-secondary">등록된 한국어 대사가 없습니다. 공통 대사를 사용합니다.</p>
        )
      ) : (
        hasEn ? (
          <DialogueGrid data={linesEn!} />
        ) : (
          <p className="text-sm text-text-secondary">등록된 영어 대사가 없습니다.</p>
        )
      )}
    </div>
  )
}

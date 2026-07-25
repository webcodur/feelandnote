'use client'

import {
  type VoiceMeta,
  type VoiceMetaContext,
  BTN_SM,
} from './types'
import { EleEmotionPicker } from '@/components/voice'

// ── VoiceMetaEditor ──
// 라인별 voice 메타 편집(controlled). 저장 책임은 부모.

type VoiceMetaEditorProps = {
  value: VoiceMeta | undefined
  onChange: (next: VoiceMeta) => void
  defaults: VoiceMetaContext
  compact?: boolean
}

// 빈 객체 정리 — tags 빈배열·trail 미설정 등 의미 없는 필드를 제거한 새 객체 반환
function pruneMeta(m: VoiceMeta): VoiceMeta {
  const out: VoiceMeta = {}
  if (m.tags && m.tags.length > 0) out.tags = m.tags
  if (typeof m.trail === 'boolean') out.trail = m.trail
  if (m.emphasis && m.emphasis.length > 0) out.emphasis = m.emphasis
  return out
}

export function VoiceMetaEditor({ value, onChange, defaults, compact }: VoiceMetaEditorProps) {
  const meta: VoiceMeta = value ?? {}
  const tags = meta.tags ?? []
  const trail = meta.trail
  const tagsEmpty = tags.length === 0
  const trailUnset = typeof trail !== 'boolean'

  const update = (patch: Partial<VoiceMeta>) => {
    onChange(pruneMeta({ ...meta, ...patch }))
  }

  const clearTags = () => update({ tags: [] })

  const setTrail = (v: boolean | undefined) => {
    update({ trail: v })
  }

  const labelCls = compact ? 'text-[10px]' : 'text-[11px]'
  const hintCls = compact ? 'text-[9px]' : 'text-[10px]'

  return (
    <div className="space-y-1.5 bg-bg-card rounded p-2 border border-purple-500/20">
      {/* tags row */}
      <div className="flex items-center gap-2">
        <span className={`${labelCls} text-text-secondary`}>감정 태그</span>
        {tagsEmpty ? (
          <span className={`${hintCls} font-mono text-text-dim`}>
            기본 적용: [{defaults.defaultTags.join(', ') || '없음'}]
          </span>
        ) : (
          <span className={`${hintCls} font-mono text-purple-300`}>[{tags.join(', ')}]</span>
        )}
        {!tagsEmpty && (
          <button
            onClick={e => { e.stopPropagation(); clearTags() }}
            className={`${BTN_SM} bg-bg-main border border-border text-text-dim hover:text-text-secondary ml-auto`}
          >
            초기화
          </button>
        )}
      </div>
      <EleEmotionPicker value={tags} onChange={next => update({ tags: next })} tone="dark" compact={compact} />

      {/* trail row */}
      <div className="flex items-center gap-2 pt-1">
        <span className={`${labelCls} text-text-secondary`}>끝 패딩</span>
        <div className="flex items-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); setTrail(true) }}
            className={`${BTN_SM} border ${
              trail === true
                ? 'bg-purple-500/30 text-purple-200 border-purple-500/60 font-semibold'
                : 'bg-bg-main border-border text-text-secondary hover:border-purple-500/40'
            }`}
          >
            ON
          </button>
          <button
            onClick={e => { e.stopPropagation(); setTrail(false) }}
            className={`${BTN_SM} border ${
              trail === false
                ? 'bg-purple-500/30 text-purple-200 border-purple-500/60 font-semibold'
                : 'bg-bg-main border-border text-text-secondary hover:border-purple-500/40'
            }`}
          >
            OFF
          </button>
          <button
            onClick={e => { e.stopPropagation(); setTrail(undefined) }}
            className={`${BTN_SM} border ${
              trailUnset
                ? 'bg-bg-card text-text-secondary border-border font-semibold'
                : 'bg-bg-main border-border text-text-dim hover:text-text-secondary'
            }`}
          >
            기본
          </button>
        </div>
        <span className={`${hintCls} font-mono text-text-dim`}>
          {trailUnset
            ? `기본 적용: ${defaults.defaultTrail ? 'ON' : 'OFF'}`
            : trail ? '... ... ...' : '미부착'}
        </span>
      </div>
    </div>
  )
}

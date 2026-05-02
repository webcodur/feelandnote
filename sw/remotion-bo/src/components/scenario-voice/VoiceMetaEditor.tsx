'use client'

import { useState } from 'react'
import {
  type VoiceMeta,
  type VoiceMetaContext,
  ELE_EMOTIONS,
  BTN_SM,
} from './types'

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
  const [customDraft, setCustomDraft] = useState('')

  const update = (patch: Partial<VoiceMeta>) => {
    onChange(pruneMeta({ ...meta, ...patch }))
  }

  const toggleTag = (em: string) => {
    const idx = tags.indexOf(em)
    let next: string[]
    if (idx >= 0) {
      next = tags.filter(x => x !== em)
    } else if (tags.length >= 2) {
      next = [tags[1], em]
    } else {
      next = [...tags, em]
    }
    update({ tags: next })
  }

  const addCustomTag = () => {
    const v = customDraft.trim()
    if (!v) return
    if (tags.includes(v)) { setCustomDraft(''); return }
    const next = tags.length >= 2 ? [tags[1], v] : [...tags, v]
    update({ tags: next })
    setCustomDraft('')
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
      <div className="flex flex-wrap gap-1">
        {ELE_EMOTIONS.map(em => {
          const idx = tags.indexOf(em)
          const sel = idx >= 0
          return (
            <button
              key={em}
              onClick={e => { e.stopPropagation(); toggleTag(em) }}
              className={`px-2 py-0.5 rounded ${compact ? 'text-[9px]' : 'text-[10px]'} border ${
                sel
                  ? 'bg-purple-500/30 text-purple-200 border-purple-500/60 font-semibold'
                  : 'bg-bg-main border-border text-text-secondary hover:border-purple-500/40'
              }`}
            >
              {sel ? `${idx + 1}. ` : ''}{em}
            </button>
          )
        })}
        {/* 프리셋 외 태그를 직접 입력해 추가 (커스텀 영문 태그 등) */}
        <div className="flex items-center gap-1 ml-1">
          <input
            type="text"
            value={customDraft}
            onChange={e => setCustomDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addCustomTag() } }}
            placeholder="직접 입력"
            className={`bg-bg-main border border-border rounded px-1.5 py-0.5 ${compact ? 'text-[9px] w-[80px]' : 'text-[10px] w-[100px]'} text-text-primary`}
          />
          <button
            type="button"
            onClick={e => { e.stopPropagation(); addCustomTag() }}
            disabled={!customDraft.trim()}
            className={`${compact ? 'text-[9px]' : 'text-[10px]'} px-1.5 py-0.5 rounded border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 disabled:opacity-40 disabled:cursor-not-allowed`}
          >+</button>
        </div>
      </div>
      {/* 커스텀 입력으로 추가된 태그(프리셋 외) 표시 + 개별 제거 */}
      {tags.some(t => !ELE_EMOTIONS.includes(t)) && (
        <div className="flex flex-wrap gap-1">
          {tags.filter(t => !ELE_EMOTIONS.includes(t)).map(t => (
            <button
              key={t}
              onClick={e => { e.stopPropagation(); update({ tags: tags.filter(x => x !== t) }) }}
              title="삭제"
              className={`${compact ? 'text-[9px]' : 'text-[10px]'} px-2 py-0.5 rounded border bg-purple-500/30 text-purple-200 border-purple-500/60 font-semibold flex items-center gap-1`}
            >
              <span>{t}</span>
              <span className="opacity-70">×</span>
            </button>
          ))}
        </div>
      )}

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

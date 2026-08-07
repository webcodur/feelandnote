'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react'
import { saveCelebPersona, type StatKey, type TendencyKey } from '@/actions/admin/persona'
import type { MemberPersona, PersonaJsonb } from '@/actions/admin/members'
import type { VoiceGenCeleb } from '@/actions/admin/voice-gen'
import { useToast } from '@/contexts/ToastContext'
import CelebDialogueStudio from '@/components/celeb/dialogue-studio/CelebDialogueStudio'
import { DIALOGUE_TYPES } from '@/lib/voice-path'
import DeepProfileSection from './DeepProfileSection'

// #region Constants
const STAT_LABELS: Record<string, string> = {
  temperance: '절제', diligence: '근면', reflection: '성찰', courage: '용기',
  loyalty: '충의', benevolence: '인애', fairness: '공정', humility: '겸양',
  command: '통솔', martial: '무력', intellect: '지력', charm: '매력',
}
const TENDENCY_LABELS: Record<string, [string, string]> = {
  pessimism_optimism: ['비관', '낙관'],
  conservative_progressive: ['보수', '진취'],
  individual_social: ['개인', '사회'],
  cautious_bold: ['신중', '과감'],
}

const STAT_GROUPS: { label: string; jsonbGroup: string; keys: string[] }[] = [
  { label: '능력', jsonbGroup: 'abilities', keys: ['command', 'martial', 'intellect', 'charm'] },
  { label: '내적 덕목', jsonbGroup: 'inner_virtues', keys: ['temperance', 'diligence', 'reflection', 'courage'] },
  { label: '외적 덕목', jsonbGroup: 'outer_virtues', keys: ['loyalty', 'benevolence', 'fairness', 'humility'] },
]

const TENDENCY_KEYS: TendencyKey[] = [
  'pessimism_optimism', 'conservative_progressive',
  'individual_social', 'cautious_bold',
]

const JSONB_GROUP_MAP: Record<string, string> = {
  command: 'abilities', martial: 'abilities', intellect: 'abilities', charm: 'abilities',
  temperance: 'inner_virtues', diligence: 'inner_virtues', reflection: 'inner_virtues', courage: 'inner_virtues',
  loyalty: 'outer_virtues', benevolence: 'outer_virtues', fairness: 'outer_virtues', humility: 'outer_virtues',
  pessimism_optimism: 'dispositions', conservative_progressive: 'dispositions',
  individual_social: 'dispositions', cautious_bold: 'dispositions',
}

const ALL_KEYS = [...Object.keys(STAT_LABELS), ...TENDENCY_KEYS]
// #endregion

// #region CardAccordion
function CardAccordion({ title, defaultOpen = false, summary, children }: {
  title: string
  defaultOpen?: boolean
  summary?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between hover:bg-white/5">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <div className="flex items-center gap-3">
          {!open && summary}
          {open ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
        </div>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}
// #endregion

// #region Helpers
/**
 * 한국어 대사 중 채워진 칸 수 (접힌 상태 요약용).
 * 명언·독백은 21칸에 들어가지 않으므로 대사 7종만 센다.
 */
function countDialogueLines(lines: Record<string, string[]> | null): number {
  if (!lines) return 0
  return DIALOGUE_TYPES
    .flatMap((type) => lines[type] ?? [])
    .filter((l) => typeof l === 'string' && l.trim()).length
}

function initPersonaStats(raw: MemberPersona | null): Record<string, number> {
  const stats: Record<string, number> = {}
  for (const k of ALL_KEYS) stats[k] = (raw as Record<string, number> | null)?.[k] ?? 0
  return stats
}

function initReasons(jsonb: PersonaJsonb | null | undefined): Record<string, string> {
  const reasons: Record<string, string> = {}
  if (!jsonb) return reasons
  for (const key of ALL_KEYS) {
    const group = JSONB_GROUP_MAP[key]
    if (!group) continue
    const field = (jsonb[group as keyof PersonaJsonb] as Record<string, { reason_ko?: string }> | undefined)?.[key]
    reasons[key] = field?.reason_ko || ''
  }
  return reasons
}

function buildPersonaJsonb(
  stats: Record<string, number>,
  reasons: Record<string, string>,
  rationale: string,
): Record<string, unknown> {
  const jsonb: Record<string, Record<string, { score: number; reason_ko: string }>> = {}

  for (const key of ALL_KEYS) {
    const group = JSONB_GROUP_MAP[key]
    if (!group) continue
    if (!jsonb[group]) jsonb[group] = {}
    jsonb[group][key] = {
      score: stats[key] ?? 0,
      reason_ko: reasons[key] || '',
    }
  }

  return { ...jsonb, rationale_ko: rationale }
}
// #endregion

// #region Types
interface ExtraSectionsProps {
  celebId: string
  celebSlug: string
  personaRaw: MemberPersona | null
  /** 대사·음성 편집기에 넘길 인물 데이터. 없으면 그 구획을 열지 않는다 */
  voiceCeleb: VoiceGenCeleb | null
}
// #endregion

export default function ExtraSections({ celebId, celebSlug, personaRaw, voiceCeleb }: ExtraSectionsProps) {
  const { showToast } = useToast()

  // --- Persona state ---
  const [personaStats, setPersonaStats] = useState<Record<string, number>>(() => initPersonaStats(personaRaw))
  const [reasons, setReasons] = useState<Record<string, string>>(() => initReasons(personaRaw?.persona))
  const [rationale, setRationale] = useState(() => personaRaw?.persona?.rationale_ko || '')
  const [savingPersona, setSavingPersona] = useState(false)

  const initialPersona = useRef({ stats: initPersonaStats(personaRaw), reasons: initReasons(personaRaw?.persona), rationale: personaRaw?.persona?.rationale_ko || '' })

  const isPersonaDirty = useCallback(() => {
    return JSON.stringify(personaStats) !== JSON.stringify(initialPersona.current.stats)
      || JSON.stringify(reasons) !== JSON.stringify(initialPersona.current.reasons)
      || rationale !== initialPersona.current.rationale
  }, [personaStats, reasons, rationale])

  // 저장 안 한 페르소나 값이 있으면 떠날 때 붙잡는다
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (isPersonaDirty()) { e.preventDefault(); return '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isPersonaDirty])

  async function savePersona() {
    setSavingPersona(true)
    try {
      const stats = {
        temperance: personaStats.temperance ?? 0,
        diligence: personaStats.diligence ?? 0,
        reflection: personaStats.reflection ?? 0,
        courage: personaStats.courage ?? 0,
        loyalty: personaStats.loyalty ?? 0,
        benevolence: personaStats.benevolence ?? 0,
        fairness: personaStats.fairness ?? 0,
        humility: personaStats.humility ?? 0,
        command: personaStats.command ?? 0,
        martial: personaStats.martial ?? 0,
        intellect: personaStats.intellect ?? 0,
        charm: personaStats.charm ?? 0,
        pessimism_optimism: personaStats.pessimism_optimism ?? 0,
        conservative_progressive: personaStats.conservative_progressive ?? 0,
        individual_social: personaStats.individual_social ?? 0,
        cautious_bold: personaStats.cautious_bold ?? 0,
      }
      const jsonb = buildPersonaJsonb(personaStats, reasons, rationale)
      await saveCelebPersona(celebId, stats, jsonb)
      initialPersona.current = { stats: { ...personaStats }, reasons: { ...reasons }, rationale }
      showToast('success', '페르소나가 저장되었습니다.')
    } catch {
      showToast('error', '페르소나 저장에 실패했습니다.')
    } finally {
      setSavingPersona(false)
    }
  }

  const dialogueCount = countDialogueLines(voiceCeleb?.dialogue_lines ?? null)

  return (
    <>
      {/* Persona Stats */}
      <CardAccordion title="페르소나 스탯">
        <div className="space-y-5">
          {STAT_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-medium text-text-secondary mb-2">{group.label}</p>
              <div className="space-y-1.5">
                {group.keys.map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <label className="text-xs text-text-secondary w-10 shrink-0">{STAT_LABELS[key]}</label>
                    <input
                      type="number" min={0} max={100}
                      value={personaStats[key] ?? 0}
                      onChange={(e) => setPersonaStats((prev) => ({ ...prev, [key]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                      className="w-14 px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary text-center text-xs focus:border-accent focus:outline-none"
                    />
                    <input
                      type="text"
                      value={reasons[key] || ''}
                      onChange={(e) => setReasons((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder="근거"
                      className="flex-1 px-2 py-1 text-xs bg-bg-secondary border border-border rounded text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div>
            <p className="text-xs font-medium text-text-secondary mb-2">성향</p>
            <div className="space-y-1.5">
              {TENDENCY_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <label className="text-xs text-text-secondary w-20 shrink-0">
                    {TENDENCY_LABELS[key][0]}/{TENDENCY_LABELS[key][1]}
                  </label>
                  <input
                    type="number" min={-50} max={50}
                    value={personaStats[key] ?? 0}
                    onChange={(e) => setPersonaStats((prev) => ({ ...prev, [key]: Math.min(50, Math.max(-50, parseInt(e.target.value) || 0)) }))}
                    className="w-14 px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary text-center text-xs focus:border-accent focus:outline-none"
                  />
                  <input
                    type="text"
                    value={reasons[key] || ''}
                    onChange={(e) => setReasons((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder="근거"
                    className="flex-1 px-2 py-1 text-xs bg-bg-secondary border border-border rounded text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rationale */}
          <div>
            <p className="text-xs font-medium text-text-secondary mb-2">종합 평가</p>
            <textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="이 인물의 페르소나 종합 평가"
              rows={3}
              className="w-full px-3 py-2 text-xs bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
            />
          </div>

          {isPersonaDirty() && (
            <div className="flex justify-end pt-2 border-t border-border">
              <button type="button" onClick={savePersona} disabled={savingPersona} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 disabled:opacity-50">
                {savingPersona ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                저장
              </button>
            </div>
          )}
        </div>
      </CardAccordion>

      {/* 대사 · 음성 — 작업실(/celebs/voice-gen)과 같은 편집기를 그대로 쓴다 */}
      {voiceCeleb && (
        <CardAccordion
          title="대사 · 음성"
          summary={
            <div className="flex items-center gap-2">
              {voiceCeleb.has_voice && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">ON</span>
              )}
              <span className="text-xs text-text-secondary">{dialogueCount}/21</span>
            </div>
          }
        >
          <CelebDialogueStudio celeb={voiceCeleb} />
        </CardAccordion>
      )}

      {/* Deep Profile */}
      <CardAccordion title="심화 열전">
        <DeepProfileSection celebId={celebId} slug={celebSlug} />
      </CardAccordion>
    </>
  )
}

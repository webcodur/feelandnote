'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react'
import { saveCelebSpectrum, type StatKey, type TendencyKey } from '@/actions/admin/spectrum'
import type { MemberSpectrum, SpectrumJsonb } from '@/actions/admin/members'
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

function initSpectrumStats(raw: MemberSpectrum | null): Record<string, number> {
  const stats: Record<string, number> = {}
  for (const k of ALL_KEYS) stats[k] = (raw as Record<string, number> | null)?.[k] ?? 0
  return stats
}

function initReasons(jsonb: SpectrumJsonb | null | undefined): Record<string, string> {
  const reasons: Record<string, string> = {}
  if (!jsonb) return reasons
  for (const key of ALL_KEYS) {
    const group = JSONB_GROUP_MAP[key]
    if (!group) continue
    const field = (jsonb[group as keyof SpectrumJsonb] as Record<string, { reason_ko?: string }> | undefined)?.[key]
    reasons[key] = field?.reason_ko || ''
  }
  return reasons
}

function buildSpectrumJsonb(
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
  spectrumRaw: MemberSpectrum | null
  /** 대사·음성 편집기에 넘길 인물 데이터. 없으면 그 구획을 열지 않는다 */
  voiceCeleb: VoiceGenCeleb | null
}
// #endregion

export default function ExtraSections({ celebId, spectrumRaw, voiceCeleb }: ExtraSectionsProps) {
  const { showToast } = useToast()

  // --- Spectrum state ---
  const [spectrumStats, setSpectrumStats] = useState<Record<string, number>>(() => initSpectrumStats(spectrumRaw))
  const [reasons, setReasons] = useState<Record<string, string>>(() => initReasons(spectrumRaw?.spectrum))
  const [rationale, setRationale] = useState(() => spectrumRaw?.spectrum?.rationale_ko || '')
  const [savingSpectrum, setSavingSpectrum] = useState(false)

  const initialSpectrum = useRef({ stats: initSpectrumStats(spectrumRaw), reasons: initReasons(spectrumRaw?.spectrum), rationale: spectrumRaw?.spectrum?.rationale_ko || '' })

  const isSpectrumDirty = useCallback(() => {
    return JSON.stringify(spectrumStats) !== JSON.stringify(initialSpectrum.current.stats)
      || JSON.stringify(reasons) !== JSON.stringify(initialSpectrum.current.reasons)
      || rationale !== initialSpectrum.current.rationale
  }, [spectrumStats, reasons, rationale])

  // 저장 안 한 스펙트럼 값이 있으면 떠날 때 붙잡는다
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (isSpectrumDirty()) { e.preventDefault(); return '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isSpectrumDirty])

  async function saveSpectrum() {
    setSavingSpectrum(true)
    try {
      const stats = {
        temperance: spectrumStats.temperance ?? 0,
        diligence: spectrumStats.diligence ?? 0,
        reflection: spectrumStats.reflection ?? 0,
        courage: spectrumStats.courage ?? 0,
        loyalty: spectrumStats.loyalty ?? 0,
        benevolence: spectrumStats.benevolence ?? 0,
        fairness: spectrumStats.fairness ?? 0,
        humility: spectrumStats.humility ?? 0,
        command: spectrumStats.command ?? 0,
        martial: spectrumStats.martial ?? 0,
        intellect: spectrumStats.intellect ?? 0,
        charm: spectrumStats.charm ?? 0,
        pessimism_optimism: spectrumStats.pessimism_optimism ?? 0,
        conservative_progressive: spectrumStats.conservative_progressive ?? 0,
        individual_social: spectrumStats.individual_social ?? 0,
        cautious_bold: spectrumStats.cautious_bold ?? 0,
      }
      const jsonb = buildSpectrumJsonb(spectrumStats, reasons, rationale)
      await saveCelebSpectrum(celebId, stats, jsonb)
      initialSpectrum.current = { stats: { ...spectrumStats }, reasons: { ...reasons }, rationale }
      showToast('success', '스펙트럼이 저장되었습니다.')
    } catch {
      showToast('error', '스펙트럼 저장에 실패했습니다.')
    } finally {
      setSavingSpectrum(false)
    }
  }

  const dialogueCount = countDialogueLines(voiceCeleb?.dialogue_lines ?? null)
  const filledStatCount = ALL_KEYS.filter((k) => (spectrumStats[k] ?? 0) !== 0 || Boolean(reasons[k]?.trim())).length

  return (
    <div className="space-y-4">
      {/* Spectrum Stats */}
      <CardAccordion
        key="spectrum-stats"
        title="스펙트럼 스탯"
        summary={
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">
              {filledStatCount}/{ALL_KEYS.length}
            </span>
            {filledStatCount === ALL_KEYS.length && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                완료
              </span>
            )}
          </div>
        }
      >
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
                      value={spectrumStats[key] ?? 0}
                      onChange={(e) => setSpectrumStats((prev) => ({ ...prev, [key]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
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
                    value={spectrumStats[key] ?? 0}
                    onChange={(e) => setSpectrumStats((prev) => ({ ...prev, [key]: Math.min(50, Math.max(-50, parseInt(e.target.value) || 0)) }))}
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
              placeholder="이 인물의 스펙트럼 종합 평가"
              rows={3}
              className="w-full px-3 py-2 text-xs bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
            />
          </div>

          {isSpectrumDirty() && (
            <div className="flex justify-end pt-2 border-t border-border">
              <button type="button" onClick={saveSpectrum} disabled={savingSpectrum} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 disabled:opacity-50">
                {savingSpectrum ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                저장
              </button>
            </div>
          )}
        </div>
      </CardAccordion>

      {/* 대사 · 음성 — 작업실(/celebs/voice-gen)과 같은 편집기를 그대로 쓴다 */}
      {voiceCeleb && (
        <CardAccordion
          key="dialogue-studio"
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
    </div>
  )
}

export function DeepProfileAccordion({ celebId, slug }: { celebId: string; slug: string }) {
  return (
    <CardAccordion title="심화 열전">
      <DeepProfileSection celebId={celebId} slug={slug} />
    </CardAccordion>
  )
}

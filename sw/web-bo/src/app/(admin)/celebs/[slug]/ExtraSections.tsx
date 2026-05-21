'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react'
import {
  updateSpeechTone,
  saveCelebDialogues,
  type DialogueLines,
} from '@/actions/admin/dialogues'
import { saveCelebPersona, type StatKey, type TendencyKey } from '@/actions/admin/persona'
import type { MemberPersona, PersonaJsonb } from '@/actions/admin/members'
import { useToast } from '@/contexts/ToastContext'
import VoiceSection from './VoiceSection'
import DeepProfileSection from './DeepProfileSection'

// #region Constants
const SPEECH_TONES = ['loyal', 'composed', 'bold', 'humble', 'gentle', 'free'] as const
const TONE_LABELS: Record<string, string> = {
  loyal: '충의', composed: '침착', bold: '당돌',
  humble: '겸양', gentle: '온화', free: '호방',
}

const DIALOGUE_TYPES = ['greeting', 'roll_call', 'deploy', 'battle_win', 'battle_draw', 'battle_lose', 'clash_attack'] as const
const TYPE_LABELS: Record<string, string> = {
  greeting: '인사', roll_call: '호명', deploy: '출전 시',
  battle_win: '승리', battle_draw: '무승부', battle_lose: '패배', clash_attack: '공격',
}

const EMPTY_LINES: DialogueLines = {
  greeting: ['', '', ''], roll_call: ['', '', ''], deploy: ['', '', ''],
  battle_win: ['', '', ''], battle_draw: ['', '', ''], battle_lose: ['', '', ''],
  clash_attack: ['', '', ''],
}

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
function countDialogueLines(data: DialogueLines | null) {
  if (!data) return 0
  return Object.values(data).flat().filter((l) => l?.trim()).length
}

function mergeLines(raw: DialogueLines | null | undefined): DialogueLines {
  const base = structuredClone(EMPTY_LINES)
  if (!raw) return base
  for (const type of DIALOGUE_TYPES) {
    const arr = (raw as unknown as Record<string, unknown>)[type]
    if (Array.isArray(arr)) {
      base[type] = [
        typeof arr[0] === 'string' ? arr[0] : '',
        typeof arr[1] === 'string' ? arr[1] : '',
        typeof arr[2] === 'string' ? arr[2] : '',
      ]
    }
  }
  if (typeof raw.quote === 'string') base.quote = raw.quote
  if (typeof raw.monologue === 'string') base.monologue = raw.monologue
  return base
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
  dialogueLines: { lines: DialogueLines | null; lines_en: DialogueLines | null }
  speechTone?: string | null
  hasVoice?: boolean
}
// #endregion

export default function ExtraSections({ celebId, celebSlug, personaRaw, dialogueLines, speechTone, hasVoice = false }: ExtraSectionsProps) {
  const { showToast } = useToast()

  // --- Dialogue state ---
  const [activeLang, setActiveLang] = useState<'ko' | 'en'>('ko')
  const [linesKo, setLinesKo] = useState<DialogueLines>(() => mergeLines(dialogueLines.lines))
  const [linesEn, setLinesEn] = useState<DialogueLines>(() => mergeLines(dialogueLines.lines_en))
  const [tone, setTone] = useState(speechTone || 'free')
  const [quoteKo, setQuoteKo] = useState(() => dialogueLines.lines?.quote || '')
  const [quoteEn, setQuoteEn] = useState(() => dialogueLines.lines_en?.quote || '')
  const [monologueKo, setMonologueKo] = useState(() => dialogueLines.lines?.monologue || '')
  const [monologueEn, setMonologueEn] = useState(() => dialogueLines.lines_en?.monologue || '')
  const [savingDialogue, setSavingDialogue] = useState(false)

  // --- Persona state ---
  const [personaStats, setPersonaStats] = useState<Record<string, number>>(() => initPersonaStats(personaRaw))
  const [reasons, setReasons] = useState<Record<string, string>>(() => initReasons(personaRaw?.persona))
  const [rationale, setRationale] = useState(() => personaRaw?.persona?.rationale_ko || '')
  const [savingPersona, setSavingPersona] = useState(false)

  // dirty tracking
  const initialDialogue = useRef({ lines: mergeLines(dialogueLines.lines), lines_en: mergeLines(dialogueLines.lines_en), tone: speechTone || 'free', quoteKo: dialogueLines.lines?.quote || '', quoteEn: dialogueLines.lines_en?.quote || '', monologueKo: dialogueLines.lines?.monologue || '', monologueEn: dialogueLines.lines_en?.monologue || '' })
  const initialPersona = useRef({ stats: initPersonaStats(personaRaw), reasons: initReasons(personaRaw?.persona), rationale: personaRaw?.persona?.rationale_ko || '' })

  const isDialogueDirty = useCallback(() => {
    return tone !== initialDialogue.current.tone
      || quoteKo !== initialDialogue.current.quoteKo
      || quoteEn !== initialDialogue.current.quoteEn
      || monologueKo !== initialDialogue.current.monologueKo
      || monologueEn !== initialDialogue.current.monologueEn
      || JSON.stringify(linesKo) !== JSON.stringify(initialDialogue.current.lines)
      || JSON.stringify(linesEn) !== JSON.stringify(initialDialogue.current.lines_en)
  }, [tone, linesKo, linesEn, quoteKo, quoteEn, monologueKo, monologueEn])

  const isPersonaDirty = useCallback(() => {
    return JSON.stringify(personaStats) !== JSON.stringify(initialPersona.current.stats)
      || JSON.stringify(reasons) !== JSON.stringify(initialPersona.current.reasons)
      || rationale !== initialPersona.current.rationale
  }, [personaStats, reasons, rationale])

  // beforeunload
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (isDialogueDirty() || isPersonaDirty()) { e.preventDefault(); return '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDialogueDirty, isPersonaDirty])

  const activeLines = activeLang === 'ko' ? linesKo : linesEn
  const setActiveLines = activeLang === 'ko' ? setLinesKo : setLinesEn

  type DialogueType = Exclude<keyof DialogueLines, 'quote' | 'monologue'>

  function updateLine(type: string, index: number, value: string) {
    setActiveLines((prev) => {
      const next = { ...prev }
      const arr = [...next[type as DialogueType]] as [string, string, string]
      arr[index] = value
      next[type as DialogueType] = arr
      return next
    })
  }

  async function saveDialogue() {
    setSavingDialogue(true)
    try {
      if (tone !== initialDialogue.current.tone) await updateSpeechTone(celebId, tone)
      const koWithExtra = { ...linesKo, quote: quoteKo || undefined, monologue: monologueKo || undefined }
      const enWithExtra = { ...linesEn, quote: quoteEn || undefined, monologue: monologueEn || undefined }
      await saveCelebDialogues(celebId, koWithExtra, enWithExtra)
      initialDialogue.current = { lines: structuredClone(koWithExtra), lines_en: structuredClone(enWithExtra), tone, quoteKo, quoteEn, monologueKo, monologueEn }
      showToast('success', '대사가 저장되었습니다.')
    } catch {
      showToast('error', '대사 저장에 실패했습니다.')
    } finally {
      setSavingDialogue(false)
    }
  }

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

  const dialogueCount = countDialogueLines(linesKo)

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

      {/* Dialogue Lines */}
      <CardAccordion
        title="고유 대사"
        summary={<span className="text-xs text-text-secondary">{dialogueCount}/21</span>}
      >
        <div className="space-y-4">
          {/* Speech tone */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-text-secondary">말투</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="bg-bg-secondary border border-border rounded-lg px-2 py-1 text-sm text-text-primary"
            >
              {SPEECH_TONES.map((t) => (
                <option key={t} value={t}>{TONE_LABELS[t]} ({t})</option>
              ))}
            </select>
          </div>

          {/* Quote (명언) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">명언 (quote)</label>
            <input
              type="text"
              value={quoteKo}
              onChange={(e) => setQuoteKo(e.target.value)}
              placeholder="한국어 명언"
              className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
            />
            <input
              type="text"
              value={quoteEn}
              onChange={(e) => setQuoteEn(e.target.value)}
              placeholder="English quote"
              className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
            />
          </div>

          {/* Monologue (독백) */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">독백 (monologue)</label>
            <textarea
              value={monologueKo}
              onChange={(e) => setMonologueKo(e.target.value)}
              placeholder="한국어 독백"
              rows={3}
              className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent resize-none"
            />
            <textarea
              value={monologueEn}
              onChange={(e) => setMonologueEn(e.target.value)}
              placeholder="English monologue"
              rows={3}
              className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Language toggle */}
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              type="button" onClick={() => setActiveLang('ko')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${activeLang === 'ko' ? 'bg-accent/20 text-accent' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
            >
              한국어
            </button>
            <button
              type="button" onClick={() => setActiveLang('en')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${activeLang === 'en' ? 'bg-accent/20 text-accent' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}
            >
              English
            </button>
          </div>

          {/* Dialogue inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DIALOGUE_TYPES.map((type) => (
              <div key={type}>
                <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">{TYPE_LABELS[type]}</h3>
                <div className="space-y-1">
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i} type="text"
                      value={activeLines[type][i]}
                      onChange={(e) => updateLine(type, i, e.target.value)}
                      placeholder={`${TYPE_LABELS[type]} ${i + 1}`}
                      className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {isDialogueDirty() && (
            <div className="flex justify-end pt-2 border-t border-border">
              <button type="button" onClick={saveDialogue} disabled={savingDialogue} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 disabled:opacity-50">
                {savingDialogue ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                저장
              </button>
            </div>
          )}
        </div>
      </CardAccordion>

      {/* Voice Files */}
      <CardAccordion
        title="음성 파일"
        summary={hasVoice ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">ON</span> : undefined}
      >
        <VoiceSection celebId={celebId} initialHasVoice={hasVoice} />
      </CardAccordion>

      {/* Deep Profile */}
      <CardAccordion title="심화 열전">
        <DeepProfileSection celebId={celebId} slug={celebSlug} />
      </CardAccordion>
    </>
  )
}

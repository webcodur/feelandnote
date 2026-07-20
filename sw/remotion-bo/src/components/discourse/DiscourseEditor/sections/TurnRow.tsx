'use client'

/**
 * 발언 한 개 — 접으면 목록 한 줄(발언자·종류·대상·대사 앞머리·편), 펼치면 전체 편집 폼.
 *
 * 발언자는 색으로 읽힌다 — 왼쪽 띠와 이름표에 인물색을 그대로 쓴다.
 * 음원 파일 이름은 자리 번호에 묶여 있으므로 이 줄에 함께 띄운다. 자리가 밀리면 여기서 붉게 드러난다.
 */

import type { Speaker, Turn, TurnKind, DiscourseVoice } from '@/lib/discourse-types'
import { ChevronUp, ChevronDown, Trash2, Copy, Plus, Eye, EyeOff } from '@/components/faction/shared/icons'
import { FactionMediaThumb } from '@/components/faction/shared/FactionMediaThumb'
import { HOLD_MOTION_OPTIONS } from '@/components/faction/shared/holdMotion'
import { imageSrc, turnSec, formatMmss } from '../../shared/timing'
import type { EditLang } from '../../shared/editLang'
import { castColorOf } from './CastColorBar'
import { ChunkEditor } from './ChunkEditor'
import { TurnStoryboard } from './TurnStoryboard'
import { VoiceFields } from './VoiceFields'
import type { DiscourseVoiceMeta } from '../voice-meta'

type Props = {
  turn: Turn
  index: number
  total: number
  cast: Speaker[]
  episodeName: string
  series: string
  editLang: EditLang
  open: boolean
  onToggle: () => void
  /** 이 자리에 있어야 할 음원 파일명 */
  voiceFile: string
  voiceMeta?: DiscourseVoiceMeta
  issue?: { expected: string; found?: string }
  onChange: (next: Turn) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onInsertAfter: () => void
  onDuplicate: () => void
  onDelete: () => void
}

const KINDS: { value: TurnKind; label: string; hint: string }[] = [
  { value: 'monologue', label: '독백', hint: '앞 발언을 받지 않고 자기 사상을 말한다' },
  { value: 'accuse', label: '추궁', hint: '상대를 불러세워 따진다 — 담화의 문을 여는 발언' },
  { value: 'rebuttal', label: '반박', hint: '앞 발언을 받아 뒤집는다 — 끼어드는 연출' },
  { value: 'reply', label: '되받기', hint: '반박을 받아 되받는다' },
  { value: 'agree', label: '동의', hint: '앞 발언에 힘을 보탠다' },
]

const orUndef = (v: string) => (v.trim() ? v : undefined)

export function TurnRow({
  turn, index, total, cast, episodeName, series, editLang, open, onToggle,
  voiceFile, voiceMeta, issue, onChange, onMoveUp, onMoveDown, onInsertAfter, onDuplicate, onDelete,
}: Props) {
  const speaker = cast[turn.cast]
  const color = castColorOf(speaker, turn.cast)
  const kind = KINDS.find(k => k.value === turn.kind)
  const set = (patch: Partial<Turn>) => onChange({ ...turn, ...patch })
  const startSrc = imageSrc(episodeName, turn.image ?? speaker?.image)

  return (
    <div
      className="rounded-lg border border-border bg-bg-card"
      style={{ borderInlineStartWidth: 4, borderInlineStartColor: color, ...(turn.disabled ? { opacity: 0.5 } : {}) }}
    >
      {/* 목록 한 줄 */}
      <div className="flex items-center gap-2 p-2">
        <span className="w-6 shrink-0 text-center font-mono text-[11px] text-text-dim">{index + 1}</span>

        <span className="flex w-32 shrink-0 items-center gap-1.5">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate text-xs font-semibold" style={{ color }}>{speaker?.name || '?'}</span>
        </span>

        <span className="shrink-0 rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary" title={kind?.hint}>
          {kind?.label ?? turn.kind}
        </span>
        {turn.to != null && cast[turn.to] && (
          <span className="shrink-0 text-[10px] text-text-dim">
            → <span style={{ color: castColorOf(cast[turn.to], turn.to) }}>{cast[turn.to].name}</span>
          </span>
        )}

        <button onClick={onToggle} className="min-w-0 flex-1 truncate text-start text-xs text-text-secondary hover:text-accent" title={turn.text}>
          {turn.text || <span className="text-text-dim">대사 없음</span>}
        </button>

        {turn.origin && (
          <span className="shrink-0 rounded bg-info px-1 text-[10px] font-bold text-info-text" title={`실제 발언 원문이 붙어 있습니다 — ${turn.originRef ?? '출처 없음'}`}>
            실발언
          </span>
        )}
        {turn.part != null && (
          <span className="shrink-0 rounded bg-accent/15 px-1 text-[10px] font-bold text-accent" title={`쇼츠 ${turn.part}편`}>{turn.part}편</span>
        )}

        {/* 음원 자리 — 어긋나면 여기서 붉게 드러난다 */}
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] ${
            issue?.found ? 'bg-danger font-bold text-danger-text'
              : issue ? 'bg-bg-secondary text-text-dim'
                : 'bg-success text-success-text'
          }`}
          title={
            issue?.found ? `이 자리에 다른 인물의 음성이 있습니다 — ${issue.found} (있어야 할 것: ${voiceFile})`
              : issue ? `음성 파일이 없습니다 — ${voiceFile}`
                : `${voiceFile} · ${voiceMeta?.duration.toFixed(1)}초`
          }
        >
          {issue?.found ? `⚠ ${issue.found}` : issue ? '음성 없음' : `${voiceMeta?.duration.toFixed(1)}s`}
        </span>
        <span className="w-10 shrink-0 text-end font-mono text-[10px] text-text-dim" title="이 발언 컷 길이">
          {formatMmss(turnSec(turn))}
        </span>

        <span className="flex shrink-0 items-center gap-0.5">
          <button onClick={onMoveUp} disabled={index === 0} className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent disabled:opacity-30" title="위로">
            <ChevronUp size={14} />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent disabled:opacity-30" title="아래로">
            <ChevronDown size={14} />
          </button>
          <button onClick={onInsertAfter} className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent" title="바로 뒤에 발언 끼우기">
            <Plus size={14} />
          </button>
          <button onClick={onDuplicate} className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent" title="복제">
            <Copy size={14} />
          </button>
          <button
            onClick={() => set({ disabled: turn.disabled ? undefined : true })}
            className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent"
            title={turn.disabled ? '이 발언을 다시 영상에 넣습니다' : '이 발언을 영상에서 뺍니다 (데이터는 남습니다)'}
          >
            {turn.disabled ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button onClick={onDelete} className="rounded p-1 text-danger-text hover:bg-danger" title="삭제">
            <Trash2 size={14} />
          </button>
        </span>
      </div>

      {/* 콘티 — 접힌 상태에서도 이 발언의 사진 흐름이 그대로 읽힌다 */}
      <TurnStoryboard turn={turn} speaker={speaker} episodeName={episodeName} />

      {open && (
        <div className="space-y-3 border-t border-border p-3">
          {/* 누가 · 무엇을 · 누구에게 · 어느 편 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
              발언자
              <select
                value={turn.cast}
                onChange={e => set({ cast: Number(e.target.value) })}
                className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
              >
                {cast.map((s, i) => <option key={i} value={i}>{s.name || `${i + 1}번 인물`}</option>)}
              </select>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-dim" title={kind?.hint}>
              종류
              <select
                value={turn.kind}
                onChange={e => set({ kind: e.target.value as TurnKind })}
                className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
              >
                {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
              대상
              <select
                value={turn.to ?? ''}
                onChange={e => set({ to: e.target.value === '' ? undefined : Number(e.target.value) })}
                className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
              >
                <option value="">없음 (혼잣말)</option>
                {cast.map((s, i) => i !== turn.cast && <option key={i} value={i}>{s.name || `${i + 1}번 인물`}</option>)}
              </select>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-dim" title="쇼츠로 낼 「한 합」에 편 번호를 붙인다. 비우면 쇼츠에 나오지 않는다(편을 하나라도 배정한 경우)">
              쇼츠 편
              <input
                type="number" min={1} value={turn.part ?? ''}
                onChange={e => set({ part: e.target.value === '' ? undefined : Number(e.target.value) })}
                className="w-16 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
              />
            </span>
          </div>

          {/* 대사 */}
          <div className="flex items-start gap-2">
            <label className="mt-1.5 w-20 shrink-0 text-xs text-text-dim">대사 -</label>
            {editLang !== 'en' && (
              <textarea
                rows={3} value={turn.text ?? ''}
                placeholder="재구성 대사 — 큰따옴표를 쓰지 않습니다"
                onChange={e => set({ text: e.target.value })}
                className="min-w-0 flex-1 resize-y rounded-md border border-border bg-bg-card px-3 py-2 text-sm leading-relaxed focus:border-accent focus:outline-none"
              />
            )}
            {editLang !== 'ko' && (
              <textarea
                rows={3} value={turn.textEn ?? ''}
                placeholder="EN"
                onChange={e => set({ textEn: orUndef(e.target.value) })}
                className="min-w-0 flex-1 resize-y rounded-md border border-border/60 bg-bg-card/50 px-3 py-2 text-xs leading-relaxed text-text-secondary focus:border-accent focus:outline-none"
              />
            )}
          </div>

          <ChunkEditor turn={turn} onChange={onChange} episodeName={episodeName} editLang={editLang} />

          {/* 실제 발언 원문 — 재구성분과 구분하는 신뢰 장치 */}
          <div className="space-y-1.5 rounded-md border border-info-text/30 bg-info/40 p-2.5">
            <div className="text-xs font-semibold text-info-text">실제 발언 원문 (있을 때만)</div>
            <div className="flex items-start gap-2">
              <label className="mt-1.5 w-20 shrink-0 text-xs text-text-dim">원문 -</label>
              <textarea
                rows={2} value={turn.origin ?? ''}
                placeholder="인물이 실제로 한 말 그대로. 재구성이면 비워 두세요"
                onChange={e => set({ origin: orUndef(e.target.value) })}
                className="min-w-0 flex-1 resize-y rounded-md border border-border bg-bg-card px-3 py-2 text-xs focus:border-accent focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-20 shrink-0 text-xs text-text-dim">출처 -</label>
              <input
                value={turn.originRef ?? ''}
                placeholder="X, 2024-03-01 / 사기 진시황본기"
                onChange={e => set({ originRef: orUndef(e.target.value) })}
                className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs focus:border-accent focus:outline-none"
              />
            </div>
            <p className="text-[11px] leading-relaxed text-info-text">
              화면에서 큰따옴표 안은 인물이 실제로 한 말입니다. 재구성 대사에는 따옴표를 쓰지 않습니다 — 시청자가 둘을 구분할 수 있어야 합니다.
              원문을 넣었다면 출처도 함께 넣으세요. 출처 없는 원문은 확인할 방법이 없습니다.
              {turn.origin && !turn.originRef && (
                <span className="font-bold"> · 지금 원문만 있고 출처가 없습니다.</span>
              )}
            </p>
          </div>

          {/* 화면 */}
          <div className="flex items-center gap-2">
            <label className="w-20 shrink-0 text-xs text-text-dim">시작 사진 -</label>
            <input
              value={turn.image ?? ''}
              placeholder={speaker?.image ? `비우면 인물 소개 사진 (${speaker.image})` : 'cast/elon-musk/03.png'}
              onChange={e => set({ image: orUndef(e.target.value) })}
              className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-3 py-1.5 font-mono text-xs focus:border-accent focus:outline-none"
            />
            {startSrc && <FactionMediaThumb src={startSrc} alt="" className="h-9 w-9 rounded object-cover" />}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
              지속효과
              <select
                value={turn.holdMotion ?? ''}
                onChange={e => set({ holdMotion: (e.target.value || undefined) as Turn['holdMotion'] })}
                className="rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
              >
                <option value="">따름 (인물 → 전역)</option>
                {HOLD_MOTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-dim" title="음성 길이(초). 음성을 만들면 파이프라인이 기록한다">
              음성 길이
              <input
                type="number" step={0.1} min={0} value={turn.duration ?? ''}
                onChange={e => set({ duration: e.target.value === '' ? undefined : Number(e.target.value) })}
                className="w-20 rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
              />
              {voiceMeta && turn.duration != null && Math.abs(voiceMeta.duration - turn.duration) > 0.1 && (
                <button
                  onClick={() => set({ duration: Number(voiceMeta.duration.toFixed(2)) })}
                  className="rounded border border-warning-text/50 bg-warning px-1.5 py-0.5 text-[10px] font-semibold text-warning-text hover:bg-warning/70"
                  title={`적힌 길이와 실제 음원(${voiceMeta.duration.toFixed(2)}초)이 다릅니다`}
                >
                  실제 {voiceMeta.duration.toFixed(1)}초로 맞추기
                </button>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
              배속
              <input
                type="number" step={0.05} min={0.5} max={2} value={turn.playbackRate ?? ''}
                placeholder="1"
                onChange={e => set({ playbackRate: e.target.value === '' ? undefined : Number(e.target.value) })}
                className="w-16 rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
              />
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-dim" title="이 발언만 음량을 올리거나 내린다(dB)">
              음량
              <input
                type="number" step={0.5} value={turn.gainDb ?? ''}
                placeholder="0"
                onChange={e => set({ gainDb: e.target.value === '' ? undefined : Number(e.target.value) })}
                className="w-16 rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
              />
              dB
            </span>
            {voiceMeta && (
              <audio
                controls preload="none"
                src={`/api/${series}/discourse-voice/${encodeURIComponent(episodeName)}/${encodeURIComponent(voiceFile)}`}
                className="h-8"
              />
            )}
          </div>

          {/* 음성 덮어쓰기 — 톤이 바뀌는 발언에만 */}
          <VoiceFields
            title="이 발언만 음성 다르게"
            hint="비워 두면 인물의 음성 기본 설정을 그대로 씁니다."
            voice={turn.voice}
            inherited={speaker?.voice}
            onChange={(v?: DiscourseVoice) => set({ voice: v })}
          />
        </div>
      )}
    </div>
  )
}

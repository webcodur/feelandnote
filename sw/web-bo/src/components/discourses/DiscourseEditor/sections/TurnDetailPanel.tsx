'use client'

/**
 * 선택된 발언의 세부 패널 — 원고 탭 오른쪽에 붙는다.
 *
 * 원고 화면은 글 흐름·경계에 집중하고, 사진·음성·출처·편 배정 같은 세부는 여기서 처리한다.
 * 폼 관례는 기존 「발언」 탭(TurnRow·ChunkEditor)을 그대로 따른다 — 같은 데이터를 다른 배치로 볼 뿐이다.
 * 경계 복원 실패 턴도 기존 chunks 배열을 그대로 기준 삼아 사진 배정이 된다(turnChunks 폴백).
 */

import type { Speaker, Turn, DiscourseImageCrop, DiscourseTransition, DiscourseVoice, TurnKind } from '@/lib/discourse-types'
import { Eye, EyeOff, ImageIcon, Trash2, X } from '@feelandnote/shared/bo/icons'
import { HOLD_MOTION_OPTIONS } from '@/components/discourses/shared/holdMotion'
import { formatMmss } from '@feelandnote/shared/bo/editor'
import { ImageSlot, DISCOURSE_IMAGE_DND } from '@feelandnote/shared/bo/media'
import { imageSrc, turnChunks, turnSec } from '../../shared/timing'
import { castColorOf } from './CastColorBar'
import { TurnStoryboard } from './TurnStoryboard'
import { VoiceFields } from './VoiceFields'
import type { DiscourseVoiceMeta } from '../voice-meta'

type Props = {
  turn: Turn
  index: number
  cast: Speaker[]
  series: string
  episodeName: string
  /** 이 자리에 있어야 할 음원 파일명 (T{번호}-{slug}.wav) */
  voiceFile: string
  /** 디스크에 그 음원이 있으면 메타 — 미리듣기·길이 대조에 쓴다 */
  voiceMeta?: DiscourseVoiceMeta
  onChange: (next: Turn) => void
  onClose: () => void
}

const orUndef = (v: string) => (v.trim() ? v : undefined)

/** 발언 종류 — 화면 연출과 자막 리드가 갈린다 (discourse-types TurnKind 주석 참조) */
const KINDS: { value: TurnKind; label: string; hint: string }[] = [
  { value: 'monologue', label: '독백', hint: '앞 발언을 받지 않고 자기 사상을 말한다' },
  { value: 'accuse', label: '추궁', hint: '상대를 불러세워 따진다 — 담화의 문을 여는 발언' },
  { value: 'rebuttal', label: '반박', hint: '앞 발언을 받아 뒤집는다 — 끼어드는 연출' },
  { value: 'reply', label: '되받기', hint: '반박을 받아 되받는다' },
  { value: 'agree', label: '동의', hint: '앞 발언에 힘을 보탠다' },
]

/** 컷 진입 전환 옵션 — 팩션 효과 시트와 같은 어휘(전환 구현을 공유한다) */
const TRANSITION_OPTIONS: { value: DiscourseTransition; label: string }[] = [
  { value: 'auto', label: '자동 (번갈아)' },
  { value: 'zoompunch', label: '확 다가오기 (줌인)' },
  { value: 'slideLeft', label: '슬라이드 (오른쪽에서)' },
  { value: 'slideRight', label: '슬라이드 (왼쪽에서)' },
  { value: 'glitch', label: 'TV 지직거림' },
  { value: 'tear', label: '찢기 (가운데 갈라짐)' },
  { value: 'crt', label: '옛 TV 켜지듯' },
  { value: 'whip', label: '빠르게 스쳐 지나기' },
  { value: 'filmburn', label: '필름 타들어가듯' },
  { value: 'pixelate', label: '모자이크로 흩어지기' },
  { value: 'shutter', label: '블라인드 열리기' },
]

export function TurnDetailPanel({
  turn, index, cast, series, episodeName, voiceFile, voiceMeta, onChange, onClose,
}: Props) {
  const speaker = cast[turn.cast]
  const color = castColorOf(speaker, turn.cast)
  const set = (patch: Partial<Turn>) => onChange({ ...turn, ...patch })

  // 사진 배정 기준 덩어리 — chunks 가 없으면(경계 미지정) 대사 전체가 한 덩어리
  const chunks = turnChunks(turn)
  const changes = turn.imageChanges ?? []
  const changeAt = new Map(changes.map(c => [c.chunk, c]))

  // region 덩어리별 사진 교체 — ChunkEditor 와 같은 규칙
  const setChange = (chunk: number, image: string) => {
    const rest = changes.filter(c => c.chunk !== chunk)
    const next = image.trim()
      ? [...rest, { ...changeAt.get(chunk), chunk, image: image.trim() }]
      : rest
    next.sort((a, b) => a.chunk - b.chunk)
    onChange({ ...turn, imageChanges: next.length ? next : undefined })
  }

  const setCrop = (chunk: number, crop: DiscourseImageCrop | undefined) => {
    const next = changes.map(c => (c.chunk === chunk ? { ...c, crop } : c))
    onChange({ ...turn, imageChanges: next.length ? next : undefined })
  }

  // 덩어리가 줄었는데 남은 사진 교체 — 렌더가 없는 지점을 가리킨다
  const orphan = changes.filter(c => c.chunk >= chunks.length)
  // endregion

  return (
    <div className="space-y-3 rounded-lg border border-border bg-bg-card p-3" style={{ borderInlineStartWidth: 4, borderInlineStartColor: color }}>
      {/* 머리 — 누구의 몇 번째 발언인가 */}
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 truncate text-sm font-semibold" style={{ color }}>
          {index + 1}번 · {speaker?.name || '?'}
        </span>
        <span className="font-mono text-[10px] text-text-dim" title="이 발언 컷 길이">{formatMmss(turnSec(turn))}</span>
        {turn.disabled && (
          <span className="rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-text-dim">영상에서 제외됨</span>
        )}
        <button
          onClick={() => set({ disabled: turn.disabled ? undefined : true })}
          className="ms-auto rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent"
          title={turn.disabled ? '이 발언을 다시 영상에 넣습니다' : '이 발언을 영상에서 뺍니다 (데이터는 남습니다)'}
        >
          {turn.disabled ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button onClick={onClose} className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent" title="세부 패널 닫기">
          <X size={14} />
        </button>
      </div>

      {/* 종류 · 대상 · 쇼츠 편 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-text-dim" title={KINDS.find(k => k.value === turn.kind)?.hint}>
          종류
          <select
            value={turn.kind}
            onChange={e => {
              const kind = e.target.value as TurnKind
              onChange({ ...turn, kind, ...(kind === 'monologue' ? { to: undefined } : {}) })
            }}
            className="rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
          >
            {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </span>
        {turn.kind !== 'monologue' && (
          <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
            대상
            <select
              value={turn.to ?? ''}
              onChange={e => set({ to: e.target.value === '' ? undefined : Number(e.target.value) })}
              className="rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
            >
              <option value="">없음 (허공에)</option>
              {turn.to != null && (turn.to < 0 || turn.to >= cast.length) && (
                <option value={turn.to}>? 알 수 없는 대상 ({turn.to + 1}번)</option>
              )}
              {cast.map((s, i) => i !== turn.cast && <option key={i} value={i}>{s.name || `${i + 1}번 인물`}</option>)}
            </select>
          </span>
        )}
        <span
          className="inline-flex items-center gap-1.5 text-xs text-text-dim"
          title="쇼츠로 낼 「한 합」에 편 번호를 붙인다. 비우면 쇼츠에 나오지 않는다(편을 하나라도 배정한 경우)"
        >
          쇼츠 편
          <input
            type="number" min={1} value={turn.part ?? ''}
            onChange={e => set({ part: e.target.value === '' ? undefined : Number(e.target.value) })}
            className="w-16 rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
          />
        </span>
      </div>

      {/* 연출 — 컷 진입·지속 효과. 비우면 인물 → 에피소드 전역 순으로 따른다 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
          진입 효과
          <select
            value={turn.transition ?? ''}
            onChange={e => set({ transition: (e.target.value || undefined) as Turn['transition'] })}
            className="rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
          >
            <option value="">따름 (인물 → 전역)</option>
            {TRANSITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </span>
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
      </div>

      {/* 시작 사진 */}
      <div className="flex items-start gap-2">
        <label className="mt-1 w-20 shrink-0 text-xs text-text-dim">시작 사진 -</label>
        <ImageSlot
          dnd={DISCOURSE_IMAGE_DND}
          captionArea
          value={turn.image}
          onChange={v => set({ image: v })}
          crop={turn.imageCrop}
          onCropChange={c => set({ imageCrop: c })}
          series={series}
          episodeName={episodeName}
          size={72}
          inheritedSrc={!turn.image ? imageSrc(series, episodeName, speaker?.image) : undefined}
          emptyText={speaker?.image ? '인물 소개 사진' : undefined}
          pickerTitle="이 발언의 시작 사진"
        />
        <div className="min-w-0 flex-1 space-y-1 pt-1">
          <input
            value={turn.image ?? ''}
            placeholder={speaker?.image ? `비우면 인물 소개 사진 (${speaker.image})` : 'cast/elon-musk/03.png'}
            onChange={e => set({ image: orUndef(e.target.value) })}
            className="w-full rounded-md border border-border bg-bg-card px-2 py-1.5 font-mono text-[11px] focus:border-accent focus:outline-none"
          />
          <p className="text-[10px] text-text-dim">사진 목록에서 끌어다 놓아도 됩니다.</p>
        </div>
      </div>

      {/* 덩어리별 사진 교체 — 자막 미리보기와 나란히 */}
      <div className="space-y-1 rounded-md border border-border bg-bg-main/40 p-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
          <ImageIcon size={12} /> 사진이 넘어가는 지점
        </div>
        <p className="text-[10px] text-text-dim">
          덩어리마다 사진을 걸면 그 덩어리부터 사진이 바뀝니다. 1번(발언 시작)은 시작 사진 자리 — 여기 걸면 시작 사진을 대신합니다.
        </p>
        {chunks.map((c, ci) => {
          const ch = changeAt.get(ci)
          return (
            <div key={ci} className="flex items-start gap-2 rounded border border-transparent px-1 py-1 hover:border-border">
              <span className="mt-1 w-4 shrink-0 text-center font-mono text-[10px] text-text-dim">{ci + 1}</span>
              <ImageSlot
                dnd={DISCOURSE_IMAGE_DND}
                captionArea
                value={ch?.image}
                onChange={v => setChange(ci, v ?? '')}
                crop={ch?.crop}
                onCropChange={cr => setCrop(ci, cr)}
                series={series}
                episodeName={episodeName}
                size={44}
                pickerTitle={ci === 0 ? '발언 시작부터 쓸 사진' : `${ci + 1}번째 덩어리부터 바뀔 사진`}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="line-clamp-2 text-[11px] leading-snug text-text-secondary" title={c}>{c}</p>
                <input
                  value={ch?.image ?? ''}
                  placeholder={ci === 0 ? '비우면 발언 시작 사진' : '이 덩어리에서 바꿀 사진'}
                  onChange={e => setChange(ci, e.target.value)}
                  className={`w-full rounded border bg-bg-card px-2 py-1 font-mono text-[10px] focus:border-accent focus:outline-none ${
                    ch ? 'border-accent/60' : 'border-border'
                  }`}
                />
              </div>
              {ch && (
                <button onClick={() => setChange(ci, '')} className="mt-1 shrink-0 rounded p-0.5 text-danger-text hover:bg-danger/20" title="이 지점의 사진 교체를 없앱니다">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          )
        })}
        {chunks.length === 0 && (
          <p className="px-1 text-[11px] text-text-dim">대사가 비어 있어 배정할 덩어리가 없습니다.</p>
        )}
        {orphan.length > 0 && (
          <p className="text-[11px] font-semibold text-warning-text">
            없는 덩어리에 사진이 걸려 있습니다 — {orphan.map(o => `${o.chunk + 1}번`).join(', ')}.
            <button
              onClick={() => {
                const kept = changes.filter(c => c.chunk < chunks.length)
                onChange({ ...turn, imageChanges: kept.length ? kept : undefined })
              }}
              className="ms-1.5 rounded border border-warning-text/50 px-1.5 py-0.5 hover:bg-warning/20"
            >
              지우기
            </button>
          </p>
        )}
      </div>

      {/* 콘티 — 이 발언 동안 화면에 걸리는 사진 흐름 */}
      <div className="overflow-hidden rounded-md border border-border">
        <TurnStoryboard turn={turn} speaker={speaker} series={series} episodeName={episodeName} />
      </div>

      {/* 실제 발언 원문 — 재구성분과 구분하는 신뢰 장치 */}
      <div className="space-y-1.5 rounded-md border border-info-text/30 bg-info/15 p-2.5">
        <div className="text-xs font-semibold text-info-text">실제 발언 원문 (있을 때만)</div>
        <textarea
          rows={2} value={turn.origin ?? ''}
          placeholder="인물이 실제로 한 말 그대로. 재구성이면 비워 두세요"
          onChange={e => set({ origin: orUndef(e.target.value) })}
          className="w-full resize-y rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
        />
        <input
          value={turn.originRef ?? ''}
          placeholder="출처 — X, 2024-03-01 / 사기 진시황본기"
          onChange={e => set({ originRef: orUndef(e.target.value) })}
          className="w-full rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
        />
        <p className="text-[11px] leading-relaxed text-info-text">
          화면에서 큰따옴표 안은 인물이 실제로 한 말입니다. 재구성 대사에는 따옴표를 쓰지 않습니다.
          {turn.origin && !turn.originRef && (
            <span className="font-bold"> · 지금 원문만 있고 출처가 없습니다.</span>
          )}
        </p>
      </div>

      {/* 음성 — 길이·배속·음량과 미리듣기 */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-text-dim" title="음성 길이(초). 음성을 만들면 파이프라인이 기록한다">
            음성 길이
            <input
              type="number" step={0.1} min={0} value={turn.duration ?? ''}
              onChange={e => set({ duration: e.target.value === '' ? undefined : Number(e.target.value) })}
              className="w-20 rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
            />
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
        </div>

        {voiceMeta && turn.duration != null && Math.abs(voiceMeta.duration - turn.duration) > 0.1 && (
          <button
            onClick={() => set({ duration: Number(voiceMeta.duration.toFixed(2)) })}
            className="rounded border border-warning-text/50 bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning-text hover:bg-warning/25"
            title={`적힌 길이와 실제 음원(${voiceMeta.duration.toFixed(2)}초)이 다릅니다`}
          >
            실제 {voiceMeta.duration.toFixed(1)}초로 맞추기
          </button>
        )}

        {voiceMeta ? (
          <div className="flex items-center gap-2">
            <audio
              controls preload="none"
              src={`/api/discourse/voice/${encodeURIComponent(episodeName)}/${encodeURIComponent(voiceFile)}`}
              className="h-8 min-w-0 flex-1"
            />
            <span className="shrink-0 font-mono text-[10px] text-text-dim" title={voiceFile}>{voiceMeta.duration.toFixed(1)}s</span>
          </div>
        ) : (
          <p className="font-mono text-[10px] text-text-dim">음원 없음 — {voiceFile}</p>
        )}

        <VoiceFields
          title="이 발언만 음성 다르게"
          hint="비워 두면 인물의 음성 기본 설정을 그대로 씁니다."
          voice={turn.voice}
          inherited={speaker?.voice}
          onChange={(v?: DiscourseVoice) => set({ voice: v })}
        />
      </div>
    </div>
  )
}

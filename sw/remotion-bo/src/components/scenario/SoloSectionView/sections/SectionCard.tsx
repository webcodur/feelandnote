import { FieldAudioControls } from '../../FieldAudioControls'
import { EditableText } from '../../EditableText'
import { InlineImageRow } from '../../ImageThumb'
import { lookupVoice } from '../../utils'
import { ENGINE_COLORS, ENGINE_LABELS, type AnchorPick, type CinematicImage } from '../../types'
import type { VoiceSection } from '../../../voice-utils'
import type { SoloFreeSection } from '../types'

interface SectionCardProps {
  s: SoloFreeSection
  i: number
  total: number
  segKey: string | null
  activeEngine: (key: string) => string
  sectionMap: Map<string, VoiceSection>
  imgs: CinematicImage[]
  imageBaseUrl: string
  activeIdx: number
  anchorPick: AnchorPick
  speakingId: string | null
  playingKey: string | null
  onSetActive: (i: number) => void
  onDropImage: (i: number, fn: string) => void
  onMove: (i: number, dir: -1 | 1) => void
  onPatch: (i: number, p: Partial<SoloFreeSection>) => void
  onSpeak: (id: string, text: string) => void
  onRemove: (i: number) => void
  onCommitText: (i: number, v: string, prev: string) => void
  onConfirmAnchor: (i: number, selected: string) => void
  onReplaceImage: (i: number, gi: number, fn: string) => void
  onRemoveImage: (i: number, gi: number) => void
  onRemoveImageOnly: (i: number, gi: number) => void
  onStartPick: (pick: AnchorPick) => void
  onCancelPick: () => void
  onTogglePlay: (key: string) => void
  onOpenEditor: (key: string) => void
}

/** 솔로 자유섹션 한 칸 — 조작 줄·본문·이미지·음성 제어판. */
export function SectionCard({
  s, i, total, segKey, activeEngine, sectionMap, imgs, imageBaseUrl,
  activeIdx, anchorPick, speakingId, playingKey,
  onSetActive, onDropImage, onMove, onPatch, onSpeak, onRemove,
  onCommitText, onConfirmAnchor, onReplaceImage, onRemoveImage, onRemoveImageOnly,
  onStartPick, onCancelPick, onTogglePlay, onOpenEditor,
}: SectionCardProps) {
  const isQuote = s.kind === 'quote'
  const vi = segKey ? lookupVoice(sectionMap, segKey) : null
  const eng = segKey ? activeEngine(segKey) : ''
  // 발화 속도 — 본문 글자수(공백·줄바꿈 제외) ÷ 오디오 길이(초). 파일이 있을 때만.
  const charCount = s.text.replace(/\s/g, '').length
  const cps = vi?.exists && vi.duration ? charCount / vi.duration : null
  const picking = anchorPick?.itemIdx === i
  return (
    <div key={s.id}
      onClick={() => onSetActive(i)}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
      onDrop={e => {
        e.preventDefault()
        const fn = e.dataTransfer.getData('text/plain')
        if (fn && !fn.startsWith('seg:') && !fn.startsWith('book:')) { onDropImage(i, fn); onSetActive(i) }
      }}
      className={`rounded border bg-bg-main/30 p-3 space-y-2 ${
        activeIdx === i ? 'border-accent/60 ring-1 ring-accent/30' : 'border-border/70'
      }`}>
      {/* 상단 조작 줄 */}
      <div className="flex items-center gap-2 text-[11px] text-text-secondary">
        <span className="font-mono font-bold text-text-primary">#{i + 1}</span>
        <button onClick={() => onMove(i, -1)} disabled={i === 0}
          className="px-1.5 py-0.5 border border-border/60 rounded disabled:opacity-30 hover:border-accent/40" title="위로">↑</button>
        <button onClick={() => onMove(i, 1)} disabled={i === total - 1}
          className="px-1.5 py-0.5 border border-border/60 rounded disabled:opacity-30 hover:border-accent/40" title="아래로">↓</button>

        {/* 화자 토글 */}
        <div className="ml-2 inline-flex rounded overflow-hidden border border-border/60">
          <button onClick={() => onPatch(i, { voice: 'tts' })}
            className={`px-2 py-0.5 ${(s.voice ?? 'tts') === 'tts' ? 'bg-accent/15 text-accent font-bold' : 'hover:bg-bg-hover'}`}>일반 음성</button>
          <button onClick={() => onPatch(i, { voice: 'actor' })}
            className={`px-2 py-0.5 border-l border-border/60 ${s.voice === 'actor' ? 'bg-accent/15 text-accent font-bold' : 'hover:bg-bg-hover'}`}>성우</button>
        </div>

        {/* 종류 토글 */}
        <div className="inline-flex rounded overflow-hidden border border-border/60">
          <button onClick={() => onPatch(i, { kind: 'narration' })}
            className={`px-2 py-0.5 ${!isQuote ? 'bg-accent/15 text-accent font-bold' : 'hover:bg-bg-hover'}`}>서술</button>
          <button onClick={() => onPatch(i, { kind: 'quote' })}
            className={`px-2 py-0.5 border-l border-border/60 ${isQuote ? 'bg-accent/15 text-accent font-bold' : 'hover:bg-bg-hover'}`}>인용</button>
        </div>

        <button onClick={() => onSpeak(s.id, s.text)}
          className={`ml-auto px-2 py-0.5 border rounded ${
            speakingId === s.id
              ? 'border-accent text-accent bg-accent/10 font-bold'
              : 'border-border/60 hover:border-accent/40 hover:text-accent'
          }`}
          title="브라우저 음성으로 미리듣기 (분량·리듬 확인용)"
        >{speakingId === s.id ? '■ 정지' : '▶ 듣기'}</button>
        <button onClick={() => onRemove(i)}
          className="px-1.5 py-0.5 border border-red-400/40 text-red-500 rounded hover:bg-red-500/10" title="섹션 삭제">삭제</button>
      </div>

      {/* 본문 텍스트 — 쇼츠·롱폼과 동일한 EditableText. 구절 선택으로 이미지 앵커를 잡는다(픽업·하이라이트 공용). */}
      <EditableText
        value={s.text}
        onCommit={(v, prev) => onCommitText(i, v, prev)}
        pickMode={picking}
        onPick={sel => onConfirmAnchor(i, sel)}
        onAddAnchor={sel => onConfirmAnchor(i, sel)}
        highlights={imgs.map(img => img.text).filter((t): t is string => !!t)}
      />

      {/* 인용 출처 */}
      {isQuote && (
        <input
          value={s.quoteSource ?? ''}
          onChange={e => onPatch(i, { quoteSource: e.target.value })}
          placeholder="인용 출처 (예: 손자병법 모공편)"
          className="w-full rounded border border-border/60 bg-bg-card px-2 py-1 text-[12px] focus:border-accent/50 outline-none"
        />
      )}

      {/* 이미지 — 쇼츠·롱폼과 동일한 InlineImageRow(드롭·앵커 픽업·썸네일·교체). 끌어다 놓으면 빈 슬롯부터 채운다. */}
      <div className="rounded border border-border/50 bg-bg-card/60 p-2 space-y-1">
        <div className="text-[11px] font-bold text-text-secondary">
          이미지 <span className="opacity-60 font-normal">· 본문이 흐르며 이미지가 바뀝니다. 끌어다 놓고, 본문 구절을 선택해 전환 시점을 잡으세요</span>
        </div>
        {imgs.length > 0 ? (
          <InlineImageRow
            images={imgs}
            allImages={imgs}
            imageBaseUrl={imageBaseUrl}
            itemIdx={i}
            picking={picking}
            anchorPick={anchorPick}
            onReplace={onReplaceImage}
            onRemove={onRemoveImage}
            onRemoveFileOnly={onRemoveImageOnly}
            onStartPick={gi => onStartPick({ itemIdx: i, imgIdx: gi, draft: null })}
            onCancelPick={onCancelPick}
          />
        ) : (
          <div className="flex items-center justify-center h-14 rounded border border-dashed border-border/60 text-[10px] text-text-secondary">
            오른쪽 갤러리에서 끌어다 놓기
          </div>
        )}
      </div>

      {/* 음성 제어판 — 쇼츠·롱폼과 동일(재생·엔진 표시·편집기 열기). 본문이 있어야 음성을 만든다. */}
      {segKey && vi ? (
        <div className="flex items-center gap-2 rounded border border-border/60 bg-bg-card px-2 py-1.5">
          <FieldAudioControls
            sectionKey={segKey}
            fallbackDuration={vi.duration ?? 0}
            isPlaying={playingKey === segKey}
            onTogglePlay={() => onTogglePlay(segKey)}
          />
          <span className="ml-1 text-[11px] font-mono text-text-secondary whitespace-nowrap">{segKey.split('/').pop()}</span>
          {eng && vi.exists && (
            <span className={`text-[10px] font-mono font-bold whitespace-nowrap px-1.5 py-0.5 rounded border border-slate-400 bg-bg-secondary ${ENGINE_COLORS[eng] ?? 'text-text-secondary'}`}>
              {ENGINE_LABELS[eng] ?? ''}
            </span>
          )}
          {!vi.exists && (
            <span className="text-[10px] font-bold text-red-700 whitespace-nowrap px-1.5 py-0.5 bg-red-100 border border-red-400 rounded">미생성</span>
          )}
          {cps != null && (
            <span
              className="text-[10px] font-mono font-bold whitespace-nowrap px-1.5 py-0.5 rounded border border-border/60 bg-bg-secondary text-text-secondary"
              title={`본문 ${charCount}자 ÷ ${vi.duration?.toFixed(1)}초`}
            >
              {cps.toFixed(1)}자/초
            </span>
          )}
          <button
            onClick={() => onOpenEditor(segKey)}
            className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-black whitespace-nowrap"
            title="음성 생성·편집기 열기"
          >편집기 열기</button>
        </div>
      ) : (
        <div className="text-[11px] text-text-secondary italic px-1">본문을 입력하면 음성을 만들 수 있습니다.</div>
      )}
    </div>
  )
}

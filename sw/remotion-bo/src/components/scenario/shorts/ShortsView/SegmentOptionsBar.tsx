'use client'

import type { Speaker } from '../../SpeakerPanel'
import { SpeakerPicker } from '../../SpeakerPicker'

/**
 * 세그먼트 옵션바 — 가로로 펼친 드롭다운 묶음.
 *
 * 항목: 우상단(얼굴/책/없음) · 어둡게(없음/살짝/진하게) · 줌인 토글 ·
 *       텍스트(자막/덮기/하단) · 다음 구간 전 멈춤(초) · 화자 선택 · 음성 잠금.
 *
 * Gemini 캐릭터 보이스 오버라이드(seg.geminiVoice) · 스타일 prefix(seg.style) 는
 * 음성 행을 펼친 ExpandedVoicePanel 에서만 편집한다. 여기에는 현재 값만 표시.
 *
 * undefined · false 값은 updateSegField 에서 필드 자체를 제거해 JSON 을 깔끔하게 유지한다.
 * zoomIn=false 는 의미 있는 값(강제 OFF) 이라 KeepFalse 변형을 쓴다.
 */
export function SegmentOptionsBar({
  seg, idx, shortsIndex, speakers,
  updateSegField, updateSegFieldKeepFalse,
}: {
  seg: any
  idx: number
  shortsIndex: number
  speakers: Speaker[]
  updateSegField: (i: number, field: string, value: any) => void
  updateSegFieldKeepFalse: (i: number, field: string, value: any) => void
}) {
  const topRight = seg.topRight as 'avatar' | 'book' | 'none' | undefined
  const darken: 'none' | 'light' | 'heavy' = seg.darken === true ? 'heavy' : seg.darken === 'light' ? 'light' : 'none'
  const zoomOn = seg.zoomIn !== false
  const overlayMode: 'none' | 'full' | 'bottom' =
    seg.textOverlay === true ? 'full'
    : seg.textOverlay === 'bottom' ? 'bottom'
    : 'none'

  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 pb-1.5">
      <div />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] px-2 py-1 rounded bg-bg-card/40 border border-border/30">
        {/* 우상단 — 자동(미설정) 포함 드롭다운 */}
        <label className="flex items-center gap-1" title="화면 우상단 작은 카드. 자동 = 인트로 hook 류는 미표시, 책 영역은 책 표지">
          <span className="text-text-secondary">우상단</span>
          <select
            value={topRight ?? '__auto'}
            onChange={e => {
              const v = e.target.value
              updateSegField(idx, 'topRight', v === '__auto' ? undefined : v)
            }}
            className="bg-bg-card border border-border/40 rounded px-1 py-0.5 cursor-pointer"
          >
            <option value="__auto">자동</option>
            <option value="avatar">얼굴</option>
            <option value="book">책</option>
            <option value="none">없음</option>
          </select>
        </label>
        <div className="w-px h-4 bg-border/50" />
        {/* 어둡게 — 없음 / 살짝 / 진하게 */}
        <label className="flex items-center gap-1" title="배경 이미지 어둡게 깔기 정도">
          <span className="text-text-secondary">어둡게</span>
          <select
            value={darken}
            onChange={e => {
              const v = e.target.value as 'none' | 'light' | 'heavy'
              const stored = v === 'none' ? undefined : v === 'light' ? 'light' : true
              updateSegField(idx, 'darken', stored)
            }}
            className="bg-bg-card border border-border/40 rounded px-1 py-0.5 cursor-pointer"
          >
            <option value="none">없음</option>
            <option value="light">살짝</option>
            <option value="heavy">진하게</option>
          </select>
        </label>
        <label
          title="배경 이미지에 켄번즈 줌(1.00→1.08) 적용. 체크 해제 시 고정 배경."
          className="flex items-center gap-1 cursor-pointer select-none"
        >
          <input
            type="checkbox"
            checked={zoomOn}
            onChange={e => updateSegFieldKeepFalse(idx, 'zoomIn', e.target.checked ? undefined : false)}
            className="cursor-pointer"
          />
          <span>줌인</span>
        </label>
        {/* 텍스트 표시 모드 — 자막(기본) / 중앙 풀스크린 덮기 / 하단 좌측정렬(살짝 작게) */}
        <label
          className="flex items-center gap-1"
          title="자막=하단 가운데 페이지 자막 / 덮기=중앙 좌측정렬 큰 글씨로 본문을 덮음 / 하단=하단 좌측정렬 큰 글씨(덮기보다 살짝 작게)"
        >
          <span className="text-text-secondary">텍스트</span>
          <select
            value={overlayMode}
            onChange={e => {
              const v = e.target.value as 'none' | 'full' | 'bottom'
              const stored = v === 'none' ? undefined : v === 'full' ? true : 'bottom'
              updateSegField(idx, 'textOverlay', stored)
            }}
            className="bg-bg-card border border-border/40 rounded px-1 py-0.5 cursor-pointer"
          >
            <option value="none">자막</option>
            <option value="full">덮기</option>
            <option value="bottom">하단</option>
          </select>
        </label>
        <div className="w-px h-4 bg-border/50" />
        {/* 다음 구간 전 추가 멈춤(초) */}
        <label
          className="flex items-center gap-1"
          title="이 구간이 끝나고 다음 구간으로 넘어가기 전 멈춤(초). 마지막 이미지가 그 시간 동안 유지되고, 다음 구간이 그만큼 늦게 시작된다."
        >
          <span className="text-text-secondary">멈춤</span>
          <input
            type="number" step={0.1} min={0}
            value={Number.isFinite(seg.gapAfter) ? String(seg.gapAfter) : ''}
            onChange={e => {
              const n = parseFloat(e.target.value)
              updateSegField(idx, 'gapAfter', Number.isFinite(n) && n > 0 ? n : undefined)
            }}
            placeholder="0"
            className="bg-bg-card border border-border/40 rounded px-1 py-0.5 w-12 text-center"
          />
          <span className="text-text-dim">초</span>
        </label>
        <div className="w-px h-4 bg-border/50" />
        {/* 화자 선택 — 색상 칩 + 드롭다운. RowSpeakerSelect 와 동일한 SpeakerPicker. */}
        <div className="flex items-center gap-1">
          <SpeakerPicker
            value={seg.speaker}
            onChange={next => updateSegField(idx, 'speaker', next)}
            speakers={speakers}
            placeholderLabel="화자: 미지정"
            title="화자 — 상단 화자 카드와 매칭되어 voiceId·색상 적용"
          />
          {speakers.every(s => s.id === 'host') && (
            <span className="text-text-dim italic text-[11px]">추가 화자는 상단 화자 설정에서 등록</span>
          )}
        </div>
        {/* Gemini 오버라이드 · 스타일 — 현재 값 표시만. 편집은 음성 행 펼쳐서. */}
        {(seg.geminiVoice || seg.style) && (
          <>
            <span
              className="flex items-center gap-1 text-text-dim"
              title="이 구간 보이스/스타일 오버라이드 — 편집은 음성 행을 펼쳐서"
            >
              {seg.geminiVoice && (
                <span className="text-blue-300/80 font-mono text-[11px]">{seg.geminiVoice}</span>
              )}
              {seg.style && (
                <span className="text-text-secondary/70 italic text-[11px] max-w-[180px] truncate">“{seg.style}”</span>
              )}
            </span>
            <div className="w-px h-4 bg-border/50" />
          </>
        )}
        <label
          title="음성 보존 — TTS 가 이 구간을 무조건 건드리지 않는다. 텍스트가 바뀌어도, 전체 재생성을 돌려도 보존됨. 마음에 든 결과를 잠궈두는 용도."
          className={`flex items-center gap-1 cursor-pointer select-none px-1.5 py-0.5 rounded ${seg.voiceLock ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' : ''}`}
        >
          <input
            type="checkbox"
            checked={seg.voiceLock === true}
            onChange={e => updateSegField(idx, 'voiceLock', e.target.checked ? true : undefined)}
            className="cursor-pointer"
          />
          <span>{seg.voiceLock ? '🔒 잠금' : '잠금'}</span>
        </label>
      </div>
    </div>
  )
}

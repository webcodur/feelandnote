'use client'

import React, { useState, type ReactNode } from 'react'
import { Speaker } from '../../SpeakerPanel'
import { EditorPanel } from '../../EditorPanel'
import { SpeakerPicker } from '../../SpeakerPicker'
import { GeminiVoiceSelect } from '../../../scenario-voice/GeminiVoiceSelect'
import { SegmentSfxEditor } from '../../SegmentSfxEditor'
import { GainDbInput } from '../../GainDbInput'

type FileMeta = { name: string; duration: number | null }

// --- UI 유틸 ---
function Switch({ checked, onChange, activeColor = 'bg-accent' }: { checked: boolean, onChange: (c: boolean) => void, activeColor?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? activeColor : 'bg-white/20 border-black/30 shadow-inner'}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`}
      />
    </button>
  )
}

const LABEL = 'text-text-primary/90 font-medium w-14 shrink-0 text-center'
const CTRL = 'bg-black/40 border border-white/10 rounded px-1.5 py-0 h-[22px] w-full cursor-pointer text-text-primary focus:border-accent focus:bg-black/60 focus:outline-none transition-colors'

function Cell({ label, title, colSpan = 2, children }: {
  label: string
  title?: string
  colSpan?: number
  children: ReactNode
}) {
  return (
    <label style={{ gridColumn: `span ${colSpan} / span ${colSpan}` }} className="flex items-center gap-1.5" title={title}>
      <span className={LABEL}>{label}</span>
      <div className="flex-1 min-w-0 flex items-center gap-1">{children}</div>
    </label>
  )
}

// --- 메인 컴포넌트 ---
export function SegmentToolbox({
  seg,
  idx,
  shortsIndex,
  speakers,
  updateSegField,
  updateSegFieldKeepFalse,
  sfxFiles,
  sfxBase,
  sectionKey,
}: {
  seg: any
  idx: number
  shortsIndex: number
  speakers: Speaker[]
  updateSegField: (idx: number, field: string, val: any) => void
  updateSegFieldKeepFalse: (idx: number, field: string, val: any) => void
  sfxFiles: FileMeta[]
  sfxBase: string
  sectionKey: string
}) {
  const [activeTab, setActiveTab] = useState<'visual' | 'audio' | 'sfx'>('visual')

  const topRight = seg.topRight as 'avatar' | 'book' | 'none' | undefined
  const darken: 'none' | 'light' | 'heavy' = seg.darken === true ? 'heavy' : seg.darken === 'light' ? 'light' : 'none'
  const zoomOn = seg.zoomIn !== false
  const overlayMode: 'none' | 'full' | 'bottom' =
    seg.textOverlay === true ? 'full'
    : seg.textOverlay === 'bottom' ? 'bottom'
    : 'none'

  const [showOverride, setShowOverride] = useState(false)
  const isOverrideActive = !!seg.geminiVoice || !!seg.style || showOverride

  return (
    <EditorPanel
      title="세그먼트 도구모음 (SegmentToolbox)"
      icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
      className="!mb-0"
      contentClassName="p-2 flex flex-col gap-2"
    >
      <div className="grid grid-cols-12 gap-x-2 gap-y-2 items-center text-[11px]">
        {/* Row 1: 기본 비주얼 & 오디오 설정 */}
        <Cell colSpan={2} label="우상단" title="화면 우상단 작은 카드. 자동 = 인트로 hook 류는 미표시, 책 영역은 책 표지">
          <select value={topRight ?? '__auto'} onChange={e => updateSegField(idx, 'topRight', e.target.value === '__auto' ? undefined : e.target.value)} className={CTRL}>
            <option value="__auto">자동</option><option value="avatar">얼굴</option><option value="book">책</option><option value="none">없음</option>
          </select>
        </Cell>
        <Cell colSpan={2} label="어둡게" title="배경 이미지 어둡게 깔기 정도">
          <select value={darken} onChange={e => updateSegField(idx, 'darken', e.target.value === 'none' ? undefined : e.target.value === 'light' ? 'light' : true)} className={CTRL}>
            <option value="none">없음</option><option value="light">살짝</option><option value="heavy">진하게</option>
          </select>
        </Cell>
        <Cell colSpan={2} label="텍스트" title="자막=하단 가운데 / 덮기=중앙 좌측정렬 큰 글씨 / 하단=하단 좌측정렬(덮기보다 작게)">
          <select value={overlayMode} onChange={e => updateSegField(idx, 'textOverlay', e.target.value === 'none' ? undefined : e.target.value === 'full' ? true : 'bottom')} className={CTRL}>
            <option value="none">자막</option><option value="full">덮기</option><option value="bottom">하단</option>
          </select>
        </Cell>
        <Cell colSpan={2} label="줌인" title="배경 이미지 켄번즈 줌(1.00→1.08). 해제 시 고정 배경.">
          <Switch checked={zoomOn} onChange={c => updateSegFieldKeepFalse(idx, 'zoomIn', c ? undefined : false)} activeColor="bg-accent" />
          <span className="text-text-primary ml-1">{zoomOn ? '켜' : '끔'}</span>
        </Cell>
        <Cell colSpan={2} label="잠금" title="음성 보존 — TTS 가 이 구간을 무조건 건드리지 않는다. 전체 재생성에서도 보존.">
          <Switch checked={seg.voiceLock === true} onChange={c => updateSegField(idx, 'voiceLock', c ? true : undefined)} activeColor="bg-red-400" />
          <span className={`ml-1 ${seg.voiceLock ? 'text-amber-300' : 'text-text-primary'}`}>{seg.voiceLock ? '잠김' : '풀림'}</span>
        </Cell>
        <Cell colSpan={2} label="멈춤" title="이 구간 다음으로 넘어가기 전 멈춤(초). 다음 구간이 그만큼 늦게 시작.">
          <input type="number" step={0.1} min={0} value={Number.isFinite(seg.gapAfter) ? String(seg.gapAfter) : ''} onChange={e => { const n = parseFloat(e.target.value); updateSegField(idx, 'gapAfter', Number.isFinite(n) && n > 0 ? n : undefined) }} placeholder="0" className="bg-black/40 border border-white/10 rounded px-1 py-0 h-[22px] w-full min-w-0 text-center text-text-primary focus:border-accent focus:bg-black/60 focus:outline-none transition-colors" />
        </Cell>

        {/* Row 2: 화자, 출처, 볼륨 */}
        <Cell colSpan={4} label="화자" title="화자 — 상단 SpeakerPanel 에 등록된 인물 중 선택. voiceId · 색상이 자동 적용.">
          <SpeakerPicker
            value={seg.speaker}
            onChange={next => updateSegField(idx, 'speaker', next)}
            speakers={speakers}
            placeholderLabel="미지정"
          />
          {!isOverrideActive && (
            <button
              type="button"
              onClick={() => setShowOverride(true)}
              className="text-[10px] text-text-dim hover:text-accent ml-0.5 px-1 py-0.5 rounded border border-transparent hover:border-border/40 shrink-0"
            >
              + 오버라이드
            </button>
          )}
        </Cell>
        
        {seg.role === 'celeb' ? (
          <Cell colSpan={4} label="출처">
            <input
              className="text-[11px] text-[#e5c07b] bg-black/40 border border-white/10 rounded px-1.5 py-0 h-[22px] focus:border-accent focus:bg-black/60 focus:outline-none flex-1 w-full transition-colors"
              value={seg.quoteSource ?? ''}
              onChange={e => updateSegField(idx, 'quoteSource', e.target.value || undefined)}
              placeholder="(예: 인터뷰 제목·매체·연도)"
              title="셀럽 발화 출처 — 인터뷰·기사·서신 등"
            />
          </Cell>
        ) : <div className="col-span-4" />}

        <div className="col-span-4 flex justify-end items-center pr-1">
          <GainDbInput value={typeof seg.gainDb === 'number' ? seg.gainDb : undefined} onChange={next => updateSegField(idx, 'gainDb', next)} sectionKey={sectionKey} />
        </div>

        {/* Row 3: 제미니 오버라이드 */}
        {isOverrideActive && (
          <Cell colSpan={12} label="오버라이드" title="이 구간 보이스/스타일 제미니 강제 오버라이드. 입력하면 엔진과 무관하게 제미니로 우회 생성됩니다.">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <GeminiVoiceSelect value={seg.geminiVoice ?? ''} onChange={next => updateSegField(idx, 'geminiVoice', next || undefined)} placeholderLabel="보이스 ID (미지정)" className="bg-black/40 border border-white/10 rounded px-1.5 py-0 h-[22px] w-32 focus:border-accent focus:bg-black/60 focus:outline-none text-[#61afef] font-mono transition-colors" />
              <input value={seg.style ?? ''} onChange={e => updateSegField(idx, 'style', e.target.value || undefined)} placeholder="제미니 스타일 (예: 속삭이듯)" className="bg-black/40 border border-white/10 rounded px-1.5 py-0 h-[22px] flex-1 min-w-0 focus:border-accent focus:bg-black/60 focus:outline-none text-text-primary italic placeholder:text-text-secondary/50 transition-colors" />
              {!seg.geminiVoice && !seg.style && (
                <button type="button" onClick={() => setShowOverride(false)} className="text-[10px] text-text-dim hover:text-red-400 px-1">✕</button>
              )}
            </div>
          </Cell>
        )}
      </div>

      {/* SFX */}
      <div className="border-t border-border/20 pt-2 text-[11px]">
        <SegmentSfxEditor sfx={seg.sfx} files={sfxFiles} basePath={sfxBase} onChange={next => updateSegField(idx, 'sfx', next)} />
      </div>
    </EditorPanel>
  )
}

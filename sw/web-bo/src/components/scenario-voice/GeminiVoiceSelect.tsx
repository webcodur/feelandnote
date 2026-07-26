'use client'

import { GEMINI_VOICES_MALE, GEMINI_VOICES_FEMALE } from './types'

/**
 * Gemini 캐릭터 보이스 셀렉트 — 남성·여성 그룹 분기.
 *
 * 인물 본인 줄·일반 화자 줄·음성 행 펼침 안의 캐릭터 영역이 같은 모양으로 사용한다.
 * 보이스 그룹 체계가 바뀌면 이 한 자리만 갱신한다.
 *
 * placeholderLabel을 비우면 비선택 옵션 없이 보이스 목록만 그린다 (이미 어떤 값이 들어 있는 자리용).
 */
export function GeminiVoiceSelect({
  value,
  onChange,
  className,
  title,
  placeholderLabel,
  groupLabels = { male: '남성', female: '여성' },
}: {
  value: string
  /** raw 값 그대로 전달. 빈 문자열 처리(=undefined)는 호출 측 책임. */
  onChange: (next: string) => void
  /** 외곽 select에 추가할 클래스 (크기·색·padding 등) */
  className?: string
  title?: string
  /** 비선택 상태 옵션 문구. 비우면 옵션 자체를 그리지 않는다. */
  placeholderLabel?: string
  /** optgroup 표시 문구. 다른 엔진과 구분이 필요한 자리에서만 덮어쓴다. */
  groupLabels?: { male: string; female: string }
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      title={title}
      className={`bg-white border border-slate-300 text-slate-950 font-bold rounded px-2 py-0.5 h-[24px] font-mono cursor-pointer focus:border-accent focus:outline-none shadow-sm ${className ?? ''}`}
    >
      {placeholderLabel && <option value="">{placeholderLabel}</option>}
      <optgroup label={groupLabels.male}>
        {GEMINI_VOICES_MALE.map(v => <option key={v} value={v}>{v}</option>)}
      </optgroup>
      <optgroup label={groupLabels.female}>
        {GEMINI_VOICES_FEMALE.map(v => <option key={v} value={v}>{v}</option>)}
      </optgroup>
    </select>
  )
}

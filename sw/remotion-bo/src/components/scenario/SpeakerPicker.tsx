'use client'

import type { Speaker } from './SpeakerPanel'

/**
 * 등록된 화자 중 하나를 고르는 작은 콤보 — 색상 칩 + 드롭다운.
 *
 * Fragment 반환이라 부모 flex 컨테이너 안에 그대로 들어가 부모 gap을 따른다.
 * 라벨·외곽 래퍼·empty 안내 메시지는 부모가 책임.
 *
 * 등록된 화자가 비었으면 select는 비활성·미지정 옵션만. value 미지정은 빈 문자열, onChange는 undefined로 받는다.
 */
export function SpeakerPicker({
  value,
  onChange,
  speakers,
  name,
  placeholderLabel = '미지정',
  title,
}: {
  value: string | undefined
  onChange: (next: string | undefined) => void
  speakers: Speaker[]
  /** select name (행 단위 고유값 권장) */
  name?: string
  /** 미지정 옵션의 표시 문구 */
  placeholderLabel?: string
  /** select title (툴팁). 미지정 시 등록된 화자 유무에 따라 기본 안내가 자동 적용된다. */
  title?: string
}) {
  const speakerObj = value ? speakers.find(s => s.id === value) : undefined
  const empty = speakers.length === 0

  return (
    <>
      {speakerObj && (
        <span
          className="inline-block w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: speakerObj.color }}
          title={speakerObj.label}
        />
      )}
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || undefined)}
        disabled={empty}
        name={name}
        title={title ?? (empty ? '먼저 상단 화자 설정에서 등록하라' : '상단 화자 설정에 등록된 인물 중 선택')}
        className="bg-bg-card border border-border/40 rounded px-1 py-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">{placeholderLabel}</option>
        {speakers.map(s => (
          <option key={s.id} value={s.id}>{s.label} ({s.id})</option>
        ))}
      </select>
    </>
  )
}

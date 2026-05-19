'use client'

import type { Speaker } from './SpeakerPanel'
import { SpeakerPicker } from './SpeakerPicker'

/**
 * 한 음성 행의 화자 선택 한 줄 — 라벨 + 색상 칩 + 드롭다운.
 *
 * 쇼츠 SegmentOptionsBar의 화자 영역과 같은 SpeakerPicker를 사용한다.
 * 롱폼 ScenarioRow 아래에 부착해 인트로·책 본문·인용 어디든 같은 모양으로 등록된 화자를 골라 라우팅한다.
 *
 * - 미지정(빈 값)은 키 자체를 비워 JSON에 흔적을 남기지 않는다(상위 setter 책임).
 * - speakers가 비었을 때는 안내 문구를 곁들이고 picker 자체는 비활성화된다.
 */
export function RowSpeakerSelect({ value, onChange, speakers, name, label = '화자' }: {
  value: string | undefined
  onChange: (next: string | undefined) => void
  speakers: Speaker[]
  /** select name 충돌 방지용 식별자 (행 단위 고유값) */
  name: string
  label?: string
}) {
  // 호출자가 host 가상 화자를 늘 합성해 넘기므로 "추가 화자 없음"을 기준으로 안내한다.
  const noExtras = speakers.every(s => s.id === 'host')

  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 pb-1.5">
      <div />
      <div className="flex items-center gap-2 px-2 py-1 rounded bg-bg-card/40 border border-border/30 text-[11px]">
        <span className="text-text-secondary">{label}</span>
        <SpeakerPicker value={value} onChange={onChange} speakers={speakers} name={name} />
        {noExtras && <span className="text-text-dim italic">추가 화자는 상단 화자 설정에서 등록</span>}
      </div>
    </div>
  )
}

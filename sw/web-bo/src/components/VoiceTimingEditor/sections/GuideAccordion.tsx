type Props = {
  guideOpen: boolean
  setGuideOpen: (fn: (v: boolean) => boolean) => void
}

export function GuideAccordion({ guideOpen, setGuideOpen }: Props) {
  return (
    <div className="bg-bg-main rounded overflow-hidden">
      <button
        onClick={() => setGuideOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors"
      >
        <span>조작 안내</span>
        <span className={`text-xs font-bold transition-transform ${guideOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {guideOpen && (
        <div className="text-sm font-bold text-text-primary px-3 pb-2 space-y-0.5">
          <div className="text-text-secondary pb-1">Stich = 한 화면 자막 한 덩어리(노란선). Hemistich = 그 안에서 음성 따라 강조되는 마디(파란선).</div>
          <div><span className="text-accent">클릭</span> — 해당 위치부터 재생 + Stich 선택</div>
          <div><span className="text-accent">Space</span> — 재생/일시정지 토글 (파형 포커스 시)</div>
          <div><span className="text-accent">노란선 드래그</span> — Stich 경계 이동</div>
          <div><span className="text-accent">빈 곳 더블클릭</span> — Stich 경계 추가 (텍스트도 해당 위치에서 분할)</div>
          <div><span className="text-accent">노란선 자리 더블클릭</span> — Stich 경계 제거 (텍스트 병합)</div>
          <div><span className="text-accent">Shift+더블클릭</span> — Hemistich 경계 추가 (글자 스윕 분할)</div>
          <div><span className="text-accent">파란선 드래그</span> — Hemistich 경계 이동</div>
          <div><span className="text-accent">파란선 자리 더블클릭</span> — Hemistich 경계 제거 (텍스트 병합)</div>
          <div className="text-text-secondary">아래 목록에서 Hemistich 텍스트를 직접 편집 가능. Hemistich가 있으면 Stich 자막은 합으로 자동 유지.</div>
          <div><span className="text-accent">◀ ▶</span> — 단어를 이전/다음 Stich로 이동 (텍스트 비중 조절)</div>
          <div className="pt-1 border-t border-border mt-1 text-text-secondary">수정 후 <span className="text-green-400">타이밍 저장</span> 버튼으로 JSON 반영.</div>
        </div>
      )}
    </div>
  )
}

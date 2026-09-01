import { RATIOS, RatioId } from '../utils'

export function CardToolbar({
  view, selectView, safeGi, selectGroup, groups, safePi, selectPerson, people,
  ratioId, setRatioId, allRatios, setAllRatios, exportCurrent, exporting, exportGroup, cardsLength, ratioLabel
}: {
  view: 'person' | 'cluster' | 'group'
  selectView: (v: 'person' | 'cluster' | 'group') => void
  safeGi: number
  selectGroup: (gi: number) => void
  groups: any[]
  safePi: number
  selectPerson: (pi: number) => void
  people: any[]
  ratioId: RatioId
  setRatioId: (id: RatioId) => void
  allRatios: boolean
  setAllRatios: (v: boolean) => void
  exportCurrent: () => void
  exporting: boolean
  exportGroup: () => void
  cardsLength: number
  ratioLabel: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-text-secondary">카드뉴스 미리보기</span>
      {/* 보기 단위 — 개인(선택 인물 카드) / 그룹(그 인물이 속한 그룹 묶음) / 세력(소개 묶음: 표지+그룹샷 전부) */}
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-bg-card p-0.5">
        {([['person', '개인'], ['cluster', '그룹'], ['group', '세력']] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => selectView(v as 'person' | 'cluster' | 'group')}
            className={`rounded px-2 py-1 text-xs ${view === v ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {/* 세력 선택 */}
      <select
        value={safeGi}
        onChange={e => selectGroup(Number(e.target.value))}
        className="rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none"
        title="미리볼 세력"
      >
        {groups.map((gr, i) => (
          <option key={i} value={i}>{(gr.name ?? '').split('\n')[0] || `세력 ${i + 1}`}</option>
        ))}
      </select>
      {/* 인물 선택 — 표지·격자는 세력 전체, 물음표·대사는 이 인물 기준 */}
      <select
        value={safePi}
        onChange={e => selectPerson(Number(e.target.value))}
        disabled={!people.length || view === 'group'}
        className="rounded-md border border-border bg-bg-card px-2 py-1 text-xs focus:border-accent focus:outline-none disabled:opacity-40"
        title="물음표·대사 카드에 쓸 인물"
      >
        {people.length ? people.map((p: any, i: number) => (
          <option key={i} value={i}>{p.name || `인물 ${i + 1}`}</option>
        )) : <option>인물 없음</option>}
      </select>
      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-bg-card p-0.5">
          {RATIOS.map(rr => (
            <button
              key={rr.id}
              onClick={() => setRatioId(rr.id)}
              className={`rounded px-2 py-1 text-xs ${ratioId === rr.id ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
            >
              {rr.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-[11px] text-text-dim" title="켜면 4:5·3:4·1:1·9:16 네 비율을 한꺼번에 내보낸다">
          <input type="checkbox" checked={allRatios} onChange={e => setAllRatios(e.target.checked)} className="accent-accent" />
          전 비율 모두
        </label>
        <button
          onClick={exportCurrent}
          disabled={exporting}
          className="rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 disabled:opacity-50"
          title={`지금 보이는 카드 ${cardsLength}장을 ${allRatios ? '전 비율' : ratioLabel}(으)로 저장`}
        >
          {exporting ? '시작 중…' : `현재 카드 내보내기`}
        </button>
        <button
          onClick={exportGroup}
          disabled={exporting || !people.length}
          className="rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
          title={`이 세력 전체 인물(${people.length}명)의 카드 묶음을 ${allRatios ? '전 비율' : ratioLabel}(으)로 저장. 인물별 문구는 「문구 저장」한 것만 반영되고, 미저장 입력은 빠집니다(인물 데이터로 자동 폴백)`}
        >
          세력 전체 인물
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, Trash2, Eye, EyeOff } from './icons'
import type { FactionPerson, FactionTransition } from '@/lib/faction-types'
import { factionVoiceFile } from '@/lib/faction-voice'
import { imageSrc, initial } from './timing'
import { FactionImagePicker } from './FactionImagePicker'
import { FactionVoicePanel } from './FactionVoicePanel'
import { useFactionVoice } from './FactionVoiceContext'

type Props = {
  person: FactionPerson
  onChange: (next: FactionPerson) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  series: string
  episodeName: string
  /** 세력 인덱스 (0-based) — 음성 파일명 계산용 */
  groupIndex: number
  /** 묶음(또는 묶음 없을 때 세력) 내 로컬 인물 인덱스 (0-based) */
  personIndex: number
  /** 묶음 인덱스 (분할 세력) — 단일 모드면 미지정 */
  clusterIndex?: number
  /** 무소속 개인군 여부 — 파일명에 C 부착 여부 결정 */
  solo: boolean
}

export function FactionPersonRow({ person, onChange, onDelete, onMoveUp, onMoveDown, series, episodeName, groupIndex, personIndex, clusterIndex, solo }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  // 인물 행 접기 — 기본 접힘(목록 조망). 펼치면 전체 편집 폼.
  const [collapsed, setCollapsed] = useState(true)
  // imageChanges 항목별 이미지 선택 모달 — 편집 중 항목 인덱스(null=닫힘)
  const [imgChangeEdit, setImgChangeEdit] = useState<number | null>(null)
  const src = imageSrc(series, episodeName, person.image)
  const disabled = !!person.disabled
  const voice = useFactionVoice()

  // 단일 필드 갱신 헬퍼
  const set = (key: keyof FactionPerson, val: string) => onChange({ ...person, [key]: val })

  // 이 인물 음성 파일명 — 렌더 인덱싱(vnPersonQuote)과 동일 규칙
  const voiceFile = factionVoiceFile(groupIndex, personIndex, solo, clusterIndex)
  const hasQuote = !!(person.quoteChunks?.some(c => c.trim()) || person.quote?.trim())
  // 접힌 줄에 보여줄 처리 단계 배지·설명 요약
  const modeBadge = person.quoteMode
    ? ({ voice: '음성', text: '대사', credit: '직함', full: '통합' } as const)[person.quoteMode]
    : (hasQuote ? '자동' : '직함')
  const summary = person.lines?.filter(Boolean).join(' · ') || person.quote?.trim() || ''

  // 영상 제외(눈) 버튼 — 접힘·펼침 공용
  const eyeButton = (
    <button
      onClick={() => onChange({ ...person, disabled: disabled ? undefined : true })}
      className={`rounded-md border p-1.5 ${disabled ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
      title={disabled ? '이 인물을 다시 영상에 포함' : '이 인물을 영상에서 제외 (데이터는 보존)'}
    >
      {disabled ? <Eye size={15} /> : <EyeOff size={15} />}
    </button>
  )
  // 위/아래 이동 + 삭제 — 접힘·펼침 공용
  const moveDeleteButtons = (
    <>
      <button onClick={onMoveUp} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="위로">
        <ChevronUp size={15} />
      </button>
      <button onClick={onMoveDown} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-bg-hover" title="아래로">
        <ChevronDown size={15} />
      </button>
      <button onClick={onDelete} className="rounded-md border border-border p-1.5 text-danger-text hover:bg-danger" title="삭제">
        <Trash2 size={15} />
      </button>
    </>
  )
  const picker = pickerOpen && (
    <FactionImagePicker
      value={person.image}
      onChange={next => onChange({ ...person, image: next })}
      series={series}
      episodeName={episodeName}
      slug={person.slug}
      onClose={() => setPickerOpen(false)}
    />
  )
  // imageChanges 항목 이미지 선택 모달 — person.image 와 같은 picker, 대상만 해당 항목.
  const editIc = imgChangeEdit != null ? person.imageChanges?.[imgChangeEdit] : undefined
  const imgChangePicker = imgChangeEdit != null && editIc != null && (
    <FactionImagePicker
      value={editIc.image}
      onChange={next => {
        const list = [...(person.imageChanges ?? [])]
        list[imgChangeEdit] = { ...editIc, image: next ?? '' }
        onChange({ ...person, imageChanges: list })
      }}
      series={series}
      episodeName={episodeName}
      slug={person.slug}
      onClose={() => setImgChangeEdit(null)}
    />
  )

  return (
    <div
      className="rounded-md border border-border bg-bg-card"
      style={disabled ? { opacity: 0.5, filter: 'saturate(0.4)' } : undefined}
    >
      {/* 헤더 — 항상 보임. 헤더(빈 영역·이름)를 누르면 접기/펼치기 */}
      <div
        className="flex cursor-pointer items-center gap-2 p-2"
        onClick={() => setCollapsed(v => !v)}
        title={collapsed ? '펼쳐서 편집' : '접기'}
      >
        {/* 썸네일 — 클릭하면 이미지 변경(토글과 분리) */}
        <button onClick={e => { e.stopPropagation(); setPickerOpen(true) }} className="shrink-0 overflow-hidden rounded border border-border" title="이미지 변경">
          {src ? (
            <img src={src} alt="" className="h-14 w-11 object-cover" />
          ) : (
            <span className="flex h-14 w-11 items-center justify-center bg-bg-secondary text-base font-bold text-text-secondary">
              {initial(person.name)}
            </span>
          )}
        </button>
        {/* 이름 + 요약 + 처리 단계 */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-1.5">
            <span className="text-sm font-semibold">{person.name || '이름 없음'}</span>
            <span className="rounded bg-bg-secondary px-1 text-[9px] text-text-dim">{modeBadge}</span>
          </span>
          {summary && <span className="line-clamp-1 text-xs text-text-dim">{summary}</span>}
        </div>
        {/* 전환효과 — 헤더에서 바로 선택(헤더 클릭 토글과 분리) */}
        <select
          value={person.transition ?? ''}
          onChange={e => onChange({ ...person, transition: (e.target.value || undefined) as FactionTransition | undefined })}
          onClick={e => e.stopPropagation()}
          className="shrink-0 rounded-md border border-border bg-bg-card px-1.5 py-1 text-xs focus:border-accent focus:outline-none"
          title="이 인물 컷 전환효과 (세로 쇼츠)"
        >
          <option value="">전환: 세력·에피소드 따름</option>
          <option value="auto">자동 (번갈아)</option>
          <option value="zoomout">줌 아웃</option>
          <option value="zoomin">줌 인</option>
          <option value="kenburns">확대하며 위로 이동</option>
          <option value="slideLeft">슬라이드 (오른쪽에서 등장)</option>
          <option value="slideRight">슬라이드 (왼쪽에서 등장)</option>
          <option value="glitch">TV 지직거림</option>
          <option value="tear">찢기 (가운데 갈라짐)</option>
          <option value="crt">옛 TV 켜지듯</option>
          <option value="zoompunch">확 다가오기</option>
          <option value="whip">빠르게 스쳐 지나기</option>
          <option value="filmburn">필름 타들어가듯</option>
          <option value="pixelate">모자이크로 흩어지기</option>
          <option value="shutter">블라인드 열리기</option>
        </select>
        {/* 조작 — 헤더 클릭(토글)과 분리 */}
        <div className="flex shrink-0 items-center gap-1" onClick={e => e.stopPropagation()}>
          {eyeButton}
          {moveDeleteButtons}
        </div>
      </div>

      {/* 펼침 폼 — 헤더 아래로 자연스럽게 늘어난다(세로 균형 안정) */}
      {!collapsed && (
      <div className="flex min-w-0 flex-col gap-2 border-t border-border p-2">
        {/* 이름 + 이름(영문) — 라벨·값 수평 */}
        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs text-text-dim">이름 -</span>
          <input type="text" placeholder="이름" value={person.name} onChange={e => set('name', e.target.value)} className="min-w-0 flex-1 rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
          <span className="w-12 shrink-0 text-xs text-text-dim">(영문) -</span>
          <input type="text" placeholder="EN 이름" value={person.nameEn ?? ''} onChange={e => set('nameEn', e.target.value)} className="min-w-0 flex-1 rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none" />
        </div>
        {/* 수식어·설명 + 설명(영문) — 라벨·값 수평 */}
        <div className="flex items-start gap-2">
          <span className="w-24 shrink-0 pt-1.5 text-xs text-text-dim">수식어·설명 -</span>
          <textarea placeholder="줄바꿈으로 줄 구분" value={person.lines?.join('\n') ?? ''} onChange={e => onChange({ ...person, lines: e.target.value.split('\n') })} rows={3} className="min-w-0 flex-1 resize-none rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm leading-snug focus:border-accent focus:outline-none" />
          <span className="w-12 shrink-0 pt-1.5 text-xs text-text-dim">(영문) -</span>
          <textarea placeholder="EN 설명 (줄바꿈 구분)" value={person.linesEn?.join('\n') ?? ''} onChange={e => onChange({ ...person, linesEn: e.target.value.split('\n') })} rows={3} className="min-w-0 flex-1 resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs leading-snug text-text-secondary focus:border-accent focus:outline-none" />
        </div>
        {/* 한마디 대사 + 대사(영문) — 라벨·값 수평 */}
        <div className="flex items-start gap-2">
          <span className="w-24 shrink-0 pt-1.5 text-xs text-text-dim">한마디 대사 -</span>
          <textarea placeholder="줄바꿈으로 의미 덩어리 구분" value={person.quoteChunks?.join('\n') ?? person.quote ?? ''} onChange={e => { const ch = e.target.value.split('\n'); onChange({ ...person, quoteChunks: ch, quote: ch.map(s => s.trim()).filter(Boolean).join(' ') }) }} rows={4} className="min-w-0 flex-1 resize-none rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm italic leading-snug focus:border-accent focus:outline-none" />
          <span className="w-12 shrink-0 pt-1.5 text-xs text-text-dim">(영문) -</span>
          <textarea placeholder="EN 대사 (줄바꿈으로 덩어리)" value={person.quoteEnChunks?.join('\n') ?? person.quoteEn ?? ''} onChange={e => { const ch = e.target.value.split('\n'); onChange({ ...person, quoteEnChunks: ch, quoteEn: ch.map(s => s.trim()).filter(Boolean).join(' ') }) }} rows={4} className="min-w-0 flex-1 resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs italic leading-snug text-text-secondary focus:border-accent focus:outline-none" />
        </div>
        {/* 대사 중 사진 전환 — 특정 의미 덩어리부터 다른 사진으로 크로스페이드 */}
        <div className="flex items-start gap-2">
          <span className="w-24 shrink-0 pt-1.5 text-xs text-text-dim">사진 전환 -</span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {(person.imageChanges ?? []).map((ic, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <input
                  type="number" min={1} value={ic.chunk + 1}
                  onChange={e => { const list = [...(person.imageChanges ?? [])]; list[idx] = { ...list[idx], chunk: Math.max(0, Number(e.target.value) - 1) }; onChange({ ...person, imageChanges: list }) }}
                  onClick={e => e.stopPropagation()}
                  className="w-14 shrink-0 rounded-md border border-border bg-bg-main px-1.5 py-1 text-xs focus:border-accent focus:outline-none"
                  title="이 덩어리(번째)부터 아래 사진으로 전환"
                />
                <span className="shrink-0 text-[11px] text-text-dim">번째부터</span>
                <button type="button" onClick={e => { e.stopPropagation(); setImgChangeEdit(idx) }}
                  className="min-w-0 flex-1 truncate rounded-md border border-border bg-bg-main px-2 py-1 text-left text-xs hover:bg-bg-hover">
                  {ic.image || '이미지 선택…'}
                </button>
                <button type="button" onClick={e => { e.stopPropagation(); const list = (person.imageChanges ?? []).filter((_, i) => i !== idx); onChange({ ...person, imageChanges: list.length ? list : undefined }) }}
                  className="shrink-0 rounded-md border border-border p-1 text-danger-text hover:bg-danger" title="삭제">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button type="button"
              onClick={e => { e.stopPropagation(); onChange({ ...person, imageChanges: [...(person.imageChanges ?? []), { chunk: 0, image: '' }] }) }}
              className="self-start rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover">+ 사진 전환 추가</button>
            {!!person.quoteChunks?.length && (
              <span className="text-[10px] text-text-dim">의미 덩어리 {person.quoteChunks.length}개 — 1~{person.quoteChunks.length}번째 중 어디서 바꿀지 지정</span>
            )}
          </div>
        </div>
        {/* 대사 원문 — 라벨·값 수평 */}
        <div className="flex items-start gap-2">
          <span className="w-24 shrink-0 pt-1.5 text-xs text-text-dim">대사 원문 -</span>
          <textarea placeholder="실제 발언 영어 원문" value={person.quoteOrigin ?? ''} onChange={e => set('quoteOrigin', e.target.value)} rows={2} className="min-w-0 flex-1 resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1.5 text-xs italic leading-snug text-text-secondary focus:border-accent focus:outline-none" />
        </div>
        {/* 소속 — 라벨·값 수평 */}
        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs text-text-dim">소속 -</span>
          <input type="text" placeholder="소속" value={person.org ?? ''} onChange={e => set('org', e.target.value)} className="min-w-0 flex-1 rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm focus:border-accent focus:outline-none" />
        </div>

        {/* 전환효과는 헤더에서 선택한다 */}

        {/* 대사 처리 단계 — voice(음성+파형) / text(대사만) / credit(직함만) / full(직함 다 보여준 뒤 음성+대사) / 자동(수장=voice·나머지=text) */}
        <div className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs text-text-dim">대사 처리 -</span>
          <div className="flex flex-1 gap-1">
            {([
              { v: undefined, l: '자동' },
              { v: 'voice', l: '음성' },
              { v: 'text', l: '대사만' },
              { v: 'credit', l: '직함만' },
              { v: 'full', l: '통합' },
            ] as const).map(o => (
              <button
                key={o.l}
                type="button"
                onClick={() => onChange({ ...person, quoteMode: o.v })}
                className={`flex-1 rounded-md border px-2 py-1 text-xs ${person.quoteMode === o.v ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:bg-bg-hover'}`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {/* 대사 음성 — 북리커맨드 음성 패널 통복제(저장·트림·생성·미리듣기 일체) (대사가 있을 때만 노출) */}
        {voice && hasQuote && (
          <FactionVoicePanel
            person={person}
            onChange={onChange}
            series={series}
            episodeName={episodeName}
            voiceFile={voiceFile}
            hasQuote={hasQuote}
          />
        )}
      </div>
      )}

      {picker}
      {imgChangePicker}
    </div>
  )
}

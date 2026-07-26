'use client'

/**
 * 세력도 화면의 공용 표 부품 — 영상 편 표와 도감 테마 표가 같이 쓴다.
 *
 * 두 목록이 카드와 줄로 따로 놀아 한 화면에서 서로 다른 물건처럼 보이던 것을 하나로 맞췄다.
 * 머리줄·행·배지·손 올렸을 때의 반응을 여기서만 정한다.
 *
 * 손 올림 반응은 색 강조 하나를 지연 없이 즉시 준다(`hover:bg-white/5`). 이 축에는
 * `transition` 을 걸지 않는다 — 곁들이는 연출을 붙일 때만 다른 요소에 따로 건다.
 */

import type { CSSProperties, ReactNode } from 'react'

export interface FactionTableColumn {
  key: string
  header: ReactNode
  /** 열 너비 (예: '8rem'). 비우면 내용에 맞춘다 */
  width?: string
  align?: 'left' | 'center' | 'right'
}

const ALIGN: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

/**
 * 표 껍데기 — 좁은 화면에서는 표 안에서만 옆으로 밀린다.
 * 페이지 전체가 가로로 밀리면 다른 화면까지 흔들리므로 스크롤을 이 안에 가둔다.
 */
export function FactionTable({
  columns,
  children,
}: {
  columns: FactionTableColumn[]
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem]">
          <thead className="bg-bg-secondary">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={`whitespace-nowrap px-3 py-2.5 text-xs font-medium text-text-secondary ${ALIGN[col.align ?? 'left']}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

/** 행의 결 — 보통 줄 / 아래에 테마를 거느린 묶음 머리 / 묶음에 속한 줄 */
export type FactionRowTone = 'default' | 'group' | 'child'

const TONE: Record<FactionRowTone, string> = {
  default: '',
  group: 'bg-bg-secondary/50 font-semibold',
  child: '',
}

/**
 * 표의 한 줄.
 *
 * `onOpen` 을 주면 줄 어디를 눌러도 열린다. 단 줄 안의 버튼·선택창·확인칸·링크를 누른 것은
 * 열기가 아니므로 걸러낸다 — 상태를 바꾸려다 화면이 넘어가 버리는 사고를 막는다.
 */
export function FactionTableRow({
  tone = 'default',
  dragging = false,
  onOpen,
  draggable,
  onDragStart,
  onDragOver,
  onDragEnd,
  children,
}: {
  tone?: FactionRowTone
  dragging?: boolean
  onOpen?: () => void
  draggable?: boolean
  onDragStart?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDragEnd?: () => void
  children: ReactNode
}) {
  const handleClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    if (!onOpen) return
    if ((e.target as HTMLElement).closest('a,button,input,select,textarea,label')) return
    onOpen()
  }

  return (
    <tr
      onClick={handleClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`group ${TONE[tone]} ${onOpen ? 'cursor-pointer' : ''} hover:bg-white/5 ${dragging ? 'opacity-50' : ''}`}
    >
      {children}
    </tr>
  )
}

export function FactionTableCell({
  align = 'left',
  className = '',
  colSpan,
  style,
  children,
}: {
  align?: 'left' | 'center' | 'right'
  className?: string
  colSpan?: number
  style?: CSSProperties
  children?: ReactNode
}) {
  return (
    <td colSpan={colSpan} style={style} className={`px-3 py-2.5 text-sm ${ALIGN[align]} ${className}`}>
      {children}
    </td>
  )
}

/**
 * 표 안의 구분 줄 — 묶음 머리와 같은 문법(굵게·바탕 살짝 다르게)으로 아래 묶음의 성격을 알린다.
 * 표를 둘로 쪼개지 않고 한 표 안에서 갈래를 나누는 자리다.
 */
export function FactionTableSection({
  colSpan,
  title,
  note,
}: {
  colSpan: number
  title: ReactNode
  note?: ReactNode
}) {
  return (
    <tr className="bg-bg-secondary/50">
      <td colSpan={colSpan} className="px-3 py-2">
        <span className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold text-text-primary">{title}</span>
          {note && <span className="text-xs text-text-secondary">{note}</span>}
        </span>
      </td>
    </tr>
  )
}

/** 아무것도 없을 때의 한 줄 */
export function FactionTableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-12 text-center text-sm text-text-secondary">
        {children}
      </td>
    </tr>
  )
}

/**
 * 표 안의 작은 표시.
 * `color` 를 주면 그 색으로 물들이고(테마 고유색), 없으면 `className` 이 정한 결을 쓴다.
 */
export function FactionTableBadge({
  color,
  icon,
  title,
  className = 'bg-white/5 text-text-secondary',
  children,
}: {
  color?: string
  icon?: ReactNode
  title?: string
  className?: string
  children: ReactNode
}) {
  return (
    <span
      title={title}
      style={color ? { backgroundColor: `${color}20`, color } : undefined}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium ${color ? '' : className}`}
    >
      {icon}
      {children}
    </span>
  )
}

/** 숫자 칸 — 0 이면 흐리게 해서 "채워야 할 자리"가 눈에 띄게 한다 */
export function FactionTableCount({ value, icon, title }: { value: number; icon?: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 text-sm tabular-nums ${value === 0 ? 'text-text-secondary opacity-40' : 'text-text-primary'}`}
    >
      {icon}
      {value}
    </span>
  )
}

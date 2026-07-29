'use client'

import React, { useState } from 'react'

interface EditorPanelProps {
  title?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  collapsible?: boolean
  defaultExpanded?: boolean
  summaryNode?: React.ReactNode
  /** 지정 시 우측 상단 아이콘이 이 동작을 실행하는 버튼이 된다(collapsible 미사용 패널 전용). */
  onIconClick?: () => void
  /** onIconClick 버튼의 툴팁. */
  iconTitle?: string
  /** 섹션 구분색(rgb 삼원색 문자열, 예: "16,185,129"). 지정 시 패널 배경·테두리를 이 색으로 덮어
   *  타입별 기본 테마(파랑·금색 등)를 끄고 섹션 색으로 통일한다. */
  tintColor?: string
}

export function EditorPanel({
  title,
  icon,
  children,
  className = '',
  contentClassName = 'p-3',
  collapsible = false,
  defaultExpanded = true,
  summaryNode,
  onIconClick,
  iconTitle,
  tintColor,
}: EditorPanelProps) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(defaultExpanded)

  // 섹션 구분색 지정 시 — 타입별 기본 테마 대신 섹션 색으로 배경·테두리를 통일한다.
  const tintStyle: React.CSSProperties | undefined = tintColor
    ? { backgroundColor: `rgba(${tintColor},0.07)`, borderColor: `rgba(${tintColor},0.45)` }
    : undefined

  // 섹션 타이틀별 가시성(구분감) 극대화를 위한 프리미엄 테마 변수 매핑
  const lowerTitle = (title ?? '').toLowerCase()
  let themeStyles = 'border-border bg-bg-card'

  if (lowerTitle.includes('visual') || lowerTitle.includes('비주얼')) {
    // 비주얼 트랙: 블루/하늘색 톤의 고대비 맑은 라이트 테마
    themeStyles = 'border-sky-400 bg-sky-50 shadow-xs'
  } else if (lowerTitle.includes('script') || lowerTitle.includes('스크립트') || lowerTitle.includes('대본')) {
    // 스크립트 에디터: 골드/옐로우 톤의 고대비 맑은 라이트 테마
    themeStyles = 'border-amber-400 bg-amber-50 shadow-xs'
  } else if (lowerTitle.includes('voice') || lowerTitle.includes('음성')) {
    // 음성 제어판: 에메랄드/그린 톤의 고대비 맑은 라이트 테마
    themeStyles = 'border-emerald-400 bg-emerald-50 shadow-xs'
  } else if (lowerTitle.includes('toolbox') || lowerTitle.includes('도구') || lowerTitle.includes('summary') || lowerTitle.includes('요약')) {
    // 도구모음 / 요약: 퍼플/자줏빛 톤의 고대비 맑은 라이트 테마
    themeStyles = 'border-purple-400 bg-purple-50 shadow-xs'
  } else if (lowerTitle.includes('intro') || lowerTitle.includes('인트로')) {
    // 인트로 대형 패널
    themeStyles = 'border-accent/60 bg-bg-card shadow-xs'
  } else if (lowerTitle.includes('main') || lowerTitle.includes('본편')) {
    // 본편 대형 패널
    themeStyles = 'border-border bg-bg-card shadow-xs'
  }

  return (
    <div
      style={tintStyle}
      className={`relative rounded-md border ${tintColor ? 'shadow-xs' : themeStyles} ${!expanded ? 'h-[26px] overflow-hidden !mb-1' : 'mb-2.5 overflow-visible'} ${className}`}
    >
      
      {/* ── 펼침 상태 (expanded) 디자인 ── */}
      {expanded ? (
        <>
          {/* 접기 버튼 (좌측 상단). icon 이 있으면 우측 아이콘이 토글을 겸하므로 생략 */}
          {collapsible && !icon && (
            <div className="absolute top-1.5 left-1.5 z-10 flex items-center">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-text-primary hover:text-accent w-5 h-5 flex items-center justify-center rounded hover:bg-bg-hover focus:outline-none font-bold"
                title="접기"
              >
                <span className="text-[8px] rotate-90 inline-block">▶</span>
              </button>
            </div>
          )}

          {/* 아이콘만 맨 우측열(우측 끝)로 플로팅 배치 (기획 의도 복구, 세로 공간 점유 0) */}
          <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1.5 select-none">
            {summaryNode && (
              <div className="text-xs font-black text-accent font-extrabold px-1.5 py-0.5 rounded bg-bg-secondary flex items-center mr-1 shadow-xs border border-slate-300">
                {summaryNode}
              </div>
            )}
            {icon && (
              collapsible ? (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="text-text-primary hover:text-accent hover:bg-bg-hover rounded p-0.5 flex items-center justify-center w-5 h-5 focus:outline-none cursor-pointer"
                  title="접기"
                >
                  <span className="flex items-center [&>svg]:w-3.5 [&>svg]:h-3.5 opacity-90 hover:opacity-100">{icon}</span>
                </button>
              ) : onIconClick ? (
                <button
                  type="button"
                  onClick={onIconClick}
                  className="text-purple-700 hover:text-white hover:bg-purple-600 ring-1 ring-purple-300 rounded p-0.5 flex items-center justify-center w-5 h-5 focus:outline-none cursor-pointer"
                  title={iconTitle ?? title}
                >
                  <span className="flex items-center [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>
                </button>
              ) : (
                <div
                  className="text-text-primary p-0.5 flex items-center justify-center w-5 h-5"
                  title={title}
                >
                  <span className="flex items-center [&>svg]:w-3.5 [&>svg]:h-3.5 opacity-90 hover:opacity-100">{icon}</span>
                </div>
              )
            )}
          </div>
        </>
      ) : (
        /* ── 접힘 상태 (!expanded) 디자인 ── */
        <>
          {/* 아코디언 토글 및 접힘 상태 타이틀 (좌측) */}
          <div className="absolute top-1 left-1.5 z-10 flex items-center h-5">
            {collapsible && !icon && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-text-primary hover:text-accent w-5 h-5 flex items-center justify-center rounded bg-bg-secondary hover:bg-bg-hover focus:outline-none font-bold"
                title="펼치기"
              >
                <span className="text-xs font-black">▶</span>
              </button>
            )}
            {title && (
              <span className="text-xs font-bold font-black text-text-primary select-none px-1.5">
                {title}
              </span>
            )}
          </div>

          {/* 우측 도구 툴바 */}
          <div className="absolute top-1 right-1.5 z-10 flex items-center gap-1.5 h-5 select-none">
            {summaryNode && (
              <div className="text-xs font-black text-accent font-extrabold px-1.5 flex items-center">
                {summaryNode}
              </div>
            )}
            {title && (
              <div className="relative flex items-center h-full" onMouseLeave={() => setOpen(false)}>
                {open && (
                  <div className="absolute right-6 top-0 whitespace-nowrap bg-bg-secondary border border-slate-400 shadow-xs rounded px-2 py-0.5 text-xs font-black font-bold text-accent mr-1 z-20 pointer-events-none">
                    {title}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { if (collapsible) setExpanded(true); else setOpen(!open) }}
                  onMouseEnter={() => setOpen(true)}
                  className="text-text-primary hover:text-accent p-1 bg-bg-secondary hover:bg-bg-hover rounded focus:outline-none flex items-center justify-center w-5 h-5"
                  title={title}
                >
                  {icon ? (
                    <span className="flex items-center [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01"/></svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── 본문 영역 ── */}
      <div 
        className={`
          ${contentClassName} 
          ${!expanded ? 'hidden' : ''}
          ${expanded ? (collapsible ? 'pl-6.5 pt-1.5 pr-8 pb-1.5' : 'pt-1.5 pr-8 pb-1.5') : ''} 
        `}
      >
        {children}
      </div>
    </div>
  )
}

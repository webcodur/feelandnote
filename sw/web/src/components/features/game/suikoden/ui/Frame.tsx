/*
  천도 v2 — 공용 틀: 금선 네 귀가 있는 판, 버튼, 작은 표지들.
  hover는 색·테두리가 즉시 바뀐다(transition 없음). 공간이 열리는 것만 애니메이션을 쓴다.
*/
'use client'

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { setGameMusicSlot } from '@/components/layout/musicPlayerSlots'
import { cn } from '@/lib/utils'
import { INK } from './theme'

function Corners({ color = 'rgba(212,175,55,0.6)' }: { color?: string }) {
  const base = 'pointer-events-none absolute h-2.5 w-2.5'
  const style = { borderColor: color }
  return (
    <>
      <span aria-hidden className={cn(base, '-left-px -top-px border-l border-t')} style={style} />
      <span aria-hidden className={cn(base, '-right-px -top-px border-r border-t')} style={style} />
      <span aria-hidden className={cn(base, '-bottom-px -left-px border-b border-l')} style={style} />
      <span aria-hidden className={cn(base, '-bottom-px -right-px border-b border-r')} style={style} />
    </>
  )
}

interface PanelProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  corners?: boolean
  as?: 'div' | 'section' | 'aside'
}

export function Panel({ children, className, style, corners = true, as = 'div' }: PanelProps) {
  const Tag = as
  return (
    <Tag
      className={cn('relative border backdrop-blur-md', className)}
      style={{ background: INK.panel, borderColor: INK.line, boxShadow: '0 24px 60px -28px rgba(0,0,0,0.9)', ...style }}
    >
      {corners && <Corners />}
      {children}
    </Tag>
  )
}

type Variant = 'primary' | 'ghost' | 'danger' | 'quiet' | 'jade'

const VARIANT: Record<Variant, string> = {
  primary: 'border-[#d4af37] bg-[#d4af37] text-[#14110a] hover:bg-[#f3d57a] hover:border-[#f3d57a]',
  ghost: 'border-[#d4af37]/30 bg-white/[0.03] text-[#ece6d6] hover:border-[#d4af37]/80 hover:text-[#f3d57a] hover:bg-[#d4af37]/10',
  danger: 'border-[#c8452d]/70 bg-[#c8452d]/15 text-[#ffd9cf] hover:bg-[#c8452d]/35 hover:border-[#e2583c]',
  quiet: 'border-transparent bg-transparent text-[#a8a293] hover:text-[#f3d57a] hover:bg-white/[0.05]',
  jade: 'border-[#3fb9a5]/60 bg-[#3fb9a5]/15 text-[#c9f1ea] hover:bg-[#3fb9a5]/30 hover:border-[#3fb9a5]',
}

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
}

export function GameButton({ variant = 'ghost', size = 'md', className, children, ...rest }: GameButtonProps) {
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' }
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 border font-semibold tracking-tight',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-inherit',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d57a]',
        sizes[size],
        VARIANT[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}

/** 판 제목 줄 */
export function PanelTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: INK.line }}>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-extrabold tracking-tight" style={{ color: INK.text }}>{title}</h2>
        {sub && <p className="truncate text-[11px]" style={{ color: INK.sub }}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}

/** 가로 막대 — 값/최대 */
export function Meter({ value, max, color = INK.gold, className, height = 6 }: { value: number; max: number; color?: string; className?: string; height?: number }) {
  const rate = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <div className={cn('relative w-full overflow-hidden bg-white/[0.07]', className)} style={{ height }}>
      <div className="absolute inset-y-0 left-0 transition-[width] duration-300 ease-out" style={{ width: `${rate * 100}%`, background: color }} />
    </div>
  )
}

/** 인주 도장 — 세력 표지 */
export function Seal({ color, text, size = 28, className }: { color: string; text: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-grid shrink-0 place-items-center font-black leading-none', className)}
      style={{
        width: size, height: size, fontSize: Math.round(size * 0.52), color: '#140c08',
        background: color, boxShadow: `inset 0 0 0 2px rgba(0,0,0,0.25), 0 0 0 1px ${color}`,
        borderRadius: 3,
      }}
    >
      {text.slice(0, 1)}
    </span>
  )
}

/** 단축키 표지. 금빛 단추처럼 밝은 바탕 위에서는 onLight로 어두운 먹을 쓴다 */
export function Kbd({ children, onLight }: { children: ReactNode; onLight?: boolean }) {
  const tone = onLight ? 'border-[#14110a]/30 bg-[#14110a]/10 text-[#14110a]/80' : 'border-white/15 bg-white/[0.06] text-[#a8a293]'
  return (
    <kbd className={`rounded-[3px] border px-1.5 py-0.5 font-sans text-[10px] font-semibold ${tone}`}>
      {children}
    </kbd>
  )
}

/** 작은 알약 표지 */
export function Chip({ active, onClick, children, className, title }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold',
        active
          ? 'border-[#d4af37] bg-[#d4af37]/15 text-[#f3d57a]'
          : 'border-white/10 bg-white/[0.03] text-[#a8a293] hover:border-[#d4af37]/50 hover:text-[#ece6d6]',
        className,
      )}
    >
      {children}
    </button>
  )
}

/**
 * 사이트 음악 재생기 단추가 들어올 머리줄 칸. 칸이 없으면 단추가 게임 화면 위에 떠서 내용을 가린다.
 * 한 화면에 하나만 둔다. 재생기가 없는 자리에서는 빈 칸이라 숨는다(empty).
 */
export function MusicSlot({ className }: { className?: string }) {
  return (
    <span
      ref={setGameMusicSlot}
      data-music-slot
      className={cn('grid h-9 w-9 shrink-0 place-items-center border border-transparent text-[#a8a293] empty:hidden hover:border-[#d4af37]/40 hover:bg-white/[0.04] hover:text-[#f3d57a]', className)}
    />
  )
}

'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const IMAGE_MODES = [{ value: 'avatar', label: '아바타' }, { value: 'portrait', label: '대표사진' }] as const

export default function CelebCardImageToggle({ imageMode }: { imageMode: 'avatar' | 'portrait' }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <nav aria-label="카드 사진 선택" className="flex items-center gap-1 border-b border-border px-3 py-2 md:px-5">
      {IMAGE_MODES.map(({ value, label }) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === 'portrait') params.set('cardImage', value)
        else params.delete('cardImage')
        const query = params.toString()
        return (
          <Link
            key={value}
            href={query ? `${pathname}?${query}` : pathname}
            scroll={false}
            prefetch={false}
            aria-current={imageMode === value ? 'true' : undefined}
            className={`inline-flex min-h-11 items-center rounded-md px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent ${imageMode === value ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-white/5 hover:text-accent'}`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

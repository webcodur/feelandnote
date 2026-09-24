import type { RefObject } from 'react'

export default function MusicHarpIcon({ iconRef }: { iconRef: RefObject<SVGSVGElement | null> }) {
  return (
    <svg ref={iconRef} width="27" height="27" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M7.5 27V9.5c0-3.4 1.4-5.1 4.1-5.1 4.4 0 8.5 2 13 5.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24.6 10c-.7 8.3-4.1 13.9-9.9 17H7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 8.4v16.5m3-16.1V24m3-14.3v12.5m3-11.4v8.3" stroke="currentColor" strokeOpacity=".8" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M5.7 27.3h19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8.1 8.7c.3-2.2 1.3-3.3 3.1-3.5" stroke="#fff0bf" strokeOpacity=".75" strokeWidth="1" strokeLinecap="round" />
      <circle cx="24.4" cy="10" r="1.4" fill="currentColor" />
    </svg>
  )
}

// 인라인 SVG 아이콘 — 외부 아이콘 패키지 미설치 환경 대응. lucide와 동일한 24 그리드.

type IconProps = { size?: number; className?: string }

function Svg({ size = 16, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function ChevronUp(p: IconProps) {
  return <Svg {...p}><path d="m18 15-6-6-6 6" /></Svg>
}

export function ChevronDown(p: IconProps) {
  return <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>
}

export function ChevronLeft(p: IconProps) {
  return <Svg {...p}><path d="m15 18-6-6 6-6" /></Svg>
}

export function ChevronRight(p: IconProps) {
  return <Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>
}

export function X(p: IconProps) {
  return <Svg {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>
}

// 접기/펼치기 전용 — 이동 버튼(단일 꺾쇠)과 구분되는 이중 꺾쇠
export function ChevronsUpDown(p: IconProps) {
  return <Svg {...p}><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></Svg>
}

export function ChevronsDownUp(p: IconProps) {
  return <Svg {...p}><path d="m7 20 5-5 5 5" /><path d="m7 4 5 5 5-5" /></Svg>
}

export function Trash2(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </Svg>
  )
}

export function ImageIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </Svg>
  )
}

export function Plus(p: IconProps) {
  return <Svg {...p}><path d="M5 12h14" /><path d="M12 5v14" /></Svg>
}

export function Copy(p: IconProps) {
  return (
    <Svg {...p}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Svg>
  )
}

export function Search(p: IconProps) {
  return <Svg {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></Svg>
}

export function UserPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </Svg>
  )
}

export function Save(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </Svg>
  )
}

export function Eye(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}

export function EyeOff(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </Svg>
  )
}

export function Upload(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </Svg>
  )
}

export function FolderOpen(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
    </Svg>
  )
}

export function Play(p: IconProps) {
  return <Svg {...p}><polygon points="6 3 20 12 6 21 6 3" /></Svg>
}

export function Pause(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </Svg>
  )
}

export function Mic(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </Svg>
  )
}

export function Loader(p: IconProps) {
  return (
    <Svg {...p} className={`animate-spin${p.className ? ' ' + p.className : ''}`}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </Svg>
  )
}

export function Film(p: IconProps) {
  return (
    <Svg {...p}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18" />
      <path d="M3 7.5h4" />
      <path d="M3 12h18" />
      <path d="M3 16.5h4" />
      <path d="M17 3v18" />
      <path d="M17 7.5h4" />
      <path d="M17 16.5h4" />
    </Svg>
  )
}

export function Pencil(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </Svg>
  )
}

export function ArrowRightLeft(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m16 3 4 4-4 4" />
      <path d="M20 7H4" />
      <path d="m8 21-4-4 4-4" />
      <path d="M4 17h16" />
    </Svg>
  )
}


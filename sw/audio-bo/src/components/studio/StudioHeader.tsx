import { Disc3 } from 'lucide-react'

export function StudioHeader({ jobCount }: { jobCount: number }) {
  return (
    <header className="border-b border-line bg-ink/95">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 md:px-7">
        <div className="flex items-center gap-3">
          <Disc3 className="text-signal" />
          <div><p className="font-display text-xl">VOICE FORGE</p><p className="text-sm text-muted">나만의 목소리 작업실</p></div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted">
          <span className="hidden md:inline">모든 자료는 D드라이브에 저장됩니다</span>
          <span className="flex items-center gap-2 text-live"><i className="size-2 rounded-full bg-live" />작동 중</span>
          <span>{jobCount}개 작업</span>
        </div>
      </div>
    </header>
  )
}

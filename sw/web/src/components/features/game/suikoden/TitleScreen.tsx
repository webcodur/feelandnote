'use client'

export default function TitleScreen({ characterCount, onStart }: { characterCount: number; onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      {/* 타이틀 */}
      <div className="mb-12">
        <div className="text-6xl sm:text-8xl font-black tracking-tighter bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 bg-clip-text text-transparent font-serif">
          天導
        </div>
        <p className="text-stone-400 text-sm mt-3 tracking-[0.5em]">CHEONDO</p>
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-auto mt-4" />
        <p className="text-stone-500 text-xs mt-4">셀럽 전략 시뮬레이션</p>
      </div>

      {/* 인물 수 표시 */}
      <div className="mb-8 px-4 py-2 border border-stone-700 rounded text-stone-400 text-sm">
        <span className="text-amber-400 font-bold">{characterCount}</span>명의 역사적 인물이 대기 중
      </div>

      {/* 시작 버튼 */}
      <button
        onClick={onStart}
        className="group relative px-12 py-4 bg-stone-800 border border-amber-500/30 rounded hover:border-amber-400/60 transition-all duration-300"
      >
        <span className="text-amber-300 font-bold tracking-wider group-hover:text-amber-200 transition-colors">
          게임 시작
        </span>
        <div className="absolute inset-0 bg-amber-500/5 rounded group-hover:bg-amber-500/10 transition-colors" />
      </button>

      {/* 안내 */}
      <p className="text-stone-600 text-xs mt-8 max-w-xs leading-relaxed">
        역사 속 인물들을 이끌고 세력을 키워 문명을 통일하라.
        <br />수호전 천도 108성에서 영감을 받은 전략 시뮬레이션.
      </p>
    </div>
  )
}

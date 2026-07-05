'use client'

// ── 일괄 생성 도구 ──

type GenerateToolsSectionProps = {
  series: string
  name: string
  engine: string
  setEngine: (v: string) => void
  role: string
  setRole: (v: string) => void
  only: string
  setOnly: (v: string) => void
  thenAlign: boolean
  setThenAlign: (v: boolean) => void
  hasShorts: boolean
  post: (url: string, body: unknown) => Promise<void>
}

export function GenerateToolsSection({
  series, name, engine, setEngine, role, setRole, only, setOnly, thenAlign, setThenAlign, hasShorts, post,
}: GenerateToolsSectionProps) {
  // 「정렬까지 수행」은 특정 대상(only)이 지정됐을 때만 의미가 있다 (정렬은 단일 스코프만 받음)
  const alignEnabled = !!only.trim()
  const align = alignEnabled && thenAlign

  return (
    <div className="space-y-2">
      <div className="text-[12px] text-slate-900 font-black">일괄 생성 도구</div>

      <div className="bg-bg-main border border-border/60 rounded p-2 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select value={engine} onChange={e => setEngine(e.target.value)}
            title="일괄 생성 모델. Gemini 3.1은 audio tag 지원·단가 2배. 둘 다 GEM 슬롯에 저장된다."
            className="bg-white border border-slate-300 text-slate-950 font-black rounded px-2.5 py-1 text-xs outline-none focus:border-accent transition-colors shadow-sm cursor-pointer">
            <option value="gemini">GEM 2.5</option>
            <option value="gemini-v3">GEM 3.1</option>
          </select>
          <select value={role} onChange={e => setRole(e.target.value)}
            className="bg-white border border-slate-300 text-slate-950 font-black rounded px-2.5 py-1 text-xs outline-none focus:border-accent transition-colors shadow-sm cursor-pointer">
            <option value="">모든 화자</option>
            <option value="narrator">나레이터</option>
            <option value="summary">요약맨</option>
            <option value="celeb">셀럽</option>
          </select>
          <input placeholder="특정 대상 ID (예: book-0-title)" value={only} onChange={e => setOnly(e.target.value)}
            className="bg-white border border-slate-300 text-slate-950 font-bold rounded px-2.5 py-1 text-xs w-48 outline-none focus:border-accent placeholder:text-slate-400 transition-colors shadow-sm" />
          <label
            title={alignEnabled
              ? '생성 직후 받아쓰기·발화시각 정렬(3·4단계)을 같은 작업으로 이어 실행합니다. 자막 분할(5단계)은 건드리지 않아 기존 분할이 유지됩니다.'
              : '특정 대상 ID를 입력해야 정렬을 이어 실행할 수 있습니다 (정렬은 한 번에 하나의 대상만 처리).'}
            className={`flex items-center gap-1.5 text-xs font-black select-none ${alignEnabled ? 'text-slate-900 cursor-pointer' : 'text-slate-400 cursor-not-allowed'}`}>
            <input type="checkbox" checked={align} disabled={!alignEnabled}
              onChange={e => setThenAlign(e.target.checked)}
              className="accent-accent cursor-pointer disabled:cursor-not-allowed" />
            정렬까지 (3·4단계)
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: role || undefined, only: only || undefined, thenAlign: align })}
            className="px-3 py-1.5 rounded text-xs font-black bg-accent text-white hover:bg-accent-hover transition-colors shadow-sm">
            전체 생성
          </button>
          <button
            onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: role || undefined, only: only || undefined, force: false, thenAlign: align })}
            className="px-3 py-1.5 rounded text-xs font-black bg-white border border-slate-300 text-slate-900 hover:border-accent hover:text-accent hover:bg-slate-50 transition-colors shadow-sm">
            누락분만 생성
          </button>
          {hasShorts && (
            <button
              onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: 'shorts', only: only || undefined, thenAlign: align })}
              className="px-3 py-1.5 rounded text-xs font-black bg-white border border-slate-300 text-slate-900 hover:border-accent hover:text-accent hover:bg-slate-50 transition-colors shadow-sm">
              쇼츠 음성
            </button>
          )}
          <button
            onClick={() => { if (confirm('이 에피소드의 모든 음성(GEM·ELE)을 같은 음량으로 균일화합니다. 원본은 .raw 에 백업됩니다. 진행할까요?')) post(`/api/${series}/voice/generate`, { episode: name, normalizeOnly: true }) }}
            title="모든 대사 음성(ElevenLabs 포함)을 같은 라우드니스(-17 LUFS)로 일괄 균일화 (생성 없이 정규화만)"
            className="px-3 py-1.5 rounded text-xs font-black bg-white border border-slate-300 text-slate-900 hover:border-accent hover:text-accent hover:bg-slate-50 transition-colors shadow-sm">
            음량 균일화
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-600 font-bold leading-relaxed px-1">
        선택한 옵션에 따라 TTS 음성을 일괄 생성합니다. 셀럽의 고품질 음성은 각 행의 설정에서 ELE를 통해 개별 생성하는 것을 권장합니다.
        ELE 음원은 저장 시 자동으로 음량이 맞춰지며, 기존 음원은 「음량 균일화」로 한 번에 맞출 수 있습니다.
      </p>
    </div>
  )
}

'use client'

export type SpeakerEngine = 'gemini' | 'elevenlabs'

const TITLES: Record<SpeakerEngine, string> = {
  gemini: 'Gemini 엔진',
  elevenlabs: 'ElevenLabs 엔진',
}

const ACTIVE_CLASS: Record<SpeakerEngine, string> = {
  gemini: 'bg-blue-500/30 text-blue-200',
  elevenlabs: 'bg-purple-500/30 text-purple-200',
}

/** GEM · ELE 두 버튼으로 음성 엔진을 즉시 전환한다. */
export function SpeakerEngineToggle({
  engine,
  onChange,
  titles,
}: {
  engine: SpeakerEngine
  onChange: (next: SpeakerEngine) => void
  titles?: Partial<Record<SpeakerEngine, string>>
}) {
  const resolvedTitles = { ...TITLES, ...titles }

  const button = (value: SpeakerEngine, label: string) => (
    <button
      type="button"
      aria-pressed={engine === value}
      onClick={() => onChange(value)}
      title={resolvedTitles[value]}
      className={`cursor-pointer px-2 py-1 text-sm font-bold ${
        engine === value ? ACTIVE_CLASS[value] : 'text-text-dim hover:bg-white/5 hover:text-text-secondary'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex items-center gap-0.5 overflow-hidden rounded border border-border/40 bg-bg-card">
      {button('gemini', 'GEM')}
      {button('elevenlabs', 'ELE')}
    </div>
  )
}

'use client'

import { createContext, useContext, useState } from 'react'

export type LangMode = 'ko' | 'en' | 'both'

const LangModeContext = createContext<LangMode>('both')

export function useLangMode() {
  return useContext(LangModeContext)
}

const OPTIONS: { value: LangMode; label: string }[] = [
  { value: 'ko', label: '국문' },
  { value: 'en', label: '영문' },
  { value: 'both', label: '통합' },
]

export function LangModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<LangMode>('both')

  return (
    <LangModeContext.Provider value={mode}>
      <div className="inline-flex rounded-lg border border-border overflow-hidden">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setMode(opt.value)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === opt.value
                ? 'bg-accent/20 text-accent'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {children}
    </LangModeContext.Provider>
  )
}

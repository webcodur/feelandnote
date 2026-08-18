'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

export type LangMode = 'ko' | 'en' | 'both'

const LangModeContext = createContext<LangMode>('ko')
const SetLangModeContext = createContext<(mode: LangMode) => void>(() => {})

export function useLangMode() {
  return useContext(LangModeContext)
}

const OPTIONS: { value: LangMode; label: string }[] = [
  { value: 'ko', label: '국문' },
  { value: 'en', label: '영문' },
  { value: 'both', label: '통합' },
]

export function LangModeSwitch() {
  const mode = useLangMode()
  const setMode = useContext(SetLangModeContext)

  return (
    <div className="inline-flex rounded-lg border border-border overflow-hidden">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setMode(opt.value)}
          className={`px-4 py-1.5 text-sm font-medium ${
            mode === opt.value
              ? 'bg-accent/20 text-accent'
              : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function LangModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<LangMode>('ko')

  return (
    <LangModeContext.Provider value={mode}>
      <SetLangModeContext.Provider value={setMode}>
        {children}
      </SetLangModeContext.Provider>
    </LangModeContext.Provider>
  )
}

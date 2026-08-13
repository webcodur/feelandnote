'use client'

import { useRef, type ChangeEvent } from 'react'
import { Upload } from 'lucide-react'

export function FactionImageFileButton({
  label,
  onPick,
}: {
  label: string
  onPick: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onPick(file)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-accent"
      >
        <Upload className="h-3.5 w-3.5" />
        {label}
      </button>
    </>
  )
}

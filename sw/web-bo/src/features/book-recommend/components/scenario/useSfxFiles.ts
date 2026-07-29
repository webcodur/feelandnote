'use client'

import { useEffect, useState } from 'react'

/** soundeffect 폴더 파일 목록 + 베이스 경로. 모든 segment의 SFX 입력에 공유된다. */
export function useSfxFiles(series: string, name: string) {
  const [files, setFiles] = useState<{ name: string; duration: number | null }[]>([])
  const [basePath, setBasePath] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/${series}/soundeffect/${name}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.error) return
        setFiles(data.files ?? [])
        setBasePath(data.basePath ?? '')
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [series, name])

  return { files, basePath }
}

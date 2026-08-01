'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { VoiceFile } from '@feelandnote/shared/bo/voice-utils'

/**
 * 연령 변형 로드·처리 라우트를 주입하는 어댑터.
 * 세력도감·북리커맨드가 저장 경로만 갈아끼워 같은 UI 를 공유한다(동작 동일).
 */
export type AgeEndpoints = {
  /** 원본 재생용 GET URL(캐시 무력화 쿼리 포함) */
  loadUrl: (series: string, name: string, file: string) => string
  /** 원본 기준 변형 예상안 — base64 wav 반환(디스크 미변경) */
  preview: (series: string, name: string, file: string, age: number) => Promise<{ base64: string; duration: number }>
  /** 변형본을 기존 이름에 기록 + 원본을 ori 에 보관 */
  commit: (series: string, name: string, file: string, age: number) => Promise<{ duration: number; hasOri: boolean }>
  /** ori 원본으로 되돌리기 */
  restore: (series: string, name: string, file: string) => Promise<{ duration: number }>
  /** 원본 보관(ori) 여부 */
  status: (series: string, name: string, file: string) => Promise<{ hasOri: boolean }>
}

type Props = {
  series: string
  name: string
  file: VoiceFile
  /** 저장(덮어쓰기·복원) 후 음성 목록 재조회 + 캐시버스터 갱신 */
  onRefresh: () => void
  /** 저장 후 실측 길이 통지(슬롯 길이 필드 갱신용). 연령 변형은 길이를 유지하므로 대개 동일값 */
  onCommitted?: (duration: number) => void
  endpoints: AgeEndpoints
}

// 프리셋 — age 값(양수=젊게, 음수=늙게)
const PRESETS: { label: string; age: number; tone: 'old' | 'zero' | 'young' }[] = [
  { label: '늙게', age: -0.7, tone: 'old' },
  { label: '조금 늙게', age: -0.35, tone: 'old' },
  { label: '원본', age: 0, tone: 'zero' },
  { label: '조금 젊게', age: 0.35, tone: 'young' },
  { label: '젊게', age: 0.7, tone: 'young' },
]

/** base64 wav → 재생 가능한 Blob URL */
function base64ToWavUrl(base64: string): string {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))
}

/** 연령 변형 모드 — 원본을 두고 늙거나 젊게 변형한 예상안을 만들어 들어본 뒤 덮어쓴다. */
export function AgeModeContent({ series, name, file, onRefresh, onCommitted, endpoints }: Props) {
  // age ∈ [-1, 1]. 슬라이더는 -100~100 으로 다룬다.
  const [age, setAge] = useState(0)
  const [hasOri, setHasOri] = useState(false)
  const [busy, setBusy] = useState<null | 'preview' | 'commit' | 'restore'>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // 어느 쪽이 재생 중인지 — 원본 / 예상안 / 정지
  const [playing, setPlaying] = useState<null | 'original' | 'preview'>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previewUrlRef = useRef<string | null>(null)

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setPlaying(null)
  }, [])

  // 언마운트·파일 교체 시 정리
  useEffect(() => () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null }
  }, [])

  // 파일이 바뀌면 상태 초기화 + 원본 보관 여부 조회
  useEffect(() => {
    setAge(0); setNotice(null); setError(null); stop()
    let alive = true
    endpoints.status(series, name, file.name)
      .then(r => { if (alive) setHasOri(!!r.hasOri) })
      .catch(() => { if (alive) setHasOri(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, name, file.name])

  const playUrl = useCallback((url: string, which: 'original' | 'preview') => {
    stop()
    const el = new Audio(url)
    audioRef.current = el
    el.onended = () => { if (audioRef.current === el) { audioRef.current = null; setPlaying(null) } }
    el.play().then(() => setPlaying(which)).catch(e => setError(`재생 실패: ${String(e)}`))
  }, [stop])

  const playOriginal = useCallback(() => {
    playUrl(endpoints.loadUrl(series, name, file.name), 'original')
  }, [playUrl, endpoints, series, name, file.name])

  // 예상안 미리듣기 — 서버에서 변형본을 받아 재생
  const playPreview = useCallback(async () => {
    if (busy) return
    stop()
    setBusy('preview'); setError(null); setNotice(null)
    try {
      const { base64 } = await endpoints.preview(series, name, file.name, age)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      const url = base64ToWavUrl(base64)
      previewUrlRef.current = url
      playUrl(url, 'preview')
    } catch (e) {
      setError(`예상안 생성 실패: ${String(e)}`)
    } finally {
      setBusy(null)
    }
  }, [busy, stop, endpoints, series, name, file.name, age, playUrl])

  // 덮어쓰기 — 원본을 ori 에 보관하고 변형본을 기록
  const commit = useCallback(async () => {
    if (busy) return
    stop()
    setBusy('commit'); setError(null); setNotice(null)
    try {
      const { duration, hasOri: nowOri } = await endpoints.commit(series, name, file.name, age)
      setHasOri(nowOri)
      onCommitted?.(duration)
      onRefresh()
      setNotice('변형본을 저장했다. 원본은 보관됐다.')
    } catch (e) {
      setError(`저장 실패: ${String(e)}`)
    } finally {
      setBusy(null)
    }
  }, [busy, stop, endpoints, series, name, file.name, age, onCommitted, onRefresh])

  // 원본 복원 — ori 에서 되돌린다
  const restore = useCallback(async () => {
    if (busy || !hasOri) return
    stop()
    setBusy('restore'); setError(null); setNotice(null)
    try {
      const { duration } = await endpoints.restore(series, name, file.name)
      setAge(0)
      onCommitted?.(duration)
      onRefresh()
      setNotice('원본으로 되돌렸다.')
    } catch (e) {
      setError(`복원 실패: ${String(e)}`)
    } finally {
      setBusy(null)
    }
  }, [busy, hasOri, stop, endpoints, series, name, file.name, onCommitted, onRefresh])

  const ageLabel = age > 0.02 ? '젊게' : age < -0.02 ? '늙게' : '원본'
  const pct = Math.round(Math.abs(age) * 100)

  return (
    <section className="space-y-4 rounded-md border border-border bg-bg-main/40 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-text-primary">연령 변형</h3>
        <span className="text-xs text-text-secondary">
          목소리를 늙거나 젊게 바꾼다. 원본은 그대로 두고 예상안을 만들어 들어본 뒤 덮어쓴다. 전체 길이는 유지된다.
        </span>
        <div className="ml-auto flex items-center gap-2 text-xs text-text-secondary">
          <span>{file.name}</span>
          {hasOri && (
            <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-300" title="원본이 ori 에 보관돼 있어 언제든 되돌릴 수 있다">
              원본 보관됨
            </span>
          )}
        </div>
      </div>

      {/* 프리셋 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-secondary">빠른 선택</span>
        <div role="group" className="inline-flex items-stretch overflow-hidden rounded border border-border">
          {PRESETS.map(p => {
            const active = Math.abs(age - p.age) < 0.001
            const color = active
              ? p.tone === 'old' ? 'bg-sky-600 text-white' : p.tone === 'young' ? 'bg-rose-600 text-white' : 'bg-accent text-bg-primary'
              : 'bg-bg-card text-text-secondary hover:bg-bg-hover'
            return (
              <button
                key={p.label}
                onClick={() => setAge(p.age)}
                className={`border-l border-border px-3 py-1.5 text-xs font-semibold first:border-l-0 ${color}`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 슬라이더 — 늙게 ↔ 젊게 */}
      <div className="flex items-center gap-3">
        <span className="w-10 text-right text-xs font-semibold text-sky-300">늙게</span>
        <input
          type="range"
          min={-100}
          max={100}
          step={1}
          value={Math.round(age * 100)}
          onChange={e => setAge(Number(e.target.value) / 100)}
          className="flex-1 accent-accent"
        />
        <span className="w-10 text-xs font-semibold text-rose-300">젊게</span>
        <span className="w-24 text-right font-mono text-xs text-text-primary">
          {ageLabel}{pct > 0 ? ` ${pct}%` : ''}
        </span>
      </div>

      {/* 재생·저장 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={playing === 'preview' ? stop : playPreview}
          disabled={busy === 'commit' || busy === 'restore'}
          className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-bg-primary hover:opacity-90 disabled:opacity-40"
          title="현재 설정으로 변형한 예상안을 들어본다(파일은 바뀌지 않는다)"
        >
          {busy === 'preview' ? '변형 중…' : playing === 'preview' ? '정지' : '예상안 미리듣기'}
        </button>
        <button
          onClick={playing === 'original' ? stop : playOriginal}
          disabled={!!busy}
          className="rounded border border-border bg-bg-card px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-40"
          title="보관된 원본을 그대로 들어본다"
        >
          {playing === 'original' ? '정지' : '원본 듣기'}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={commit}
            disabled={!!busy || Math.abs(age) < 0.001}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:bg-bg-card disabled:text-text-secondary disabled:opacity-60"
            title="변형본을 기존 파일에 덮어쓴다. 원본은 ori 에 보관된다"
          >
            {busy === 'commit' ? '저장 중…' : '덮어쓰기'}
          </button>
          <button
            onClick={restore}
            disabled={!!busy || !hasOri}
            className="rounded border border-border bg-bg-card px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-40"
            title="보관된 원본으로 되돌린다"
          >
            원본 복원
          </button>
        </div>
      </div>

      {notice && <div className="text-xs text-emerald-300">{notice}</div>}
      {error && <div className="text-xs text-danger-text">{error}</div>}

      <div className="rounded border border-border bg-bg-card/60 p-4 text-xs leading-relaxed text-text-secondary">
        <div className="mb-1.5 text-sm font-semibold text-text-primary">사용법</div>
        <ol className="list-inside list-decimal space-y-1">
          <li>「빠른 선택」이나 슬라이더로 <span className="text-sky-300">늙게</span>·<span className="text-rose-300">젊게</span> 정도를 정한다.</li>
          <li>「예상안 미리듣기」로 들어본다. 원본과 번갈아 들으며 조절한다.</li>
          <li>마음에 들면 「덮어쓰기」. 원본은 자동 보관되고, 언제든 「원본 복원」으로 되돌린다.</li>
        </ol>
        <div className="mt-2 border-t border-border/60 pt-2">
          큰 폭으로 밀면 다른 사람처럼 들릴 수 있다. 살짝(20~40%)이 가장 자연스럽다.
        </div>
      </div>
    </section>
  )
}

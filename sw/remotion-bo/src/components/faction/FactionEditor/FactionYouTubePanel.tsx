'use client'

import { useState, useEffect, useCallback } from 'react'
import { Upload, Eye, Trash2, Loader, Film } from '../shared/icons'

// #region 타입 — youtube/status·youtube/sync 응답 형태(세력도 한국어 세로 2종 전용)

type AuthState = { authenticated: boolean; expiryDate?: string; hasRefreshToken?: boolean }

type VariantFile = { exists: true; size?: number; name: string }

type FactionVariant = {
  lang: 'ko'
  type: 'longform' | 'shorts'
  key: string
  label?: string
  video: VariantFile | null
  srt: VariantFile | null
  thumb: VariantFile | null
}

type UploadRecord = { videoId: string; uploadedAt: string }

type StatusResponse = {
  auth: { ko: AuthState; en?: AuthState }
  lineup: { uploads?: Record<string, UploadRecord> } | null
  variants: FactionVariant[]
  meta: unknown
}

type SyncPreview = {
  variant: string
  videoId: string
  lang: string
  ytSnippet?: { title: string; description: string }
  newSnippet: { title: string; description: string; tags: string[] }
  diffs: Array<'title' | 'description' | 'tags'>
}

// #endregion

const VARIANT_LABEL: Record<string, string> = {
  'ko-longform': '세로 롱폼',
  'ko-shorts-1': '세로 쇼츠 1편',
  'ko-shorts-2': '세로 쇼츠 2편',
}

const DIFF_LABEL: Record<string, string> = {
  title: '제목',
  description: '설명',
  tags: '태그',
}

const BTN = 'flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50'
const BTN_DEFAULT = `${BTN} border-border bg-bg-card text-text-secondary hover:bg-bg-hover`
const BTN_ACCENT = `${BTN} border-accent bg-accent text-bg-main hover:bg-accent-hover`

function formatMb(size?: number): string {
  if (!size) return ''
  return `${(size / (1024 * 1024)).toFixed(0)}MB`
}

function formatUploadedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function FactionYouTubePanel({ series, name }: { series: string; name: string }) {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [previews, setPreviews] = useState<SyncPreview[] | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  // 상태 조회
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/${series}/youtube/status?episode=${encodeURIComponent(name)}`)
      const data = (await res.json()) as StatusResponse
      setStatus(data)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [series, name])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // 업로드 실행 — type 미지정이면 2종 모두, 지정이면 해당 1종
  const upload = useCallback(async (type?: 'longform' | 'shorts') => {
    setBusy(true)
    try {
      const res = await fetch(`/api/${series}/youtube/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(type ? { episode: name, type } : { episode: name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert('업로드 시작 실패: ' + (data.error ?? res.statusText))
        return
      }
      // 백그라운드 작업이라 곧장은 기록이 안 생긴다 — 잠시 뒤 상태만 갱신
      setTimeout(fetchStatus, 3000)
    } catch (e) {
      alert('업로드 시작 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setBusy(false)
    }
  }, [series, name, fetchStatus])

  // 업로드 기록만 삭제 (유튜브 영상은 그대로)
  const removeRecord = useCallback(async (variant: string) => {
    if (!confirm(`${VARIANT_LABEL[variant] ?? variant}의 업로드 기록을 지웁니다. 유튜브 영상은 그대로 남습니다. 진행할까요?`)) return
    setBusy(true)
    try {
      const res = await fetch(`/api/${series}/youtube/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', episode: name, variant }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert('기록 삭제 실패: ' + (data.error ?? res.statusText))
        return
      }
      await fetchStatus()
    } catch (e) {
      alert('기록 삭제 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setBusy(false)
    }
  }, [series, name, fetchStatus])

  // 메타 미리보기 — 펼침 영역에 제목·설명·태그 표시
  const previewMeta = useCallback(async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/${series}/youtube/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview-all', episode: name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert('미리보기 실패: ' + (data.error ?? res.statusText))
        return
      }
      setPreviews(Array.isArray(data.previews) ? data.previews : [])
      setPreviewOpen(true)
    } catch (e) {
      alert('미리보기 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setBusy(false)
    }
  }, [series, name])

  // 메타 반영 — 유튜브에 제목·설명·태그 일괄 적용
  const pushMeta = useCallback(async () => {
    if (!confirm('업로드된 영상들의 제목·설명·태그를 유튜브에 반영합니다. 진행할까요?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/${series}/youtube/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push-all', episode: name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert('메타 반영 실패: ' + (data.error ?? res.statusText))
        return
      }
      const results: Array<{ variant: string; ok: boolean; error?: string }> = Array.isArray(data.results) ? data.results : []
      const failed = results.filter(r => !r.ok)
      if (failed.length) {
        alert('일부 반영 실패:\n' + failed.map(r => `${VARIANT_LABEL[r.variant] ?? r.variant}: ${r.error ?? '실패'}`).join('\n'))
      }
      await fetchStatus()
    } catch (e) {
      alert('메타 반영 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setBusy(false)
    }
  }, [series, name, fetchStatus])

  if (loading) return <div className="text-sm text-text-dim">불러오는 중...</div>
  if (!status) return <div className="text-sm text-danger-text">상태 조회 실패</div>

  const authed = status.auth.ko.authenticated
  // "지금 업로드 가능한가"는 자동 재발급 열쇠(refresh token) 유무가 결정한다.
  // 접속 토큰 만료시각(expiryDate)은 1시간마다 지나는 값이라 표시하지 않는다 — 잡음일 뿐이고
  // 자동 갱신되므로 유저가 신경 쓸 필요가 없다(youtube-core 가 만료 시 알아서 새 토큰을 받아옴).
  const canUpload = authed && (status.auth.ko.hasRefreshToken ?? false)
  const uploads = status.lineup?.uploads ?? {}
  const hasUploads = Object.keys(uploads).length > 0

  return (
    <div className="space-y-4 rounded-lg border border-border bg-bg-card/40 p-4">

      {/* 인증 상태 — 접속 토큰 만료시각이 아니라 "지금 업로드 가능한가"(자동 재발급 열쇠 유무)를 보여준다 */}
      {canUpload ? (
        <div className="space-y-1">
          <div
            className="flex items-center gap-2 text-sm text-text-secondary"
            title="유튜브 접속 토큰은 1시간마다 만료되지만, 자동 재발급 열쇠가 저장돼 있어 업로드할 때마다 새 토큰을 알아서 받아옵니다. 따로 만료일을 신경 쓸 필요가 없습니다. 이 표시가 풀리면(열쇠 만료·계정 비밀번호 변경 등) 그때만 pnpm youtube:auth 로 다시 인증하면 됩니다."
          >
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            유튜브 채널 인증됨 · 업로드 가능
          </div>
          <p className="text-xs text-text-dim">
            접속용 출입증은 1시간마다 만료되지만 자동 재발급 열쇠가 있어 올릴 때마다 새로 받아옵니다. 만료일은 신경 쓰지 않아도 됩니다.
          </p>
        </div>
      ) : authed ? (
        <div className="rounded-md border border-danger-text/40 bg-danger/20 px-3 py-2 text-sm text-danger-text">
          <span className="font-semibold">곧 인증이 끊깁니다.</span> 자동 재발급 열쇠가 없어 접속 토큰이 만료되면 업로드가 막힙니다.
          터미널에서 <span className="font-mono">pnpm youtube:auth</span> 로 다시 인증하세요.
        </div>
      ) : (
        <div className="rounded-md border border-danger-text/40 bg-danger/20 px-3 py-2 text-sm font-semibold text-danger-text">
          유튜브 인증이 필요합니다. 터미널에서 <span className="font-mono">pnpm youtube:auth</span> 를 실행하세요.
        </div>
      )}

      {/* 상단 액션 */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => upload()} disabled={busy || !canUpload} className={BTN_ACCENT} title="세로 롱폼·쇼츠 1·2편 모두 비공개로 업로드">
          {busy ? <Loader size={15} /> : <Upload size={15} />} 전체 업로드
        </button>
        <button onClick={previewMeta} disabled={busy || !hasUploads} className={BTN_DEFAULT} title="업로드된 영상에 적용될 제목·설명·태그 미리보기">
          <Eye size={15} /> 메타 미리보기
        </button>
        <button onClick={pushMeta} disabled={busy || !hasUploads} className={BTN_DEFAULT} title="업로드된 영상들의 제목·설명·태그를 유튜브에 반영">
          <Film size={15} /> 메타 반영
        </button>
        <button onClick={fetchStatus} disabled={busy} className={`${BTN_DEFAULT} ml-auto`} title="상태 새로고침">
          새로고침
        </button>
      </div>

      {/* variant 2줄 — 세로 롱폼 / 세로 쇼츠 */}
      <div className="space-y-1.5">
        {status.variants.map(v => {
          const rec = uploads[v.key]
          return (
            <div key={v.key} className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-bg-main/30 px-3 py-2">
              <span className="w-24 shrink-0 text-sm font-bold text-text-primary">{v.label ?? VARIANT_LABEL[v.key] ?? v.key}</span>

              {/* 영상 파일 유무 */}
              {v.video?.exists ? (
                <span className="text-xs text-text-secondary">영상 있음 {formatMb(v.video.size)}</span>
              ) : (
                <span className="text-xs text-warning-text">영상 없음 (렌더 필요)</span>
              )}

              {/* 업로드 여부 */}
              <div className="ml-auto flex items-center gap-2">
                {rec?.videoId ? (
                  <>
                    <a
                      href={`https://youtu.be/${rec.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      youtu.be/{rec.videoId}
                    </a>
                    <span className="text-xs text-text-dim">{formatUploadedAt(rec.uploadedAt)}</span>
                    <button
                      onClick={() => removeRecord(v.key)}
                      disabled={busy}
                      className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold text-danger-text hover:bg-danger disabled:opacity-50"
                      title="업로드 기록만 삭제 (유튜브 영상은 그대로)"
                    >
                      <Trash2 size={13} /> 기록 삭제
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => upload(v.type)}
                    disabled={busy || !canUpload || !v.video?.exists}
                    className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2.5 py-1 text-xs font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
                    title="이 영상만 비공개로 업로드"
                  >
                    <Upload size={13} /> 업로드
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 메타 미리보기 펼침 영역 */}
      {previewOpen && previews && (
        <div className="space-y-3 rounded-md border border-border bg-bg-main/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-text-primary">메타 미리보기</span>
            <button onClick={() => setPreviewOpen(false)} className="text-xs font-semibold text-text-secondary hover:text-accent">
              닫기
            </button>
          </div>
          {previews.length === 0 && <p className="text-sm text-text-dim">업로드된 영상이 없습니다.</p>}
          {previews.map(p => (
            <div key={p.variant} className="space-y-2 rounded-md border border-border bg-bg-card/40 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary">{VARIANT_LABEL[p.variant] ?? p.variant}</span>
                {p.diffs.length > 0 && (
                  <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                    현재값과 다름: {p.diffs.map(d => DIFF_LABEL[d] ?? d).join(', ')}
                  </span>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-text-dim">제목</div>
                <div className="text-sm text-text-primary">{p.newSnippet.title}</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-text-dim">설명</div>
                <pre className="whitespace-pre-wrap break-words text-sm text-text-secondary">{p.newSnippet.description}</pre>
              </div>

              {p.newSnippet.tags.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-text-dim">태그</div>
                  <div className="flex flex-wrap gap-1">
                    {p.newSnippet.tags.map(t => (
                      <span key={t} className="rounded bg-bg-main px-1.5 py-0.5 text-xs text-text-secondary">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

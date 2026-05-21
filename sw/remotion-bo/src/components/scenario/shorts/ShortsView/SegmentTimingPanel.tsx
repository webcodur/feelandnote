'use client'

import { useState } from 'react'
import { shortSegLayoutSec, formatSec, resolveLogoSec, SHORT_LOGO_MIN_SEC, SHORT_LOGO_MAX_SEC } from './shortsTiming'

/**
 * 쇼츠 세그먼트 시간 패널.
 *
 * 각 구간별로 음성 길이, 표시 길이(페이드 · 이미지 보장 포함), 다음 구간으로 넘어가기 전 gap 을 보여준다.
 * 우상단 복사 버튼은 줄글꼴 텍스트로 클립보드에 담는다.
 *
 * 첫 구간이 hook 이면 인트로(chime + 인물 · 책 등장)가 hook 다음 본편 앞에 들어가고,
 * 그 외에는 본편 시작 전에 별도로 잡힌다.
 * 본편 끝의 logo(엔드 카드)는 한 마지막 칸에서 길이를 직접 편집할 수 있다.
 */
export function SegmentTimingPanel({
  segments, hasBgm, logoDurationSec, onChangeLogoDurationSec,
}: {
  segments: any[]
  hasBgm: boolean
  logoDurationSec?: number
  onChangeLogoDurationSec: (next: number | undefined) => void
}) {
  const [copied, setCopied] = useState(false)
  const layout = shortSegLayoutSec(segments)
  const totalGap = layout.entries.reduce((a, e) => a + e.gapSec + e.extraGapSec, 0)
  const totalDisplay = layout.entries.reduce((a, e) => a + e.displaySec, 0)
  const totalBody = totalDisplay + totalGap + (layout.revealAfterHook ? layout.revealSec : 0)
  const logoSec = resolveLogoSec(logoDurationSec, hasBgm)
  const isLogoAuto = logoDurationSec === undefined || !Number.isFinite(logoDurationSec)

  const handleCopy = async () => {
    const lines: string[] = []
    const introNote = layout.revealAfterHook
      ? `인트로 ${formatSec(layout.revealSec)} (훅 다음 본편 앞)`
      : `인트로 별도 ${formatSec(layout.revealSec)}`
    lines.push(`쇼츠 구간 시간 (총 본편 ${formatSec(totalBody)} · ${introNote} · 로고 ${formatSec(logoSec)}${isLogoAuto ? ' 자동' : ''})`)
    lines.push('')
    lines.push('번호 | id                     | 음성   | 표시   | gap')
    lines.push('-----+------------------------+--------+--------+------')
    layout.entries.forEach((e, i) => {
      const num = String(i + 1).padStart(2, '0')
      const id = e.id.padEnd(22).slice(0, 22)
      const voice = e.voiceSec > 0 ? formatSec(e.voiceSec).padStart(7) : '   --   '
      const display = formatSec(e.displaySec).padStart(7)
      const gapBase = formatSec(e.gapSec)
      const gap = e.extraGapSec > 0 ? `${gapBase} +${formatSec(e.extraGapSec)}` : gapBase
      lines.push(`${num}   | ${id} | ${voice} | ${display} | ${gap}`)
      if (layout.revealAfterHook && i === 0) {
        const rev = formatSec(layout.revealSec).padStart(7)
        lines.push(`--   | 인트로 (chime+등장)    |    --   | ${rev} |   --`)
      }
    })
    lines.push(`--   | logo${isLogoAuto ? ' (자동)' : '       '}        |    --   | ${formatSec(logoSec).padStart(7)} |   --`)
    lines.push('')
    const revealLine = layout.revealAfterHook ? ` + 인트로 ${formatSec(layout.revealSec)}` : ''
    lines.push(`구간 합계: 표시 ${formatSec(totalDisplay)} + gap ${formatSec(totalGap)}${revealLine} = ${formatSec(totalBody)}`)
    const text = lines.join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // noop — 클립보드 차단 환경
    }
  }

  return (
    <div className="border border-border rounded p-2 bg-bg-card text-sm font-bold">
      <div className="flex items-center justify-between mb-1">
        <span className="text-text-secondary">
          구간 시간 — 본편 <span className="text-text-primary font-semibold tabular-nums">{formatSec(totalBody)}</span>
          <span className="opacity-60">
            {' '}({layout.revealAfterHook
              ? `훅 다음 인트로 ${formatSec(layout.revealSec)} 포함`
              : `인트로 ${formatSec(layout.revealSec)} 별도`})
          </span>
        </span>
        <button
          onClick={handleCopy}
          className="px-2 py-0.5 text-sm font-bold text-accent border border-accent/40 rounded hover:bg-accent/10 transition-colors"
          title="시간표를 텍스트로 복사"
        >{copied ? '복사됨' : '복사'}</button>
      </div>
      <table className="w-full text-sm font-bold tabular-nums">
        <thead>
          <tr className="text-text-secondary/70 text-left">
            <th className="font-normal pr-2">#</th>
            <th className="font-normal pr-2">id</th>
            <th className="font-normal pr-2 text-right">음성</th>
            <th className="font-normal pr-2 text-right">표시</th>
            <th className="font-normal text-right">gap</th>
          </tr>
        </thead>
        <tbody>
          {layout.entries.flatMap((e, i) => {
            const rows = [
              <tr key={`seg-${i}`} className="border-t border-border">
                <td className="pr-2 text-text-secondary">{String(i + 1).padStart(2, '0')}</td>
                <td className="pr-2 text-text-primary truncate max-w-[200px]" title={e.id}>{e.id}</td>
                <td className="pr-2 text-right text-text-secondary">{e.voiceSec > 0 ? formatSec(e.voiceSec) : '—'}</td>
                <td className="pr-2 text-right text-text-primary">{formatSec(e.displaySec)}</td>
                <td className="text-right text-text-secondary">
                  {formatSec(e.gapSec)}
                  {e.extraGapSec > 0 && <span className="text-amber-400"> +{formatSec(e.extraGapSec)}</span>}
                </td>
              </tr>,
            ]
            if (layout.revealAfterHook && i === 0) {
              rows.push(
                <tr key="reveal" className="border-t border-border bg-bg-card">
                  <td className="pr-2 text-text-secondary">--</td>
                  <td className="pr-2 text-accent" title="훅 다음 인트로 — chime + 인물 · 책 등장">
                    인트로
                    <span className="ml-1 text-text-dim text-sm font-bold">chime + 등장</span>
                  </td>
                  <td className="pr-2 text-right text-text-secondary">—</td>
                  <td className="pr-2 text-right text-text-primary">{formatSec(layout.revealSec)}</td>
                  <td className="text-right text-text-secondary">—</td>
                </tr>
              )
            }
            return rows
          })}
          {/* 마지막 로고(엔드 카드) — 본편 다음 붙는 마무리 화면. 길이를 직접 편집한다. */}
          <tr className="border-t border-border bg-bg-card/40">
            <td className="pr-2 text-text-secondary">--</td>
            <td className="pr-2 text-text-primary" title="마지막 엔드 카드 (인물 · 책 정보 표시)">
              로고
              <span className="ml-1 text-text-dim text-sm font-bold">
                {isLogoAuto ? `자동 (BGM ${hasBgm ? '있음 5s' : '없음 3s'})` : '직접 지정'}
              </span>
            </td>
            <td className="pr-2 text-right text-text-secondary">—</td>
            <td className="pr-2 text-right">
              <div className="flex items-center justify-end gap-1">
                <input
                  type="number"
                  step={0.1}
                  min={SHORT_LOGO_MIN_SEC}
                  max={SHORT_LOGO_MAX_SEC}
                  value={isLogoAuto ? '' : String(logoDurationSec)}
                  onChange={e => {
                    const v = e.target.value
                    if (v === '') { onChangeLogoDurationSec(undefined); return }
                    const n = parseFloat(v)
                    if (!Number.isFinite(n)) return
                    onChangeLogoDurationSec(Math.min(SHORT_LOGO_MAX_SEC, Math.max(SHORT_LOGO_MIN_SEC, n)))
                  }}
                  placeholder={`${logoSec.toFixed(1)}`}
                  title={`로고 화면 길이 (초). ${SHORT_LOGO_MIN_SEC}~${SHORT_LOGO_MAX_SEC} 범위. 비우면 BGM 유무로 자동`}
                  className="w-14 bg-bg-card border border-border/40 rounded px-1 py-0.5 text-right text-text-primary tabular-nums focus:outline-none focus:border-accent/60"
                />
                <span className="text-text-dim text-sm font-bold">s</span>
                {!isLogoAuto && (
                  <button
                    type="button"
                    onClick={() => onChangeLogoDurationSec(undefined)}
                    className="text-text-secondary hover:text-red-400 text-sm font-bold"
                    title="자동(BGM 유무 대입)으로 되돌리기"
                  >×</button>
                )}
              </div>
            </td>
            <td className="text-right text-text-secondary">—</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

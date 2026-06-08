import type { EpisodeData } from '../types'

/** 1권 모드(SOLO) 영상 업로드 박스. 책별로 ko/en 업로드 버튼 노출.
 *  솔로는 별도 데이터 없이 모든 책에서 자동 변환되므로 책 배열을 그대로 후보로 삼는다. */
export function SoloUploadBox({ epKo, epEn, disabled, onUpload }: {
  epKo: EpisodeData | null
  epEn: EpisodeData | null
  disabled: boolean
  onUpload: (lang: 'ko' | 'en', bookIndex: number) => void
}) {
  const koBooks = Array.isArray(epKo?.books) ? epKo!.books! : []
  const enBooks = Array.isArray(epEn?.books) ? epEn!.books! : []
  const count = Math.max(koBooks.length, enBooks.length)
  if (count === 0) return null

  return (
    <div className="space-y-2 p-3 rounded bg-bg-card border border-border">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-accent tracking-widest">SOLO · 1권 모드</span>
        <span className="text-[11px] text-text-dim">{count}권 (책 본문 자동 변환)</span>
      </div>
      <div className="space-y-1">
        {Array.from({ length: count }, (_, idx) => {
          const num = String(idx + 1).padStart(2, '0')
          const koTitle = koBooks[idx]?.title ?? ''
          const enTitle = enBooks[idx]?.title ?? ''
          const hasKo = !!koBooks[idx]
          const hasEn = !!enBooks[idx]
          return (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span className="font-mono text-text-dim w-10">B{num}</span>
              <span className="flex-1 truncate text-text-secondary" title={koTitle || enTitle}>
                {koTitle || enTitle}
              </span>
              <button
                onClick={() => onUpload('ko', idx)}
                disabled={!hasKo || disabled}
                className={`px-2 py-0.5 text-[11px] rounded border border-border ${(!hasKo || disabled) ? 'opacity-30 cursor-default' : 'hover:bg-bg-hover'}`}
                title={hasKo ? 'KO 채널 업로드' : 'KO 책 없음'}
              >KO</button>
              <button
                onClick={() => onUpload('en', idx)}
                disabled={!hasEn || disabled}
                className={`px-2 py-0.5 text-[11px] rounded border border-border ${(!hasEn || disabled) ? 'opacity-30 cursor-default' : 'hover:bg-bg-hover'}`}
                title={hasEn ? 'EN 채널 업로드' : 'EN 책 없음'}
              >EN</button>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-text-dim leading-relaxed">
        영상 파일이 렌더링되어 있어야 업로드된다. 렌더는 「렌더」 페이지에서 실행한다.
      </p>
    </div>
  )
}

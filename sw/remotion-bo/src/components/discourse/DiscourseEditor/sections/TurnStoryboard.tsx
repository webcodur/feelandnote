'use client'

/**
 * 발언 하나의 콘티 — 그 발언 동안 화면에 걸리는 사진을 순서대로, 밑에 그때 나오는 대사를 함께 둔다.
 *
 * 담화 영상은 발언 순서대로 사진이 넘어가는 구조라, 사진과 대사를 나란히 놓은 콘티가 곧 영상의 뼈대다.
 * 발언을 펼치지 않아도 보이게 두는 것이 핵심 — 목록을 훑는 것만으로 영상 흐름이 사진으로 읽혀야 한다.
 * 사진을 누르면 원본 크기로 띄워 얼굴·손·소품이 중앙에 모였는지 판단한다.
 */

import { useState } from 'react'
import type { Speaker, Turn } from '@/lib/discourse-types'
import { ImageIcon } from '@/components/icons'
import { imageSrc, turnShots } from '../../shared/timing'
import { MediaThumb, ImageLightbox, type LightboxShot } from '@/components/media'

/** 사진이 걸리는 시점 문구 — 0번 덩어리는 발언과 동시에 시작한다 */
const whenLabel = (fromChunk: number) => (fromChunk === 0 ? '발언 시작' : `${fromChunk + 1}번째 덩어리부터`)

export function TurnStoryboard({
  turn, speaker, series, episodeName,
}: {
  turn: Turn
  speaker?: Speaker
  series: string
  episodeName: string
}) {
  const [zoom, setZoom] = useState<number | null>(null)
  const shots = turnShots(turn, speaker?.image)
  const withSrc = shots.map(s => ({ ...s, src: imageSrc(series, episodeName, s.image) }))

  // 사진이 한 장도 안 걸린 발언 — 영상에서 인물 이름 첫 글자만 뜬다. 그 사실을 그대로 알린다.
  if (!withSrc.some(s => s.src)) {
    return (
      <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-[11px] text-text-dim">
        <ImageIcon size={12} />
        걸린 사진이 없습니다 — 지금 렌더하면 이 발언은 인물 이름 첫 글자만 뜹니다.
      </div>
    )
  }

  const lightboxShots: LightboxShot[] = withSrc
    .filter(s => s.src)
    .map(s => ({ src: s.src!, path: s.image ?? '', caption: s.caption, when: whenLabel(s.fromChunk) }))

  /** 원본 보기의 자리 — 사진 없는 컷은 목록에서 빠지므로 번호를 다시 센다 */
  const zoomIndexOf = (i: number) => withSrc.slice(0, i).filter(s => s.src).length

  return (
    <>
      <div className="flex flex-wrap gap-3 border-t border-border p-3">
        {withSrc.map((shot, i) => (
          <figure key={i} className="w-56 shrink-0 space-y-1.5">
            {shot.src ? (
              <button
                onClick={() => setZoom(zoomIndexOf(i))}
                className="group relative block w-56 overflow-hidden rounded-lg border border-border hover:border-accent"
                title="원본 크기로 봅니다"
              >
                <MediaThumb src={shot.src} alt="" className="aspect-square w-full object-cover" />
                <span className="pointer-events-none absolute start-0 top-0 rounded-ee-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                {shot.inherited && (
                  <span
                    className="pointer-events-none absolute end-0 top-0 rounded-es-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white/80"
                    title="이 발언에 따로 지정하지 않아 인물 소개 사진을 그대로 씁니다"
                  >
                    인물 기본
                  </span>
                )}
              </button>
            ) : (
              <div className="flex aspect-square w-56 items-center justify-center rounded-lg border border-dashed border-border bg-bg-secondary/40 text-[11px] text-text-dim">
                사진 없음
              </div>
            )}
            <figcaption className="space-y-0.5">
              <div className="text-[10px] font-semibold text-text-dim">{whenLabel(shot.fromChunk)}</div>
              <p className="line-clamp-3 text-[11px] leading-relaxed text-text-secondary" title={shot.caption}>
                {shot.caption || <span className="text-text-dim">대사 없음</span>}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>

      <ImageLightbox shots={lightboxShots} index={zoom} onClose={() => setZoom(null)} onIndex={setZoom} />
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import type { GameCharacter } from '@/lib/game/suikoden/types'
import { getPortraitUrl, getCharacterFallback } from '@/lib/game/suikoden/assetManager'
import { GRADE_COLORS } from '@/lib/game/suikoden/constants'

interface Props {
  character: GameCharacter
  size?: number
  showGrade?: boolean
}

/** 에셋이 있으면 이미지, 없으면 CSS 폴백으로 렌더링 */
export default function CharacterPortrait({ character, size = 48, showGrade = false }: Props) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    const url = getPortraitUrl(character)
    setImgSrc(url)
    setImgError(false)
  }, [character])

  const fallback = getCharacterFallback(character)

  return (
    <div
      className="relative shrink-0 rounded overflow-hidden"
      style={{ width: size, height: size }}
    >
      {imgSrc && !imgError ? (
        <img
          src={imgSrc}
          alt={character.nickname}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          style={{ imageRendering: 'pixelated' }}
          onError={() => setImgError(true)}
        />
      ) : (
        /* CSS 폴백: 색상 원 + 이니셜 */
        <div
          className="w-full h-full flex flex-col items-center justify-center"
          style={{
            backgroundColor: fallback.bgColor,
            border: `2px solid ${fallback.borderColor}`,
          }}
        >
          <span style={{ fontSize: size * 0.25 }}>{fallback.icon}</span>
          <span
            className="font-bold leading-none"
            style={{ fontSize: size * 0.28, color: fallback.borderColor }}
          >
            {fallback.label}
          </span>
        </div>
      )}

      {/* 등급 뱃지 */}
      {showGrade && (
        <div
          className="absolute top-0 right-0 text-[8px] font-black px-1 rounded-bl"
          style={{ backgroundColor: GRADE_COLORS[character.grade], color: '#000' }}
        >
          {character.grade}
        </div>
      )}
    </div>
  )
}

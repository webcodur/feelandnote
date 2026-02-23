'use client'

import { useState } from 'react'
import type { GameCharacter } from '@/lib/game/suikoden/types'
import { STAT_LABELS, CLASS_INFO, GRADE_COLORS } from '@/lib/game/suikoden/constants'
import CharacterPortrait from './CharacterPortrait'

interface Props {
  character: GameCharacter
  onClose: () => void
}

export default function CharacterDetailModal({ character, onClose }: Props) {
  const [showStatGuide, setShowStatGuide] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-sm bg-stone-800 border border-stone-600 rounded-lg p-4 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <CharacterPortrait character={character} size={56} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-stone-100">{character.nickname}</span>
              <span className="text-xs font-bold" style={{ color: GRADE_COLORS[character.grade] }}>{character.grade}</span>
            </div>
            <p className="text-xs text-stone-400">{character.title}</p>
            <p className="text-xs text-stone-500">
              {CLASS_INFO[character.unitClass].icon} {CLASS_INFO[character.unitClass].name}
            </p>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-sm">✕</button>
        </div>

        {/* 7스탯 바 */}
        <div className="space-y-1.5">
          {(Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[]).map(key => (
            <div key={key} className="flex items-center gap-2 text-xs" title={STAT_LABELS[key].desc}>
              <span className="w-14 text-stone-400">{STAT_LABELS[key].icon} {STAT_LABELS[key].name}</span>
              <div className="flex-1 h-2 bg-stone-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${character.stats[key] * 10}%`,
                    backgroundColor: character.stats[key] >= 8 ? '#fbbf24' : character.stats[key] >= 5 ? '#60a5fa' : '#6b7280',
                  }}
                />
              </div>
              <span className="w-5 text-right text-stone-300">{character.stats[key]}</span>
            </div>
          ))}
        </div>

        {/* 스탯 설명 토글 */}
        <button
          onClick={() => setShowStatGuide(!showStatGuide)}
          className="text-[10px] text-stone-600 hover:text-amber-400 transition-colors"
        >
          {showStatGuide ? '스탯 설명 닫기' : '스탯 설명 보기'}
        </button>

        {showStatGuide && (
          <div className="space-y-1 text-[10px] bg-stone-900/60 rounded p-2.5 border border-stone-700">
            {(Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[]).map(key => (
              <div key={key} className="flex gap-2">
                <span className="text-stone-400 shrink-0 w-8 font-bold">{STAT_LABELS[key].name}</span>
                <span className="text-stone-500">{STAT_LABELS[key].desc}</span>
              </div>
            ))}
            <div className="border-t border-stone-700 mt-1.5 pt-1.5 space-y-0.5 text-stone-600">
              <p>전술별 주력: 돌격=완력, 계략=지력, 방어=체력, 고무=인애</p>
              <p>훈련 가능: 완력, 기량, 체력 (나머지는 성장 불가)</p>
            </div>
          </div>
        )}

        {/* 전투 정보 */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-stone-900 rounded p-2 text-center">
            <div className="text-stone-500">HP</div>
            <div className="text-stone-200 font-bold">{character.hp}/{character.maxHp}</div>
          </div>
          <div className="bg-stone-900 rounded p-2 text-center">
            <div className="text-stone-500">병사</div>
            <div className="text-stone-200 font-bold">{character.troops}/{character.maxTroops}</div>
          </div>
          <div className="bg-stone-900 rounded p-2 text-center">
            <div className="text-stone-500">충성</div>
            <div className={`font-bold ${character.loyaltyValue >= 80 ? 'text-green-400' : character.loyaltyValue >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {character.loyaltyValue}
            </div>
          </div>
        </div>

        {/* 소개 */}
        <div className="text-xs text-stone-400 leading-relaxed">
          {character.bio}
        </div>
        {character.quotes && (
          <p className="text-xs italic text-stone-500">&ldquo;{character.quotes}&rdquo;</p>
        )}
      </div>
    </div>
  )
}

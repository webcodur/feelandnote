'use client'

import { useState, useMemo } from 'react'
import type { GameCharacter } from '@/lib/game/suikoden/types'
import { GRADE_COLORS, CLASS_INFO, STAT_LABELS, REGIONS, NATIONALITY_TO_REGION } from '@/lib/game/suikoden/constants'
import CharacterPortrait from './CharacterPortrait'

interface Props {
  characters: GameCharacter[]
  onComplete: (leaderId: string, difficulty: 'easy' | 'normal' | 'hard') => void
  onBack: () => void
}

export default function SetupScreen({ characters, onComplete, onBack }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal')
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter) return characters.slice(0, 60)
    const lower = filter.toLowerCase()
    return characters.filter(c =>
      c.nickname.toLowerCase().includes(lower) ||
      c.title.toLowerCase().includes(lower)
    ).slice(0, 60)
  }, [characters, filter])

  const selected = characters.find(c => c.id === selectedId)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-stone-500 hover:text-stone-300 text-sm">← 뒤로</button>
        <h2 className="text-lg font-bold text-stone-200">주군 선택</h2>
        <div />
      </div>

      {/* 난이도 */}
      <div className="flex gap-2 justify-center">
        {(['easy', 'normal', 'hard'] as const).map(d => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`px-4 py-1.5 rounded text-sm border transition-colors ${
              difficulty === d
                ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                : 'border-stone-700 text-stone-500 hover:border-stone-500'
            }`}
          >
            {{ easy: '쉬움', normal: '보통', hard: '어려움' }[d]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 캐릭터 목록 */}
        <div className="lg:col-span-2 space-y-3">
          <input
            type="text"
            placeholder="인물 검색..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded text-sm text-stone-200 placeholder-stone-500 focus:border-amber-500/50 outline-none"
          />

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto pr-1">
            {filtered.map(char => (
              <button
                key={char.id}
                onClick={() => setSelectedId(char.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded border transition-all text-center ${
                  selectedId === char.id
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-stone-700 hover:border-stone-500 bg-stone-800/50'
                }`}
              >
                <CharacterPortrait character={char} size={40} />
                <span className="text-xs text-stone-200 truncate w-full">{char.nickname}</span>
                <span className="text-[10px] text-stone-500 truncate w-full">{char.title}</span>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: GRADE_COLORS[char.grade] }}
                >
                  {char.grade}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 선택된 캐릭터 상세 */}
        <div className="border border-stone-700 rounded p-4 bg-stone-800/50">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CharacterPortrait character={selected} size={56} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-stone-100">{selected.nickname}</span>
                    <span className="text-xs font-bold" style={{ color: GRADE_COLORS[selected.grade] }}>{selected.grade}</span>
                  </div>
                  <p className="text-xs text-stone-400">{selected.title}</p>
                  <p className="text-xs text-stone-500">
                    {CLASS_INFO[selected.unitClass].icon} {CLASS_INFO[selected.unitClass].name}
                    {' · '}
                    {REGIONS.find(r => r.id === NATIONALITY_TO_REGION[selected.nationality])?.name ?? '미정'}
                  </p>
                </div>
              </div>

              {/* 스탯 바 */}
              <div className="space-y-1.5">
                {(Object.keys(STAT_LABELS) as (keyof typeof STAT_LABELS)[]).map(key => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="w-12 text-stone-400">{STAT_LABELS[key].icon} {STAT_LABELS[key].name}</span>
                    <div className="flex-1 h-2 bg-stone-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${selected.stats[key] * 10}%`,
                          backgroundColor: selected.stats[key] >= 8 ? '#fbbf24' : selected.stats[key] >= 5 ? '#60a5fa' : '#6b7280',
                        }}
                      />
                    </div>
                    <span className="w-5 text-right text-stone-300">{selected.stats[key]}</span>
                  </div>
                ))}
              </div>

              {/* 전투 정보 */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-stone-900 rounded p-1.5 text-center">
                  <div className="text-stone-500">HP</div>
                  <div className="text-stone-200 font-bold">{selected.hp}</div>
                </div>
                <div className="bg-stone-900 rounded p-1.5 text-center">
                  <div className="text-stone-500">병사</div>
                  <div className="text-stone-200 font-bold">{selected.troops}/{selected.maxTroops}</div>
                </div>
                <div className="bg-stone-900 rounded p-1.5 text-center">
                  <div className="text-stone-500">충성</div>
                  <div className={`font-bold ${selected.loyaltyValue >= 80 ? 'text-green-400' : selected.loyaltyValue >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                    {selected.loyaltyValue}
                  </div>
                </div>
              </div>

              <div className="text-xs text-stone-500 space-y-1">
                <p className="text-stone-400 leading-relaxed">{selected.bio}</p>
                {selected.quotes && <p className="italic text-stone-500">&ldquo;{selected.quotes}&rdquo;</p>}
              </div>

              <button
                onClick={() => onComplete(selected.id, difficulty)}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold rounded transition-colors"
              >
                {selected.nickname}(으)로 시작
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-stone-500 text-sm">
              주군으로 삼을 인물을 선택하세요
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

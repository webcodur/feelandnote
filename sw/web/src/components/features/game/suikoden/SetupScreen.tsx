'use client'

import { useState, useMemo } from 'react'
import type { GameCharacter, Era, WorldPreview, Faction } from '@/lib/game/suikoden/types'
import { GRADE_COLORS, CLASS_INFO, REGIONS, NATIONALITY_TO_REGION, ERA_CONFIG, PLAYER_GRADE_THRESHOLD } from '@/lib/game/suikoden/constants'
import { getBirthYear, getEffectiveGradeScore, getEffectiveGrade } from '@/lib/game/suikoden/utils'
import CharacterPortrait from './CharacterPortrait'
import StatBars from './StatBars'

interface Props {
  characters: GameCharacter[]
  worldPreview: WorldPreview | null
  onPreviewWorld: (difficulty: 'easy' | 'normal' | 'hard', era: Era) => void
  onComplete: (leaderId: string) => void
  onBack: () => void
}

function isCharInEra(c: GameCharacter, era: Era): boolean {
  const year = getBirthYear(c.birthDate)
  if (era === 'ancient') return year <= 500
  if (era === 'medieval') return year > 500 && year <= 1500
  return year > 1500
}

function countEraWanderers(characters: GameCharacter[], era: Era): number {
  return characters.filter(c => isCharInEra(c, era) && getEffectiveGradeScore(c) < PLAYER_GRADE_THRESHOLD).length
}

export default function SetupScreen({ characters, worldPreview, onPreviewWorld, onComplete, onBack }: Props) {
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal')
  const [era, setEra] = useState<Era>('ancient')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  // 1단계: 시대별 방랑자 수 미리 표시
  const eraWandererCounts = useMemo(() => ({
    ancient: countEraWanderers(characters, 'ancient'),
    medieval: countEraWanderers(characters, 'medieval'),
    modern: countEraWanderers(characters, 'modern'),
  }), [characters])

  const noWanderers = eraWandererCounts[era] === 0

  // 2단계 진입 여부
  const isStep2 = worldPreview !== null

  // 2단계: 방랑자 필터링 (시대 내 캐릭터만)
  const wanderers = useMemo(() => {
    if (!worldPreview) return []
    const base = worldPreview.wanderers.filter(c => isCharInEra(c, worldPreview.era))
    if (!filter) return base.slice(0, 60)
    const lower = filter.toLowerCase()
    return base.filter(c =>
      c.nickname.toLowerCase().includes(lower) ||
      c.title.toLowerCase().includes(lower)
    ).slice(0, 60)
  }, [worldPreview, filter])

  const selected = worldPreview?.wanderers.find(c => c.id === selectedId)

  // ── 1단계: 시대 + 난이도 선택 ──
  if (!isStep2) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-stone-500 hover:text-stone-300 text-sm">← 뒤로</button>
          <h2 className="text-lg font-bold text-stone-200">세력 구성</h2>
          <div />
        </div>

        {/* 시대 선택 */}
        <div className="space-y-2">
          <div className="text-xs text-stone-500 text-center">시대 선택</div>
          <div className="flex gap-2 justify-center">
            {(['ancient', 'medieval', 'modern'] as Era[]).map(e => {
              const cfg = ERA_CONFIG[e]
              const wCount = eraWandererCounts[e]
              return (
                <button
                  key={e}
                  onClick={() => setEra(e)}
                  className={`px-4 py-2 rounded text-sm border transition-colors flex flex-col items-center gap-0.5 ${
                    era === e
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-stone-700 text-stone-500 hover:border-stone-500'
                  }`}
                >
                  <span>{cfg.icon} {cfg.name}</span>
                  <span className="text-[10px] text-stone-600">방랑자 {wCount}명</span>
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-stone-600 text-center">{ERA_CONFIG[era].description}</p>
        </div>

        {/* 난이도 */}
        <div className="space-y-2">
          <div className="text-xs text-stone-500 text-center">난이도</div>
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
        </div>

        {/* 안내 */}
        <div className="text-center text-xs text-stone-600 space-y-1">
          <p>강한 인물들이 이미 세력을 구축한 세계에서</p>
          <p>약한 인물로 시작하여 천하를 통일하라.</p>
        </div>

        {noWanderers && (
          <div className="text-center text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-3">
            해당 시대에 선택 가능한 방랑자가 없습니다. 다른 시대를 선택하세요.
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={() => onPreviewWorld(difficulty, era)}
            disabled={noWanderers}
            className={`px-8 py-3 font-bold rounded transition-colors ${
              noWanderers
                ? 'bg-stone-700 text-stone-500 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-500 text-stone-900'
            }`}
          >
            세력 확인
          </button>
        </div>
      </div>
    )
  }

  // ── 2단계: AI 세력 미리보기 + 방랑자 선택 ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-stone-500 hover:text-stone-300 text-sm">← 뒤로</button>
        <h2 className="text-lg font-bold text-stone-200">주군 선택</h2>
        <div className="text-xs text-stone-600">
          {ERA_CONFIG[worldPreview.era].icon} {ERA_CONFIG[worldPreview.era].name}
          {' · '}
          {{ easy: '쉬움', normal: '보통', hard: '어려움' }[worldPreview.difficulty]}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 좌: AI 세력 미리보기 */}
        <div className="space-y-2">
          <div className="text-xs text-stone-500 font-bold">기존 세력 ({worldPreview.aiFactions.length})</div>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {worldPreview.aiFactions.map(f => {
              const leader = f.members.find(m => m.id === f.leaderId)
              return (
                <div key={f.id} className="flex items-center gap-2 p-2 rounded border border-stone-700 bg-stone-800/50">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
                  {leader && <CharacterPortrait character={leader} size={28} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-stone-200 truncate">{f.name}</div>
                    <div className="text-[10px] text-stone-500">
                      {f.territories[0]?.name} · {f.members.length}명
                    </div>
                  </div>
                  {leader && (
                    <span className="text-[10px] font-bold flex-shrink-0" style={{ color: GRADE_COLORS[getEffectiveGrade(leader)] }}>
                      {getEffectiveGrade(leader)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 중: 방랑자 그리드 */}
        <div className="lg:col-span-2 space-y-2">
          <div className="text-xs text-stone-500 font-bold">
            방랑자 (선택 가능 {wanderers.length}명)
          </div>
          <input
            type="text"
            placeholder="인물 검색..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded text-sm text-stone-200 placeholder-stone-500 focus:border-amber-500/50 outline-none"
          />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto pr-1">
            {wanderers.map(char => (
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
                  style={{ color: GRADE_COLORS[getEffectiveGrade(char)] }}
                >
                  {getEffectiveGrade(char)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 우: 선택된 캐릭터 상세 */}
        <div className="border border-stone-700 rounded p-4 bg-stone-800/50">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CharacterPortrait character={selected} size={56} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-stone-100">{selected.nickname}</span>
                    <span className="text-xs font-bold" style={{ color: GRADE_COLORS[getEffectiveGrade(selected)] }}>
                      {getEffectiveGrade(selected)}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">{selected.title}</p>
                  <p className="text-xs text-stone-500">
                    {CLASS_INFO[selected.unitClass].icon} {CLASS_INFO[selected.unitClass].name}
                    {' · '}
                    {REGIONS.find(r => r.id === NATIONALITY_TO_REGION[selected.nationality])?.name ?? '미정'}
                  </p>
                </div>
              </div>

              <StatBars stats={selected.stats} />

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
                onClick={() => onComplete(selected.id)}
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

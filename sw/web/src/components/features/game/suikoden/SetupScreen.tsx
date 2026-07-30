'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { GameCharacter, WorldPreview, ScenarioDef } from '@/lib/game/suikoden/types'
import { GRADE_COLORS, CLASS_INFO, REGIONS, NATIONALITY_TO_REGION } from '@/lib/game/suikoden/constants'
import { getEffectiveGrade } from '@/lib/game/suikoden/utils'
import { getMissingScenarioCharacterIds, SCENARIOS } from '@/lib/game/suikoden/scenarios'
import CharacterPortrait from './CharacterPortrait'
import CharacterInfoPanel from './CharacterInfoPanel'

interface Props {
  characters: GameCharacter[]
  worldPreview: WorldPreview | null
  onSelectScenario: (scenario: ScenarioDef) => void
  onComplete: (leaderId: string) => void
  onBack: () => void
}

const ERA_ICONS: Record<string, string> = {
  ancient: '🏛️',
  medieval: '🏰',
  modern: '🏭',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-green-400',
  normal: 'text-amber-400',
  hard: 'text-red-400',
}

export default function SetupScreen({ characters, worldPreview, onSelectScenario, onComplete, onBack }: Props) {
  const tS = useTranslations('rest.arena.suikoden')
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)

  const isStep2 = worldPreview !== null
  const loadedCharacterIds = new Set(characters.map(character => character.id))

  const selectedCandidate = worldPreview?.playerCandidates.find(pc => pc.profileId === selectedCandidateId)

  // ── 1단계: 시나리오 선택 ──
  if (!isStep2) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button onClick={onBack} className="shrink-0 text-sm text-text-secondary hover:text-text-primary">{tS('setup.back')}</button>
          <h2 className="min-w-0 flex-1 text-center text-lg font-bold text-text-primary">{tS('setup.selectScenario')}</h2>
          <div className="hidden w-12 sm:block" />
        </div>

        <div className="text-center text-xs text-text-secondary space-y-1">
          <p>{tS('setup.scenarioHint1')}</p>
          <p>{tS('setup.scenarioHint2')}</p>
        </div>

        <div className="space-y-3">
          {SCENARIOS.map((scenario) => {
            const dc = DIFFICULTY_COLORS[scenario.difficulty]
            const missingCharacterIds = getMissingScenarioCharacterIds(scenario, loadedCharacterIds)
            const isAvailable = missingCharacterIds.length === 0
            return (
              <button
                key={scenario.id}
                onClick={() => isAvailable && onSelectScenario(scenario)}
                disabled={!isAvailable}
                className={`w-full text-left p-4 rounded-lg border ${
                  isAvailable
                    ? 'border-stone-700 bg-stone-800/50 hover:border-amber-500/50 hover:bg-stone-800 group'
                    : 'border-red-900/40 bg-red-950/20 opacity-70 cursor-not-allowed'
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="text-2xl flex-shrink-0 mt-0.5">{ERA_ICONS[scenario.era]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="min-w-0 break-words font-bold text-text-primary group-hover:text-amber-300">
                        {tS(`scenario.${scenario.id}.name`)}
                      </span>
                      <span className={`text-[10px] font-bold ${dc}`}>{tS(`setup.diff${scenario.difficulty.charAt(0).toUpperCase()}${scenario.difficulty.slice(1)}` as 'setup.diffEasy')}</span>
                      <span className="text-[10px] text-text-secondary">{tS(`era.${scenario.era}`)}</span>
                    </div>
                    <p className="mt-0.5 break-words text-xs text-text-secondary">{tS(`scenario.${scenario.id}.subtitle`)}</p>
                    <p className="mt-1.5 break-words text-[11px] leading-relaxed text-text-secondary">{tS(`scenario.${scenario.id}.desc`)}</p>
                    <p className="mt-2 break-words text-[11px] font-bold text-amber-300">
                      {tS('setup.objectiveLabel')}: {tS(`scenario.${scenario.id}.objective`)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-text-secondary">
                      <span>{tS('setup.lordCount', { count: scenario.playerCandidates.length })}</span>
                      <span>{tS('setup.aiFactionCount', { count: scenario.aiFactions.length })}</span>
                      <span>{tS('setup.wandererCount', { count: scenario.wandererIds.length })}</span>
                    </div>
                    {!isAvailable && (
                      <p className="mt-2 break-words text-[11px] font-bold text-red-300">
                        {tS('missingCharacters', { count: missingCharacterIds.length })}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── 2단계: 주군 선택 ──
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onBack} className="shrink-0 text-sm text-text-secondary hover:text-text-primary">{tS('setup.back')}</button>
        <h2 className="min-w-0 flex-1 text-center text-lg font-bold text-text-primary">{tS('setup.selectLord')}</h2>
        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-x-1 text-xs text-text-secondary sm:w-auto">
          <span>{ERA_ICONS[worldPreview.era]} {tS(`era.${worldPreview.era}`)}</span>
          <span>·</span>
          <span className={DIFFICULTY_COLORS[worldPreview.difficulty]}>
            {tS(`setup.diff${worldPreview.difficulty.charAt(0).toUpperCase()}${worldPreview.difficulty.slice(1)}` as 'setup.diffEasy')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 좌: AI 세력 미리보기 */}
        <div className="space-y-2">
          <div className="text-xs text-text-secondary font-bold">{tS('setup.existingFactions')} ({worldPreview.aiFactions.length})</div>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {worldPreview.aiFactions.map(f => {
              const leader = f.members.find(m => m.id === f.leaderId)
              return (
                <div key={f.id} className="flex min-w-0 items-center gap-2 rounded border border-stone-700 bg-stone-800/50 p-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
                  {leader && <CharacterPortrait character={leader} size={28} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-text-primary truncate">{f.name}</div>
                    <div className="flex flex-wrap gap-x-1 text-[10px] text-text-secondary">
                      <span className="min-w-0 break-words">{f.territories[0]?.name}</span>
                      <span>· {tS('setup.memberCount', { count: f.members.length })}</span>
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

          {/* 방랑자 목록 */}
          {worldPreview.wanderers.length > 0 && (
            <>
              <div className="text-xs text-text-secondary font-bold mt-3">{tS('setup.wanderers')} ({worldPreview.wanderers.length})</div>
              <div className="space-y-1 max-h-[20vh] overflow-y-auto pr-1">
                {worldPreview.wanderers.map(w => (
                  <div key={w.id} className="flex min-w-0 flex-wrap items-center gap-2 rounded bg-stone-800/30 px-2 py-1">
                    <CharacterPortrait character={w} size={20} />
                    <span className="min-w-0 flex-1 truncate text-[11px] text-text-secondary">{w.nickname}</span>
                    <span className="min-w-0 break-words text-[10px] text-text-secondary">{w.title}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 중: 주군 후보 카드 */}
        <div className="lg:col-span-2 space-y-2">
          <div className="text-xs text-text-secondary font-bold">{tS('setup.lordCandidates')}</div>
          <div className="space-y-3">
            {worldPreview.playerCandidates.map(pc => {
              const isSelected = selectedCandidateId === pc.profileId
              const grade = getEffectiveGrade(pc.character)
              const classInfo = CLASS_INFO[pc.character.unitClass]
              return (
                <button
                  key={pc.profileId}
                  onClick={() => setSelectedCandidateId(pc.profileId)}
                  className={`w-full text-left p-4 rounded-lg border ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/5'
                      : 'border-stone-700 hover:border-stone-500 bg-stone-800/50'
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <CharacterPortrait character={pc.character} size={56} />
                    <div className="flex-1 min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="min-w-0 break-words font-bold text-text-primary">{pc.character.nickname}</span>
                        <span
                          className="text-xs font-bold"
                          style={{ color: GRADE_COLORS[grade] }}
                        >
                          {grade}
                        </span>
                        <span className="break-words rounded px-1.5 py-0.5 text-[10px]" style={{ color: classInfo.color, backgroundColor: `${classInfo.color}15` }}>
                          {classInfo.icon} {tS(`class.${pc.character.unitClass}`)}
                        </span>
                      </div>
                      <p className="mt-0.5 break-words text-xs text-text-secondary">{pc.character.title}</p>
                      <p className="mt-1.5 break-words text-[11px] leading-relaxed text-text-secondary">{tS(`scenario.${worldPreview.scenarioId}.cand${worldPreview.playerCandidates.indexOf(pc) + 1}`)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-text-secondary">
                        <span>{tS('stat.command')} {pc.character.stats.command}</span>
                        <span>{tS('stat.martial')} {pc.character.stats.martial}</span>
                        <span>{tS('stat.intellect')} {pc.character.stats.intellect}</span>
                        <span>{tS('stat.charm')} {pc.character.stats.charm}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 우: 선택된 주군 상세 + 시작 버튼 */}
        <div className="border border-stone-700 rounded bg-stone-800/50">
          {selectedCandidate ? (
            <CharacterInfoPanel
              character={selectedCandidate.character}
              badge={REGIONS.find(r => r.id === NATIONALITY_TO_REGION[selectedCandidate.character.nationality])?.name ?? tS('setup.undecided')}
              portraitSize={56}
              footer={
                <div className="px-3 pb-3">
                  <button
                    onClick={() => onComplete(selectedCandidate.profileId)}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold rounded"
                  >
                    {tS('setup.startAs', { name: selectedCandidate.character.nickname })}
                  </button>
                </div>
              }
            />
          ) : (
            <div className="flex items-center justify-center h-full text-text-secondary text-sm p-4">
              {tS('setup.selectLordPrompt')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

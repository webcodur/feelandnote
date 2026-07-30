'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { GameCharacter, GameState, Stats } from '@/lib/game/suikoden/types'
import {
  BUILDINGS, GRADE_COLORS, CLASS_INFO,
  ABILITY_STAT_KEYS, VIRTUE_STAT_KEYS,
  DISPOSITION_KEYS,
} from '@/lib/game/suikoden/constants'
import CharacterPortrait from './CharacterPortrait'

// ── 공통 Props ──

interface BaseProps {
  /** 헤더 우측 닫기 버튼 */
  onClose?: () => void
  /** 헤더에 추가 표시할 배지 텍스트 */
  badge?: string
  /** 초상화 크기 (기본 44) */
  portraitSize?: number
  /** 헤더 아래 커스텀 영역 (셋업 화면의 "시작" 버튼 등) */
  footer?: React.ReactNode
}

interface ReadonlyProps extends BaseProps {
  character: GameCharacter
  state?: undefined
  selectedCharId?: undefined
  onIdle?: undefined
  onTrain?: undefined
  onReward?: undefined
  onPunish?: undefined
  onReinforce?: undefined
}

interface FullProps extends BaseProps {
  character?: undefined
  state: GameState
  selectedCharId: string | null
  onIdle: () => void
  onTrain: () => void
  onReward: () => void
  onPunish: () => void
  onReinforce: () => void
}

export type CharacterInfoPanelProps = ReadonlyProps | FullProps

// ── 탭 정의 ──

type Tab = 'ability' | 'status' | 'relation' | 'troops' | 'items' | 'bio'

type TranslationFn = (key: string, params?: Record<string, string | number | Date>) => string

// ── 서브 컴포넌트 ──

function StatRow({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[10px] text-text-secondary">{label}</span>
      <span className={`text-[10px] font-bold tabular-nums ${color ?? 'text-text-primary'}`}>{value}</span>
    </div>
  )
}

/** snake_case → camelCase */
function toCamelCase(s: string) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/** 능력 -- 라벨 + 바 + 수치 */
function AbilityRow({ statKey, stats, tS }: { statKey: string; stats: Stats; tS: TranslationFn }) {
  const val = stats[statKey as keyof Stats] as number
  return (
    <div className="flex items-center gap-1.5" title={tS(`statDesc.${statKey}`)}>
      <span className="text-[10px] text-text-secondary w-5 shrink-0">{tS(`stat.${statKey}`)}</span>
      <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-blue-400" style={{ width: `${val}%` }} />
      </div>
      <span className="text-[10px] font-bold text-text-primary w-5 text-right tabular-nums">{val}</span>
    </div>
  )
}

function VirtueRow({ statKey, stats, tS }: { statKey: string; stats: Stats; tS: TranslationFn }) {
  const val = stats[statKey as keyof Stats] as number
  return (
    <div className="flex items-center gap-1" title={tS(`statDesc.${statKey}`)}>
      <span className="text-[10px] text-text-secondary w-5 shrink-0">{tS(`stat.${statKey}`)}</span>
      <div className="flex-1 h-1 bg-stone-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-blue-400" style={{ width: `${val}%` }} />
      </div>
      <span className="text-[10px] text-text-secondary w-4 text-right tabular-nums">{val}</span>
    </div>
  )
}

function DispositionRow({ statKey, stats, tS }: { statKey: string; stats: Stats; tS: TranslationFn }) {
  const dispKey = toCamelCase(statKey)
  const val = stats[statKey as keyof Stats] as number
  const pct = ((val + 50) / 100) * 100
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] text-text-secondary w-6 text-right shrink-0">{tS(`disp.${dispKey}.neg`)}</span>
      <div className="flex-1 h-1.5 bg-stone-700 rounded-full overflow-hidden relative">
        <div className="absolute left-1/2 top-0 w-px h-full bg-stone-600" />
        <div
          className="absolute top-0 h-full w-1.5 rounded-full bg-amber-400"
          style={{ left: `calc(${pct}% - 3px)` }}
        />
      </div>
      <span className="text-[9px] text-text-secondary w-6 shrink-0">{tS(`disp.${dispKey}.pos`)}</span>
    </div>
  )
}

// ── 능력 탭 (공통) ──

function AbilityTab({ stats, tS }: { stats: Stats; tS: TranslationFn }) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-[9px] text-text-secondary font-medium mb-1">{tS('charInfo.sectionAbility')}</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {ABILITY_STAT_KEYS.map(key => (
            <AbilityRow key={key} statKey={key} stats={stats} tS={tS} />
          ))}
        </div>
      </div>
      <div>
        <div className="text-[9px] text-text-secondary font-medium mb-1">{tS('charInfo.sectionVirtue')}</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {VIRTUE_STAT_KEYS.map(key => (
            <VirtueRow key={key} statKey={key} stats={stats} tS={tS} />
          ))}
        </div>
      </div>
      <div>
        <div className="text-[9px] text-text-secondary font-medium mb-1">{tS('charInfo.sectionDisposition')}</div>
        <div className="space-y-1">
          {DISPOSITION_KEYS.map(key => (
            <DispositionRow key={key} statKey={key} stats={stats} tS={tS} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 열전 탭 (공통) ──

function BioTab({ char, tS }: { char: GameCharacter; tS: TranslationFn }) {
  return (
    <div className="space-y-2">
      {char.bio && <p className="text-[10px] text-text-secondary leading-relaxed">{char.bio}</p>}
      {char.quotes && <p className="text-[10px] italic text-text-secondary">{char.quotes}</p>}
      {!char.bio && !char.quotes && (
        <p className="text-[10px] text-text-secondary text-center py-4">{tS('charInfo.noBio')}</p>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ──

export default function CharacterInfoPanel(props: CharacterInfoPanelProps) {
  const tS = useTranslations('rest.arena.suikoden')
  const isReadonly = !!props.character
  const [tab, setTab] = useState<Tab>('ability')

  const TABS_FULL: { key: Tab; label: string }[] = [
    { key: 'ability', label: tS('charInfo.tabAbility') },
    { key: 'status', label: tS('charInfo.tabStatus') },
    { key: 'relation', label: tS('charInfo.tabRelation') },
    { key: 'troops', label: tS('charInfo.tabTroops') },
    { key: 'items', label: tS('charInfo.tabItems') },
    { key: 'bio', label: tS('charInfo.tabBio') },
  ]

  const TABS_READONLY: { key: Tab; label: string }[] = [
    { key: 'ability', label: tS('charInfo.tabAbility') },
    { key: 'troops', label: tS('charInfo.tabTroops') },
    { key: 'bio', label: tS('charInfo.tabBio') },
  ]

  // readonly 모드: character 직접 전달
  // full 모드: state에서 추출
  const char = isReadonly
    ? props.character!
    : (() => {
        const pf = props.state!.factions.find(f => f.id === props.state!.playerFactionId)!
        return props.selectedCharId ? pf.members.find(m => m.id === props.selectedCharId) ?? null : null
      })()

  if (!char) {
    return (
      <div className="p-4 opacity-40">
        <p className="text-[10px] text-text-secondary text-center py-6">{tS('charInfo.selectCharPrompt')}</p>
      </div>
    )
  }

  // full 모드 전용 데이터
  const playerFaction = !isReadonly ? props.state!.factions.find(f => f.id === props.state!.playerFactionId)! : null
  const territory = playerFaction?.territories.find(t => t.id === props.state!.viewingTerritoryId)
  const placement = !isReadonly ? props.state!.placements.find(p => p.characterId === props.selectedCharId) : null
  const hasTrainingGround = territory?.buildingCards.some(c => c.defId === 'training' && !c.isConstructing) ?? false
  const isLeader = !isReadonly && props.selectedCharId === playerFaction?.leaderId

  const taskLabels: Record<string, string> = {
    idle: tS('charInfo.taskIdle'), building: tS('charInfo.taskBuilding'), working: tS('charInfo.taskWorking'), training: tS('charInfo.taskTraining'),
  }
  const taskText = placement ? (taskLabels[placement.task] ?? placement.task) : ''
  const assignedBuilding = placement?.assignedBuildingId
    ? territory?.buildingCards.find(c => c.instanceId === placement.assignedBuildingId)
    : null
  const bDef = assignedBuilding ? BUILDINGS.find(b => b.id === assignedBuilding.defId) : null

  const tabs = isReadonly ? TABS_READONLY : TABS_FULL

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-3 p-3 border-b border-stone-700">
        <CharacterPortrait character={char} size={props.portraitSize ?? 44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-stone-100 truncate">{char.nickname}</span>
            <span className="text-[10px] font-bold" style={{ color: GRADE_COLORS[char.grade] }}>{char.grade}</span>
          </div>
          <p className="text-[10px] text-text-secondary">{char.title}</p>
          <p className="text-[10px] text-text-secondary">
            {CLASS_INFO[char.unitClass].icon} {tS(`class.${char.unitClass}`)}
            {props.badge && <span className="ml-1 text-amber-400">· {props.badge}</span>}
          </p>
        </div>
        {props.onClose && (
          <button onClick={props.onClose} className="text-text-secondary hover:text-text-secondary text-sm shrink-0">✕</button>
        )}
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-stone-700 overflow-x-auto scrollbar-none">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 px-2 py-1.5 text-[10px] font-medium ${
              tab === t.key
                ? 'text-amber-400 border-b border-amber-400'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="px-3 py-2">
        {tab === 'ability' && <AbilityTab stats={char.stats} tS={tS} />}

        {tab === 'status' && !isReadonly && placement && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-secondary">{tS('charInfo.taskLabel')}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-text-primary">{taskText}{bDef ? ` — ${tS(`bldg.${bDef.id}`)}` : ''}</span>
                {placement.task !== 'idle' && (
                  <button onClick={props.onIdle} className="px-1.5 py-0.5 bg-stone-700 rounded text-text-secondary hover:bg-stone-600 text-[9px]">
                    {tS('charInfo.stopTask')}
                  </button>
                )}
              </div>
            </div>
            <StatRow label="HP" value={`${char.hp}/${char.maxHp}`} />
            <StatRow label={tS('charInfo.moraleLabel')} value={char.morale} />
            {!isLeader && (
              <StatRow
                label={tS('charInfo.loyaltyLabel')}
                value={char.loyaltyValue}
                color={char.loyaltyValue >= 80 ? 'text-green-400' : char.loyaltyValue >= 50 ? 'text-amber-400' : 'text-red-400'}
              />
            )}
            <div className="pt-1 space-y-1.5">
              {placement.task === 'idle' && hasTrainingGround && (
                <button onClick={props.onTrain} className="w-full py-1.5 text-xs text-text-primary bg-stone-700 rounded hover:bg-stone-600">
                  {tS('charInfo.startTraining')}
                </button>
              )}
              {placement.task === 'idle' && !hasTrainingGround && (
                <p className="text-[9px] text-text-secondary text-center">{tS('charInfo.trainingHint')}</p>
              )}
              {!isLeader && (
                <div className="flex gap-1">
                  <button
                    onClick={props.onReward}
                    disabled={playerFaction!.resources.gold < 50}
                    className="flex-1 py-1.5 text-xs bg-stone-700 rounded text-amber-300 hover:bg-stone-600 disabled:opacity-30"
                  >
                    {tS('charInfo.reward')}
                  </button>
                  <button
                    onClick={props.onPunish}
                    className="flex-1 py-1.5 text-xs bg-stone-700 rounded text-red-300 hover:bg-stone-600"
                  >
                    {tS('charInfo.punish')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'relation' && (
          <div className="py-4">
            <p className="text-[10px] text-text-secondary text-center">{tS('charInfo.preparing')}</p>
          </div>
        )}

        {tab === 'troops' && (
          <div className="space-y-1">
            <StatRow label="HP" value={`${char.hp}/${char.maxHp}`} />
            <StatRow label={tS('charInfo.troopsLabel')} value={`${char.troops}/${char.maxTroops}`} />
            {!isReadonly && <StatRow label={tS('charInfo.reserveTroops')} value={playerFaction!.resources.troops} />}
            <StatRow label={tS('charInfo.moraleLabel')} value={char.morale} />
            {!isReadonly && !isLeader && (
              <StatRow
                label={tS('charInfo.loyaltyLabel')}
                value={char.loyaltyValue}
                color={char.loyaltyValue >= 80 ? 'text-green-400' : char.loyaltyValue >= 50 ? 'text-amber-400' : 'text-red-400'}
              />
            )}
            {!isReadonly && (() => {
              const amount = Math.min(playerFaction!.resources.troops, char.maxTroops - char.troops)
              return (
                <div className="pt-2 space-y-1">
                  <button
                    onClick={props.onReinforce}
                    disabled={amount <= 0}
                    className="w-full py-1.5 text-xs font-bold text-red-100 bg-red-900/50 border border-red-700 rounded hover:bg-red-800/60 hover:border-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {tS('charInfo.reinforce', { count: Math.max(0, amount) })}
                  </button>
                  {char.troops >= char.maxTroops && (
                    <p className="text-[9px] text-text-secondary text-center">{tS('charInfo.troopsFull')}</p>
                  )}
                  {char.troops < char.maxTroops && playerFaction!.resources.troops <= 0 && (
                    <p className="text-[9px] text-text-secondary text-center">{tS('charInfo.noReserveTroops')}</p>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {tab === 'items' && (
          <div className="space-y-1.5">
            {(['weapons', 'horses', 'ships', 'charms'] as const).map(key => {
              const icons: Record<string, string> = { weapons: '⚔️', horses: '🐎', ships: '⛵', charms: '📿' }
              const maxValues: Record<string, number> = { weapons: 10000, horses: 1000, ships: 1000, charms: 1000 }
              const val = char.equipment[key]
              const max = maxValues[key]
              return (
                <div key={key} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-secondary">{icons[key]} {tS(`equip.${key}`)}</span>
                    <span className="text-[10px] text-text-primary">{val.toLocaleString()}/{max.toLocaleString()}</span>
                  </div>
                  <div className="h-1 bg-stone-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500/70 rounded-full" style={{ width: `${Math.min(100, val / max * 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'bio' && <BioTab char={char} tS={tS} />}
      </div>

      {/* 커스텀 푸터 */}
      {props.footer}
    </div>
  )
}

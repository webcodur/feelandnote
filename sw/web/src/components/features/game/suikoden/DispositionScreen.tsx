'use client'

import { useState, useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { GameState, DispositionAction } from '@/lib/game/suikoden/types'
import { calcRecruitRate, applyDisposition, finalizeDisposition } from '@/lib/game/suikoden/engine'
import CharacterPortrait from './CharacterPortrait'
import { getSuikodenText, stripSuikodenFactionSuffix } from './i18n'

interface Props {
  state: GameState
  onUpdateState: (fn: (s: GameState) => GameState) => void
}

export default function DispositionScreen({ state, onUpdateState }: Props) {
  const locale = useLocale()
  const tS = useTranslations('rest.arena.suikoden')
  const text = getSuikodenText(locale)
  const disp = state.disposition!
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [acting, setActing] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const actionInfo: Record<DispositionAction, { label: string; color: string; desc: string }> = {
    recruit: { ...text.disposition.action.recruit, color: 'bg-blue-600 hover:bg-blue-500' },
    imprison: { ...text.disposition.action.imprison, color: 'bg-stone-600 hover:bg-stone-500' },
    execute: { ...text.disposition.action.execute, color: 'bg-red-700 hover:bg-red-600' },
    release: { ...text.disposition.action.release, color: 'bg-green-700 hover:bg-green-600' },
  }

  const isComplete = disp.currentIndex >= disp.targets.length
  const current = !isComplete ? disp.targets[disp.currentIndex] : null

  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)!
  const recruitRate = current ? calcRecruitRate(playerFaction, current) : 0

  const handleAction = useCallback((action: DispositionAction) => {
    if (acting || !current) return
    setActing(true)

    onUpdateState(s => {
      const { state: ns, result } = applyDisposition(s, current.character.id, action)

      // 결과 메시지
      if (action === 'recruit') {
        setResultMsg(result.success
          ? text.disposition.recruitSuccess(result.characterName)
          : text.disposition.recruitFail(result.characterName))
      } else {
        setResultMsg(text.disposition.genericResult(result.characterName, action))
      }

      return ns
    })

    // 결과 연출 후 다음으로
    setTimeout(() => {
      setResultMsg(null)
      setActing(false)
      // 마지막이면 요약 표시
      onUpdateState(s => {
        if (s.disposition && s.disposition.currentIndex >= s.disposition.targets.length) {
          setShowSummary(true)
        }
        return s
      })
    }, 1200)
  }, [acting, current, onUpdateState])

  const handleFinish = useCallback(() => {
    onUpdateState(s => finalizeDisposition(s))
  }, [onUpdateState])

  // 요약 화면
  if (showSummary || isComplete) {
      const results = disp.results
      return (
        <div className="space-y-4">
          <h2 className="text-center text-lg font-bold text-stone-200">{text.disposition.summaryTitle}</h2>
          <div className="space-y-1.5">
            {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-stone-800 border border-stone-700 rounded text-xs">
              <span className="text-stone-200">{r.characterName}</span>
              <span className={
                r.action === 'recruit' && r.success ? 'text-blue-400' :
                r.action === 'recruit' && !r.success ? 'text-stone-500' :
                r.action === 'imprison' ? 'text-stone-400' :
                r.action === 'execute' ? 'text-red-400' :
                'text-green-400'
              }>
                {r.action === 'recruit'
                  ? (r.success ? text.disposition.summaryResult.recruit.success : text.disposition.summaryResult.recruit.failure)
                  : text.disposition.summaryResult[r.action].plain}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={handleFinish}
          className="w-full py-2.5 bg-amber-600 rounded text-sm text-stone-900 font-bold hover:bg-amber-500"
        >
          {text.disposition.back}
        </button>
      </div>
    )
  }

  if (!current) return null

  const char = current.character
  const originFaction = state.factions.find(f => f.id === current.factionId)

  return (
    <div className="space-y-4">
      {/* 진행 표시 */}
      <div className="flex items-center justify-between text-xs text-stone-400">
        <span className="font-bold text-stone-200">{text.disposition.title}</span>
        <span>{disp.currentIndex + 1} / {disp.targets.length}</span>
      </div>

      {/* 결과 연출 */}
      {resultMsg && (
        <div className="p-3 bg-stone-800 border border-amber-500/30 rounded text-center">
          <p className="text-sm text-amber-300 font-bold animate-pulse">{resultMsg}</p>
        </div>
      )}

      {/* 캐릭터 정보 */}
      {!resultMsg && (
        <>
          <div className="p-4 bg-stone-800 border border-stone-700 rounded space-y-3">
            <div className="flex items-center gap-3">
              <CharacterPortrait character={char} size={48} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-stone-200">{char.nickname}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-stone-700 rounded text-stone-400">{char.grade}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-0.5">
                  <span>{tS(`class.${char.unitClass}`)}</span>
                  <span>{char.title}</span>
                </div>
                {originFaction && (
                  <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: originFaction.color }} />
                    <span className="text-stone-500">{stripSuikodenFactionSuffix(originFaction.name)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 주요 스탯 */}
            <div className="grid grid-cols-4 gap-2 text-[10px]">
              {(['command', 'martial', 'intellect', 'charm'] as const).map(stat => (
                <div key={stat} className="text-center">
                  <div className="text-stone-500">{tS(`stat.${stat}`)}</div>
                  <div className="text-stone-300 font-bold">{char.stats[stat]}</div>
                </div>
              ))}
            </div>

            {/* 충성도/충의 */}
            <div className="flex items-center gap-4 text-[10px]">
              <span className="text-stone-500">{text.disposition.loyaltyValue} <span className="text-stone-300">{char.loyaltyValue}</span></span>
              <span className="text-stone-500">{text.disposition.loyaltyVirtue} <span className="text-stone-300">{char.stats.loyalty}</span></span>
            </div>

            {/* 등용 성공률 */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-stone-500">{text.disposition.recruitRate}</span>
              <div className="flex-1 h-2 bg-stone-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${recruitRate}%` }}
                />
              </div>
              <span className="text-xs font-bold text-blue-400">{recruitRate}%</span>
            </div>
          </div>

          {/* 행동 버튼 */}
          <div className="grid grid-cols-2 gap-2">
            {(['recruit', 'imprison', 'execute', 'release'] as DispositionAction[]).map(action => {
              const info = actionInfo[action]
              return (
                <button
                  key={action}
                  onClick={() => handleAction(action)}
                  disabled={acting}
                  className={`py-2.5 rounded text-sm text-stone-100 font-bold transition-colors disabled:opacity-40 ${info.color}`}
                >
                  <div>{info.label}</div>
                  <div className="text-[9px] font-normal text-stone-300/70 mt-0.5">{info.desc}</div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

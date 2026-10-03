/*
  천도 v2 — 판 하나: 방랑·전략·합전·결과를 상태에 따라 갈아 끼우고, 판 안 차림표(ESC)를 쥔다.
*/
'use client'

import { useEffect, useState } from 'react'
import { Volume2, VolumeX, Music } from 'lucide-react'
import type { GameState } from '@/lib/game/suikoden/types'
import BattleScreen from '../battle/BattleScreen'
import { useCheondo } from '../context'
import type { useSuikodenAudio } from '../hooks/useSuikodenAudio'
import { GameButton, PanelTitle } from '../ui/Frame'
import { Modal } from '../ui/Overlay'
import ResultScreen from './ResultScreen'
import StrategyScreen from './StrategyScreen'
import WanderScreen from './WanderScreen'

interface GameScreenProps {
  game: GameState
  setGame: (s: GameState) => void
  saveOk: boolean
  onTitle: () => void
  onExit: () => void
  audio: ReturnType<typeof useSuikodenAudio>
}

export default function GameScreen({ game, setGame, saveOk, onTitle, onExit, audio }: GameScreenProps) {
  const { T } = useCheondo()
  const [menu, setMenu] = useState(false)

  // 전투·결과 화면에서는 ESC가 차림표를 연다(전략 화면은 스스로 처리)
  useEffect(() => {
    if (game.phase === 'strategy' && !game.battle) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); setMenu(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game.phase, game.battle])

  let body
  if (game.outcome) body = <ResultScreen game={game} onTitle={onTitle} />
  else if (game.battle) body = <BattleScreen game={game} setGame={setGame} />
  else if (game.phase === 'wander' && game.wander) body = <WanderScreen game={game} setGame={setGame} onMenu={() => setMenu(true)} />
  else body = <StrategyScreen game={game} setGame={setGame} onMenu={() => setMenu(true)} />

  return (
    <>
      {body}
      {!saveOk && (
        <div role="status" className="pointer-events-none absolute left-1/2 top-14 z-30 w-[min(92vw,30rem)] -translate-x-1/2 border px-3 py-2 text-center text-[12px] font-bold" style={{ borderColor: 'rgba(200,69,45,0.6)', background: 'rgba(40,10,6,0.92)', color: '#ffd9cf' }}>
          {T.saveWarn}
        </div>
      )}
      <Modal open={menu} onClose={() => setMenu(false)} width={380} label={T.menu}>
        <PanelTitle title={T.menu} sub={saveOk ? T.saved : T.saveWarn} />
        <div className="flex flex-col gap-2 p-4">
          <GameButton variant="primary" onClick={() => setMenu(false)} className="w-full">{T.resume}</GameButton>
          <div className="grid grid-cols-2 gap-2">
            <GameButton onClick={audio.toggleBgmMuted} className="w-full" aria-pressed={!audio.bgmMuted}><Music size={14} />{audio.bgmMuted ? 'BGM OFF' : 'BGM ON'}</GameButton>
            <GameButton onClick={audio.toggleSfxMuted} className="w-full" aria-pressed={!audio.sfxMuted}>{audio.sfxMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}{audio.sfxMuted ? 'SFX OFF' : 'SFX ON'}</GameButton>
          </div>
          <GameButton onClick={() => { setMenu(false); onTitle() }} className="w-full">{T.toTitle}</GameButton>
          <GameButton variant="quiet" onClick={onExit} className="w-full">{T.exit}</GameButton>
        </div>
      </Modal>
    </>
  )
}

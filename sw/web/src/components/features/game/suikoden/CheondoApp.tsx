/*
  파일명: components/features/game/suikoden/CheondoApp.tsx
  기능: 천도 v2 최상위
  책임: 전체 화면 층을 띄우고, 인물 명부를 한 번 받아 제목 → 주군 고르기 → 판 → 결과로 잇는다.
        판이 바뀔 때마다 자동 저장하고 성도(인물 기록)를 갱신한다.
*/
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocale } from 'next-intl'
import { Z_INDEX } from '@/constants/zIndex'
import { setGameFullScreenLayer } from '@/components/layout/musicPlayerSlots'
import { useRegisterGameAudio } from '@/contexts/GameAudioContext'
import { recordCodex, recordLord } from '@/lib/game/suikoden/codex'
import { clearSave, loadGame, readSaveMeta, saveGame, type SaveMeta } from '@/lib/game/suikoden/save'
import type { Difficulty, GameState } from '@/lib/game/suikoden/types'
import { createGame } from '@/lib/game/suikoden/world'
import { CheondoContext, type CheondoCtx } from './context'
import { useRoster, useVoice } from './hooks/useCheondoData'
import { useSuikodenAudio } from './hooks/useSuikodenAudio'
import { getText, resolveLocale } from './i18n'
import CodexScreen from './screens/CodexScreen'
import GameScreen from './screens/GameScreen'
import HeroSheet from './panels/HeroSheet'
import HowToModal from './panels/HowToModal'
import LordSelect from './screens/LordSelect'
import TitleScreen from './screens/TitleScreen'
import { GameButton } from './ui/Frame'
import { Modal, ToastStack, useToasts } from './ui/Overlay'
import { INK } from './ui/theme'
import CHEONDO_CSS from './ui/styles'

type Screen = 'title' | 'select' | 'game' | 'codex'

interface CheondoAppProps {
  onExit: () => void
}

export default function CheondoApp({ onExit }: CheondoAppProps) {
  const locale = resolveLocale(useLocale())
  const T = getText(locale)
  const audio = useSuikodenAudio()
  useRegisterGameAudio(audio.audioControls)
  const { roster, status, retry } = useRoster()
  const [screen, setScreen] = useState<Screen>('title')
  const [game, setGame] = useState<GameState | null>(null)
  // 이 컴포넌트는 브라우저에서만 불러온다(SuikodenSlot의 dynamic ssr:false) — 저장 칸을 바로 읽어도 된다
  const [saveMeta, setSaveMeta] = useState<SaveMeta | null>(() => readSaveMeta())
  const [saveOk, setSaveOk] = useState(true)
  const [howTo, setHowTo] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)
  const [sheetHero, setSheetHero] = useState<string | null>(null)
  const { toasts, push } = useToasts()
  const voice = useVoice(locale, audio.sfxMuted)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // 자동 저장 + 성도 기록 — 판이 바뀔 때마다(잠깐 모아서)
  useEffect(() => {
    if (!game) return
    const id = window.setTimeout(() => {
      if (game.outcome) {
        clearSave()
        setSaveMeta(null)
      } else {
        const ok = saveGame(game)
        setSaveOk(ok)
        if (ok) setSaveMeta(readSaveMeta())
      }
      recordCodex(game)
    }, 350)
    return () => window.clearTimeout(id)
  }, [game])

  // 곡 고르기
  const bgmState = useMemo(() => {
    if (screen !== 'game' || !game) return screen === 'codex' ? 'codex' : screen === 'select' ? 'select' : 'title'
    if (game.outcome) return game.outcome.kind === 'unified' ? 'win' : 'lose'
    if (game.battle) return 'battle'
    return game.phase === 'wander' ? 'wander' : 'strategy'
  }, [screen, game])
  const { setBgm, stopAll } = audio
  useEffect(() => { setBgm(bgmState) }, [bgmState, setBgm])
  useEffect(() => () => stopAll(), [stopAll])

  const exit = useCallback(() => {
    stopAll()
    onExit()
  }, [onExit, stopAll])

  // ESC — 판 밖에서는 한 단계 뒤로
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (screen === 'select' || screen === 'codex') { setScreen('title'); return }
      if (screen === 'title' && !howTo) exit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, howTo, exit])

  const startNew = useCallback((lordId: string, difficulty: Difficulty) => {
    if (!roster) return
    const state = createGame(roster, { lordId, difficulty })
    recordLord(lordId)
    audio.sfx('start')
    setGame(state)
    setScreen('game')
  }, [roster, audio])

  const continueGame = useCallback(() => {
    if (!roster) return
    const state = loadGame(roster)
    if (!state) { setSaveMeta(null); push(T.toast.errors.default, 'bad'); return }
    setGame(state)
    setScreen('game')
  }, [roster, push, T])

  const ctx = useMemo<CheondoCtx | null>(() => (roster ? {
    roster, locale, T, sfx: audio.sfx, voice, toast: push, openHero: setSheetHero,
  } : null), [roster, locale, T, audio.sfx, voice, push])

  const body = (
    <div
      ref={setGameFullScreenLayer}
      className="cheondo-root fixed inset-0 overflow-hidden"
      style={{ zIndex: Z_INDEX.top, background: INK.bg, color: INK.text, isolation: 'isolate' }}
    >
      <style>{CHEONDO_CSS}</style>
      {status !== 'ready' || !ctx ? (
        <LoadingScreen status={status} onRetry={retry} onExit={exit} text={T} />
      ) : (
        <CheondoContext.Provider value={ctx}>
          {screen === 'title' && (
            <TitleScreen
              saveMeta={saveMeta}
              onContinue={continueGame}
              onNew={() => (saveMeta ? setConfirmNew(true) : setScreen('select'))}
              onCodex={() => setScreen('codex')}
              onHowTo={() => setHowTo(true)}
              onExit={exit}
            />
          )}
          {screen === 'select' && <LordSelect onBack={() => setScreen('title')} onStart={startNew} />}
          {screen === 'codex' && <CodexScreen onBack={() => setScreen('title')} />}
          {screen === 'game' && game && (
            <GameScreen
              game={game}
              setGame={setGame}
              saveOk={saveOk}
              onTitle={() => { setGame(null); setScreen('title') }}
              onExit={exit}
              audio={audio}
            />
          )}
          <HowToModal open={howTo} onClose={() => setHowTo(false)} />
          <Modal open={confirmNew} onClose={() => setConfirmNew(false)} width={420}>
            <div className="flex flex-col gap-4 p-5">
              <p className="text-sm leading-relaxed" style={{ color: INK.text }}>{T.title.overwrite}</p>
              <div className="flex justify-end gap-2">
                <GameButton variant="quiet" onClick={() => setConfirmNew(false)}>{T.cancel}</GameButton>
                <GameButton variant="danger" onClick={() => { setConfirmNew(false); setScreen('select') }}>{T.title.overwriteYes}</GameButton>
              </div>
            </div>
          </Modal>
          <HeroSheet heroId={sheetHero} game={screen === 'game' ? game : null} onClose={() => setSheetHero(null)} />
          <ToastStack toasts={toasts} />
        </CheondoContext.Provider>
      )}
    </div>
  )
  return createPortal(body, document.body)
}

function LoadingScreen({ status, onRetry, onExit, text }: { status: string; onRetry: () => void; onExit: () => void; text: ReturnType<typeof getText> }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-5 text-center">
        {status === 'error' ? (
          <>
            <p className="max-w-xs text-sm" style={{ color: INK.sub }}>{text.loadFailed}</p>
            <div className="flex gap-2">
              <GameButton onClick={onExit} variant="quiet">{text.exit}</GameButton>
              <GameButton onClick={onRetry} variant="primary">{text.retry}</GameButton>
            </div>
          </>
        ) : (
          <p className="text-sm" style={{ color: INK.sub }} role="status">{text.loading}…</p>
        )}
      </div>
    </div>
  )
}

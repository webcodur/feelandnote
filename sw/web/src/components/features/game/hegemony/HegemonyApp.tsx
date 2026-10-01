/*
  파일명: components/features/game/hegemony/HegemonyApp.tsx
  기능: 패권 단계별 화면 연결
  책임: 한 판의 단계(타이틀→선발→주장→대전→결과)에 맞는 화면을 고르고, 인물 상세 창·전적 기록·대사를 잇는다.
*/
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BattleCard } from "@/lib/game/types";
import { picksOf } from "@/lib/game/hegemony/draft";
import BattleScreen from "./battle/BattleScreen";
import CaptainScreen from "./captain/CaptainScreen";
import CardDetailModal from "./modals/CardDetailModal";
import DraftScreen from "./draft/DraftScreen";
import type { HegemonyGameApi } from "./hooks/useHegemonyGame";
import { SFX, type SfxName, type useHegemonyAudio } from "./hooks/useHegemonyAudio";
import { useHegemonyDialogue } from "./hooks/useHegemonyDialogue";
import { useHegemonyRecords } from "./hooks/useHegemonyRecords";
import { useHegemonySettings } from "./hooks/useHegemonySettings";
import ResultScreen from "./result/ResultScreen";
import TitleScreen from "./title/TitleScreen";

interface Props {
  game: HegemonyGameApi;
  audio: ReturnType<typeof useHegemonyAudio>;
  onExit: () => void;
}

export default function HegemonyApp({ game, audio, onExit }: Props) {
  const { state } = game;
  const { records, addResult } = useHegemonyRecords();
  const settings = useHegemonySettings();
  const [inspectId, setInspectId] = useState<string | null>(null);
  const { playSfx: rawSfx } = audio;
  const sfx = useCallback((name: SfxName) => rawSfx(SFX[name]), [rawSfx]);

  const pool = useMemo(() => state.draft?.pool ?? [], [state.draft]);
  const { say, hush } = useHegemonyDialogue(pool, audio.sfxMuted);
  const cardById = useMemo(() => new Map(pool.map((c) => [c.id, c])), [pool]);
  const inspected: BattleCard | null = inspectId ? cardById.get(inspectId) ?? null : null;

  // 결과 단계에 들어서면 이 판을 한 번만 전적에 남긴다
  const recordedSeed = useRef<number | null>(null);
  useEffect(() => {
    const battle = state.battle;
    if (state.phase !== "result" || !battle?.winner || recordedSeed.current === state.seed) return;
    recordedSeed.current = state.seed;
    const captain = battle.player.captainId ? cardById.get(battle.player.captainId) : undefined;
    addResult({
      at: Date.now(),
      difficulty: state.difficulty,
      winner: battle.winner,
      rounds: battle.records.length,
      power: { player: battle.player.nation.power, ai: battle.ai.nation.power },
      captainName: captain?.nickname ?? "",
    });
  }, [state.phase, state.battle, state.seed, state.difficulty, cardById, addResult]);

  // 단계가 바뀌면 전체화면 본문 스크롤을 맨 위로 되돌린다 (앞 단계의 스크롤 위치가 남지 않게)
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current?.parentElement?.scrollTo({ top: 0 });
  }, [state.phase]);

  const common = { sfx, say, hush, onInspect: setInspectId, speed: settings.scale };

  return (
    // break-keep: 한국어 줄바꿈을 어절 단위로 (글자 중간에서 끊기지 않게)
    <div ref={rootRef} className="contents break-keep">
      {(state.phase === "title" || state.phase === "loading") && (
        <TitleScreen
          loading={state.phase === "loading"}
          error={state.error}
          initialDifficulty={state.difficulty}
          onStart={(difficulty) => {
            sfx("start");
            void game.start(difficulty);
          }}
          onExit={onExit}
          records={records}
          bgmMuted={audio.bgmMuted}
          sfxMuted={audio.sfxMuted}
          toggleBgmMuted={audio.toggleBgmMuted}
          toggleSfxMuted={audio.toggleSfxMuted}
          speed={settings.speed}
          onSpeed={settings.setSpeed}
          onClick={() => sfx("select")}
        />
      )}
      {state.phase === "draft" && state.draft && <DraftScreen draft={state.draft} game={game} {...common} />}
      {state.phase === "captain" && state.draft && (
        <CaptainScreen
          mine={picksOf(state.draft, "player")}
          theirs={picksOf(state.draft, "ai")}
          difficulty={state.difficulty}
          onAppoint={game.appointCaptain}
          {...common}
        />
      )}
      {state.phase === "battle" && state.battle && <BattleScreen battle={state.battle} difficulty={state.difficulty} game={game} sfxMuted={audio.sfxMuted} {...common} />}
      {state.phase === "result" && state.battle && (
        <ResultScreen battle={state.battle} difficulty={state.difficulty} records={records} cards={cardById} onRematch={() => void game.start(state.difficulty)} onHome={game.reset} {...common} />
      )}
      <CardDetailModal card={inspected} onClose={() => setInspectId(null)} />
    </div>
  );
}

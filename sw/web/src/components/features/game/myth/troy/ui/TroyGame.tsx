/*
  파일명: components/features/game/myth/troy/ui/TroyGame.tsx
  기능: 트로이 전쟁 게임 뿌리
  책임: 원정 기록을 읽고 화면 단계(제목 → 장 이야기 → 출진 준비 → 싸움 → 결과 → 이어지는 이야기 → 다음 장 … → 엔딩)를 오간다.
        싸우던 판은 우리 차례가 열릴 때마다, 나갈 때 기록에 남겨 이어 할 수 있게 한다.
*/ // ------------------------------
"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CHAPTERS, chapterById, nextChapter } from "../campaign";
import { HEROES } from "../campaign/heroes";
import { benchExp, benchHeroes, emptySave, loadSave, recordVictory, resumeChapter } from "../campaign/progress";
import type { BattleState } from "../engine";
import type { TroyPool } from "../model";
import BattleScreen from "./battle/BattleScreen";
import { sceneUnits } from "./battle/sceneUnits";
import ChapterList from "./ChapterList";
import EndingScreen from "./EndingScreen";
import { castOf, newBattle, storyOf, storyScene, type Screen } from "./flow";
import PrepScreen from "./PrepScreen";
import ResultScreen from "./ResultScreen";
import SceneBackdrop from "./SceneBackdrop";
import StoryPlayer from "./StoryPlayer";
import TitleScreen from "./TitleScreen";
import TroyFrame from "./TroyFrame";
import { useFigureLines } from "./useFigureLines";
import { useNames } from "./useNames";
import { useSave } from "./useSave";

interface Props {
  pool: TroyPool;
  medals: Record<string, string>;
  // 검수용으로 곧장 열 장(개발 서버에서만 넘어온다)
  startChapter?: string | null;
  onExit?: () => void;
}

export default function TroyGame({ pool, medals, startChapter = null, onExit }: Props) {
  const t = useTranslations("gameMythTroy");
  const names = useNames(pool);
  const [save, commit] = useSave();
  const [screen, setScreen] = useState<Screen>(startChapter ? { kind: "prep", chapterId: startChapter } : { kind: "title" });
  // 고유 대사는 판에 서는 인물만 받는다(출진 준비는 우리 영웅, 싸움·결과는 그 판의 인물)
  const lineSlugs = useMemo(
    () => (screen.kind === "battle" || screen.kind === "result" ? castOf(screen.start) : screen.kind === "prep" ? HEROES.map((h) => h.slug) : []),
    [screen],
  );
  const pickLine = useFigureLines(pool, lineSlugs);
  const titlePreview = useMemo(() => {
    const first = CHAPTERS[0];
    return sceneUnits(newBattle(first, emptySave(), first.battle.available, pool.relations), names.unitName, medals);
  }, [pool.relations, names, medals]);

  const openChapter = useCallback((id: string) => setScreen({ kind: "story", chapterId: id, part: "intro" }), []);
  const onContinue = useCallback(() => {
    const entry = resumeChapter(save);
    if (save.battle) setScreen({ kind: "battle", chapterId: save.battle.chapterId, start: save.battle, fresh: false });
    else if (save.cleared.includes(entry.id)) setScreen({ kind: "chapters" });
    else setScreen({ kind: "prep", chapterId: entry.id });
  }, [save]);
  const onNew = useCallback(() => {
    commit(emptySave());
    openChapter(CHAPTERS[0].id);
  }, [commit, openChapter]);

  const onBattleEnd = useCallback((chapterId: string, start: BattleState) => (final: BattleState) => {
    const won = final.outcome === "victory";
    commit(won ? recordVictory(save, final) : { ...save, battle: null });
    // 진영에 남은 영웅의 몫은 판을 적기 전의 명단으로 센다(recordVictory와 같은 기준)
    const count = won ? benchHeroes(save, final).length : 0;
    const amount = won ? benchExp(final) : 0;
    setScreen({ kind: "result", chapterId, start, final, bench: count > 0 && amount > 0 ? { count, amount } : null });
  }, [save, commit]);

  const view = (() => {
    if (screen.kind === "title") {
      const entry = resumeChapter(save);
      const started = save.cleared.length > 0 || Boolean(save.battle);
      return (
        <TitleScreen map={CHAPTERS[0].battle.map} units={titlePreview} isFixture={pool.isFixture} hasRecord={started}
          continueLabel={started ? t("titleScreen.continueAt", { no: entry.no, title: storyOf(entry, names.locale).title }) : null}
          progress={t("titleScreen.progress", { count: save.cleared.length, total: CHAPTERS.length })}
          onContinue={onContinue} onNew={onNew} onChapters={() => setScreen({ kind: "chapters" })} onExit={onExit} />
      );
    }
    if (screen.kind === "chapters") return <ChapterList save={save} locale={names.locale} onPick={openChapter} onBack={() => setScreen({ kind: "title" })} />;
    if (screen.kind === "ending") return <EndingScreen locale={names.locale} altCount={save.flags.filter((f) => f.startsWith("alt:")).length} onTitle={() => setScreen({ kind: "title" })} />;
    const entry = chapterById(screen.chapterId);
    if (!entry) return null;
    const story = storyOf(entry, names.locale);
    if (screen.kind === "story") {
      const scene = storyScene(entry, names.locale, screen.part, save.flags);
      const next = nextChapter(entry.id);
      const after = (): Screen => (screen.part === "intro" ? { kind: "prep", chapterId: entry.id } : next ? { kind: "story", chapterId: next.id, part: "intro" } : { kind: "ending" });
      return (
        <div className="relative h-full w-full">
          <SceneBackdrop map={entry.battle.map} dim="heavy" flags={screen.part === "intro" ? entry.introFlags : undefined} />
          <StoryPlayer key={`${entry.id}-${screen.part}`} scene={scene} names={names} onDone={() => setScreen(after())} />
        </div>
      );
    }
    if (screen.kind === "prep") {
      return (
        <PrepScreen key={entry.id} entry={entry} story={story} save={save} relations={pool.relations} names={names} medals={medals} pickLine={pickLine}
          onDifficulty={(difficulty) => commit({ ...save, difficulty })}
          onBack={() => setScreen({ kind: "chapters" })} onStory={() => setScreen({ kind: "story", chapterId: entry.id, part: "intro" })}
          onStart={(deployed) => setScreen({ kind: "battle", chapterId: entry.id, start: newBattle(entry, save, deployed, pool.relations), fresh: true })} />
      );
    }
    if (screen.kind === "battle") {
      return (
        <BattleScreen key={`${entry.id}-${screen.start.rng}`} no={entry.no} story={story} initial={screen.start} fresh={screen.fresh} names={names} medals={medals} pickLine={pickLine} campaignFlags={save.flags}
          onEnd={onBattleEnd(entry.id, screen.start)}
          onSave={(state) => commit({ ...loadSave(), battle: state })}
          onQuit={(state) => { commit({ ...loadSave(), battle: state.phase === "player" ? state : loadSave().battle }); setScreen({ kind: "title" }); }} />
      );
    }
    const alt = Boolean(entry.outroAltFlag && save.flags.includes(entry.outroAltFlag));
    return (
      <ResultScreen no={entry.no} story={story} start={screen.start} final={screen.final} altRoad={alt} bench={screen.bench} names={names} pickLine={pickLine} flags={save.flags}
        onNext={() => setScreen({ kind: "story", chapterId: entry.id, part: "outro" })}
        onRetry={() => setScreen({ kind: "prep", chapterId: entry.id })} onChapters={() => setScreen({ kind: "chapters" })} />
    );
  })();

  return <TroyFrame>{view}</TroyFrame>;
}

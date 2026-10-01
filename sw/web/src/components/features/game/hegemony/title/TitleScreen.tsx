/*
  파일명: components/features/game/hegemony/title/TitleScreen.tsx
  기능: 패권 타이틀
  책임: 키아트 위에 제목·난이도·대전 시작과 규칙·전적·설정 입구를 둔다. 보조 화면은 같은 자리에서 바뀐다.
        로컬 개발 서버에서만 제목을 일곱 번 누르면 일기토 개발 스튜디오가 열린다.
*/
"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, LogOut, Settings2, Swords, Trophy } from "lucide-react";
import DuelDevStudio from "@/components/features/game/duel/DuelDevStudio";
import { isDeveloperMode } from "@/lib/developer-mode";
import type { Difficulty } from "@/lib/game/hegemony/constants";
import type { HegemonyRecords } from "../hooks/useHegemonyRecords";
import { totalsOf } from "../hooks/useHegemonyRecords";
import type { AnimationSpeed } from "../hooks/useHegemonySettings";
import { useHotkeys } from "../hooks/useHotkeys";
import { useHegemonyText } from "../text";
import GameButton from "../ui/GameButton";
import DifficultyPicker from "./DifficultyPicker";
import RecordsPanel from "./RecordsPanel";
import RulesContent from "./RulesContent";
import SettingsPanel from "./SettingsPanel";
import SubPanel from "./SubPanel";

type View = "main" | "rules" | "records" | "settings" | "studio";

interface Props {
  loading: boolean;
  error: "load" | "notEnough" | null;
  initialDifficulty: Difficulty;
  onStart: (difficulty: Difficulty) => void;
  onExit: () => void;
  records: HegemonyRecords;
  bgmMuted: boolean;
  sfxMuted: boolean;
  toggleBgmMuted: () => void;
  toggleSfxMuted: () => void;
  speed: AnimationSpeed;
  onSpeed: (speed: AnimationSpeed) => void;
  onClick: () => void;
}

export default function TitleScreen(props: Props) {
  const { loading, error, initialDifficulty, onStart, onExit, records, onClick } = props;
  const text = useHegemonyText();
  const [view, setView] = useState<View>("main");
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const taps = useRef({ count: 0, at: 0 });
  const totals = totalsOf(records);
  const played = totals.wins + totals.losses + totals.draws;

  const go = (next: View) => {
    onClick();
    setView(next);
  };
  const tapTitle = () => {
    // 개발 스튜디오는 로컬 개발 서버에서만 연다. 운영에서는 제목을 여러 번 눌러도 아무 일도 없다
    if (!isDeveloperMode()) return;
    const now = Date.now();
    taps.current = { count: now - taps.current.at < 1500 ? taps.current.count + 1 : 1, at: now };
    if (taps.current.count >= 7) go("studio");
  };
  useHotkeys({ Enter: () => !loading && onStart(difficulty) }, view === "main");

  if (view === "studio") return <DuelDevStudio onBack={() => setView("main")} />;

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-7xl items-center py-6 lg:px-6">
      <AnimatePresence mode="wait">
        {view === "main" && (
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="flex w-full max-w-[440px] flex-col gap-7"
          >
            <header className="relative">
              <p className="text-sm font-bold tracking-[0.55em] text-accent">{text.game.english}</p>
              <h1 onClick={tapTitle} className="relative mt-3 w-fit select-none text-7xl font-black leading-none tracking-tight text-hg-bright sm:text-8xl">
                {text.game.title}
              </h1>
              <div className="mt-5 h-px w-24 bg-linear-to-r from-accent to-transparent" />
              <p className="mt-4 text-lg text-text-primary">{text.game.tagline}</p>
            </header>

            <DifficultyPicker value={difficulty} onChange={(d) => { onClick(); setDifficulty(d); }} disabled={loading} />

            <div className="flex flex-col gap-2">
              <GameButton variant="primary" size="lg" block disabled={loading} hotkey="Enter" icon={<Swords size={20} />} onClick={() => onStart(difficulty)}>
                {loading ? text.title.loading : text.title.start}
              </GameButton>
              {error && (
                <p role="alert" className="rounded-lg border border-hg-enemy/40 bg-hg-enemy/10 px-3 py-2 text-sm text-hg-bright">
                  {error === "load" ? text.title.errorLoad : text.title.errorNotEnough}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <GameButton size="md" onClick={() => go("rules")} icon={<BookOpen size={16} className="hidden sm:block" />}>{text.title.rules}</GameButton>
              <GameButton size="md" onClick={() => go("records")} icon={<Trophy size={16} className="hidden sm:block" />}>{text.title.records}</GameButton>
              <GameButton size="md" onClick={() => go("settings")} icon={<Settings2 size={16} className="hidden sm:block" />}>{text.title.settings}</GameButton>
            </div>

            <footer className="flex items-center justify-between gap-3 text-sm">
              <span className="text-text-secondary">
                {played === 0 && text.title.noRecord}
                {played > 0 && text.title.recordLine(totals.wins, totals.losses, totals.draws)}
                {records.streak > 1 && <span className="ms-2 font-bold text-accent">{text.title.streak(records.streak)}</span>}
              </span>
              <GameButton size="sm" variant="ghost" onClick={onExit} icon={<LogOut size={15} />}>{text.title.exit}</GameButton>
            </footer>
          </motion.div>
        )}
        {view === "rules" && (
          <SubPanel key="rules" title={text.rules.title} backLabel={text.rules.back} onBack={() => go("main")} wide>
            <RulesContent />
          </SubPanel>
        )}
        {view === "records" && <RecordsPanel key="records" records={records} onBack={() => go("main")} />}
        {view === "settings" && (
          <SettingsPanel
            key="settings"
            bgmMuted={props.bgmMuted}
            sfxMuted={props.sfxMuted}
            toggleBgmMuted={props.toggleBgmMuted}
            toggleSfxMuted={props.toggleSfxMuted}
            speed={props.speed}
            onSpeed={props.onSpeed}
            onBack={() => go("main")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

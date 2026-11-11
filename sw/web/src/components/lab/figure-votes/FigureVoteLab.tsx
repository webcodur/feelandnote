"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { ArrowRight, BookOpen, Check, RotateCcw, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import CelebImage from "@/components/ui/CelebImage";
import ResponsivePortraitImage from "@/components/ui/ResponsivePortraitImage";
import type { VoteCandidate, VoteRound } from "./rounds";

type Ballot = { first: string; order: string[] };

const modeNames = { duel: "연속 맞대결", rank: "내 순위표", pick: "한 표" } as const;
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e6b66c]";
const primary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-[#e6b66c] px-5 py-2.5 text-sm font-bold text-[#20170b] hover:bg-[#ffcf8b] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 ${focus}`;
const secondary = `inline-flex min-h-11 items-center gap-2 rounded-sm border border-white/20 px-4 py-2 text-sm text-[#e4d7c3] hover:border-[#e6b66c] hover:text-[#ffd99d] ${focus}`;

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function emptyStorage() {
  return "";
}

function parseBallot(raw: string, round: VoteRound): Ballot | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Ballot> | null;
    const ids = new Set(round.candidates.map(candidate => candidate.id));
    if (!value || typeof value.first !== "string" || !ids.has(value.first) ||
        !Array.isArray(value.order) || value.order.length !== (round.mode === "rank" ? 3 : 1) ||
        new Set(value.order).size !== value.order.length || !value.order.every(id => ids.has(id))) return null;
    return { first: value.first, order: value.order };
  } catch {
    return null;
  }
}

function names(candidate: VoteCandidate) {
  return candidate.people.map(person => person.name).join(" × ");
}

function CandidateCard({ candidate, selected, rank, onSelect }: {
  candidate: VoteCandidate;
  selected?: boolean;
  rank?: number;
  onSelect: () => void;
}) {
  return (
    <button type="button" aria-pressed={selected} onClick={onSelect}
      className={`relative flex min-w-0 flex-col overflow-hidden rounded-sm border bg-[#151411] text-left hover:border-[#e6b66c] hover:bg-[#211b14] ${focus} ${selected ? "border-[#e6b66c]" : "border-white/15"}`}>
      <span className="relative flex h-36 w-full gap-px overflow-hidden bg-[#302b25] sm:h-52" aria-hidden="true">
        {candidate.people.map(person => (
          <span key={person.slug} className="relative block h-full min-w-0 flex-1 overflow-hidden">
            {person.portrait
              ? <ResponsivePortraitImage src={person.portrait} alt="" sizes="(max-width: 640px) 48vw, 360px" className="object-cover object-top" />
              : <CelebImage src={person.avatar} alt="" dissolve={false} />}
          </span>
        ))}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {selected && <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-sm bg-[#e6b66c] text-sm font-bold text-[#20170b]">
          {rank ?? <Check size={16} />}
        </span>}
      </span>
      <span className="block w-full p-3 sm:p-4">
        <span className="block text-[11px] font-medium text-[#e6b66c] sm:text-xs">{candidate.label}</span>
        <span className="mt-1.5 block break-keep text-sm font-bold leading-snug text-[#f5ecdc] sm:text-lg">{names(candidate)}</span>
        <span className="mt-2 block text-xs leading-relaxed text-[#c9beaf] sm:text-sm">{candidate.detail}</span>
      </span>
    </button>
  );
}

function VoteResult({ round, ballot, onRestart }: { round: VoteRound; ballot: Ballot; onRestart: () => void }) {
  const ordered = ballot.order.flatMap(id => round.candidates.find(candidate => candidate.id === id) ?? []);
  const first = round.candidates.find(candidate => candidate.id === ballot.first);
  const winner = ordered[0];
  if (!winner) return null;

  return (
    <section aria-label="내 투표 결과" className="rounded-sm border border-[#e6b66c]/40 bg-[#1b1711] p-5 sm:p-8">
      <p className="text-xs font-semibold text-[#e6b66c]">내 투표 결과</p>
      <h3 className="mt-2 break-keep font-serif text-2xl font-bold text-[#fff2da] sm:text-4xl">{names(winner)}</h3>
      {round.mode === "duel" && first && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#e4d7c3]">
          <span>첫 선택 {names(first)}</span><ArrowRight size={16} aria-hidden="true" /><span>최종 선택 {names(winner)}</span>
        </p>
      )}
      <ol className="mt-5 divide-y divide-white/10 border-y border-white/10">
        {ordered.map((candidate, index) => (
          <li key={candidate.id} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 py-3.5">
            <span className="font-serif text-lg tabular-nums text-[#e6b66c]">{index + 1}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-medium">
                {candidate.people.map(person => (
                  <Link key={person.slug} href={`/celeb/${person.slug}`} className={`rounded-sm text-[#f5ecdc] underline decoration-white/30 underline-offset-4 hover:text-[#e6b66c] ${focus}`}>{person.name}</Link>
                ))}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-[#c9beaf]">{candidate.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      {winner.book && (
        <a href={winner.book.href} target="_blank" rel="noreferrer"
          className={`mt-5 flex items-center gap-3 rounded-sm border border-white/15 bg-black/25 p-3.5 hover:border-[#e6b66c] ${focus}`}>
          <BookOpen className="shrink-0 text-[#e6b66c]" size={21} aria-hidden="true" />
          <span className="min-w-0 flex-1"><strong className="block text-sm text-[#f5ecdc]">《{winner.book.title}》</strong>
            <span className="mt-1 block text-xs leading-relaxed text-[#c9beaf]">{winner.book.note}</span></span>
          <ArrowRight className="shrink-0 text-[#e6b66c]" size={17} aria-hidden="true" />
        </a>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className={secondary} onClick={onRestart}><RotateCcw size={15} /> 다시 고르기</button>
        <Link href={round.atlasHref} className={secondary}>도감에서 더 보기 <ArrowRight size={15} /></Link>
      </div>
    </section>
  );
}

function RoundPlayer({ round }: { round: VoteRound }) {
  const storageKey = `fn:lab:figure-vote:v1:${round.id}`;
  const getStored = useCallback(() => {
    try { return localStorage.getItem(storageKey) ?? ""; } catch { return ""; }
  }, [storageKey]);
  const stored = useSyncExternalStore(subscribeToStorage, getStored, emptyStorage);
  const [sessionBallot, setSessionBallot] = useState<Ballot | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [ordered, setOrdered] = useState<string[]>([]);
  const [duel, setDuel] = useState<{ first: string; leader: string; step: number } | null>(null);
  const ballot = sessionBallot ?? (replaying ? null : parseBallot(stored, round));
  const targetCount = round.mode === "rank" ? 3 : 1;

  function finish(value: Ballot) {
    try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* 같은 화면에서는 결과를 유지한다 */ }
    setSessionBallot(value);
    setReplaying(false);
  }

  function restart() {
    setSessionBallot(null);
    setReplaying(true);
    setOrdered([]);
    setDuel(null);
  }

  function select(id: string) {
    if (round.mode === "duel") {
      setDuel({ first: id, leader: id, step: 0 });
      return;
    }
    setOrdered(previous => {
      if (previous.includes(id)) return previous.filter(pick => pick !== id);
      if (targetCount === 1) return [id];
      return previous.length < targetCount ? [...previous, id] : previous;
    });
  }

  if (ballot) return <VoteResult round={round} ballot={ballot} onRestart={restart} />;

  if (duel) {
    const firstIndex = round.candidates.findIndex(candidate => candidate.id === duel.first);
    const challengers = [...round.candidates.slice(firstIndex + 1), ...round.candidates.slice(0, firstIndex)].slice(0, 3);
    const leader = round.candidates.find(candidate => candidate.id === duel.leader)!;
    const challenger = challengers[duel.step];
    function decide(id: string) {
      if (!duel) return;
      if (duel.step + 1 === challengers.length) finish({ first: duel.first, order: [id] });
      else setDuel({ ...duel, leader: id, step: duel.step + 1 });
    }
    return (
      <section aria-label="후보 맞대결" className="mx-auto max-w-3xl">
        <p aria-live="polite" className="mb-3 text-center text-xs font-semibold text-[#e6b66c]">
          맞대결 {duel.step + 1} / {challengers.length} · {names(leader)} 대 {names(challenger)}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <CandidateCard candidate={leader} onSelect={() => decide(leader.id)} />
          <CandidateCard candidate={challenger} onSelect={() => decide(challenger.id)} />
        </div>
        <button type="button" className={`mt-4 ${secondary}`} onClick={() => setDuel(null)}><RotateCcw size={15} /> 첫 선택으로</button>
      </section>
    );
  }

  return (
    <section aria-label="후보 선택">
      <div className={`grid grid-cols-2 gap-2 sm:gap-4 ${round.mode === "rank" ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {round.candidates.map(candidate => {
          const index = ordered.indexOf(candidate.id);
          return <CandidateCard key={candidate.id} candidate={candidate} selected={round.mode !== "duel" ? index >= 0 : undefined}
            rank={round.mode === "rank" && index >= 0 ? index + 1 : undefined} onSelect={() => select(candidate.id)} />;
        })}
      </div>
      {round.mode !== "duel" && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p role="status" className="text-sm text-[#c9beaf]">
            {ordered.length} / {targetCount} 선택{ordered.length === 3 ? " · 후보를 다시 누르면 순위에서 빠져요." : ""}
          </p>
          <button type="button" disabled={ordered.length !== targetCount} className={primary}
            onClick={() => finish({ first: ordered[0], order: ordered })}>
            {round.mode === "rank" ? "내 순위 확정" : "한 표 던지기"} <ArrowRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}

export default function FigureVoteLab({ rounds }: { rounds: VoteRound[] }) {
  const [activeId, setActiveId] = useState(rounds[0].id);
  const active = rounds.find(round => round.id === activeId) ?? rounds[0];

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <div className="mb-5 flex items-center gap-2 border-b border-[#e6b66c]/35 pb-3 text-xs font-semibold tracking-widest text-[#e6b66c]">
        <Users size={16} aria-hidden="true" /> 세력도감 × 신화의 세계
        <span className="ml-auto font-normal tracking-normal text-[#c9beaf]">이 브라우저에 투표 저장</span>
      </div>
      <nav aria-label="투표 주제" className="grid gap-2 sm:grid-cols-3">
        {rounds.map((round, index) => (
          <button key={round.id} type="button" aria-pressed={active.id === round.id} onClick={() => setActiveId(round.id)}
            className={`flex min-h-14 min-w-0 items-center gap-3 rounded-sm border px-3.5 py-2 text-left hover:border-[#e6b66c] hover:bg-[#2a2116] ${focus} ${active.id === round.id ? "border-[#e6b66c]/70 bg-[#211a11]" : "border-white/15 bg-[#11110f]"}`}>
            <span aria-hidden="true" className="font-serif text-lg tabular-nums text-[#e6b66c]">0{index + 1}</span>
            <span className="min-w-0">
              <span className="block break-keep text-sm font-semibold text-[#f5ecdc]">{round.pool}</span>
              <span className="mt-1 block text-[11px] text-[#c9beaf]">{modeNames[round.mode]} · 후보 {round.candidates.length}</span>
            </span>
          </button>
        ))}
      </nav>
      <header className="mb-5 mt-6 border-l-2 border-[#e6b66c] bg-[#15120e] px-4 py-5 sm:px-6 sm:py-7">
        <p className="text-xs font-semibold text-[#e6b66c]">{modeNames[active.mode]}</p>
        <h2 className="mt-2 break-keep font-serif text-2xl font-bold leading-snug text-[#fff2da] sm:text-4xl">{active.question}</h2>
        <p className="mt-2.5 text-sm leading-relaxed text-[#c9beaf]">{active.intro}</p>
      </header>
      <RoundPlayer key={active.id} round={active} />
    </div>
  );
}

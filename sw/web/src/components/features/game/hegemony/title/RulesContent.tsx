/*
  파일명: components/features/game/hegemony/title/RulesContent.tsx
  기능: 규칙 안내 본문
  책임: 상성 삼각형과 규칙 절들을 보여 준다. 타이틀의 규칙 화면과 대전 중 도움말 창이 함께 쓴다.
*/
"use client";

import type { Command } from "@/lib/game/types";
import { BEATS } from "@/lib/game/hegemony/constants";
import { useHegemonyText } from "../text";
import CommandSeal from "../ui/CommandSeal";
import { COMMAND_TONE } from "../ui/tokens";

const ORDER: Command[] = ["assault", "govern", "stratagem"];

function CounterCycle() {
  const text = useHegemonyText();
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {ORDER.map((cmd) => (
        <div key={cmd} className={`rounded-xl border ${COMMAND_TONE[cmd].border} ${COMMAND_TONE[cmd].soft} p-3`}>
          <div className="flex items-center gap-2">
            <CommandSeal command={cmd} size="sm" solid />
            <span className={`text-base font-black ${COMMAND_TONE[cmd].text}`}>{text.command.name[cmd]}</span>
          </div>
          <p className="mt-2 text-sm text-text-primary">{text.command.effect[cmd]}</p>
          <p className="mt-1 text-sm font-semibold text-text-secondary">{text.command.beats(cmd, BEATS[cmd])}</p>
        </div>
      ))}
    </div>
  );
}

export default function RulesContent() {
  const text = useHegemonyText();
  return (
    <div className="space-y-6">
      <CounterCycle />
      {text.rules.sections.map((section) => (
        <section key={section.title}>
          <h3 className="mb-2 text-base font-black text-accent">{section.title}</h3>
          <ul className="space-y-1.5">
            {section.body.map((line) => (
              <li key={line} className="flex gap-2 text-sm leading-relaxed text-text-primary">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent/70" />
                {line}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="hidden rounded-lg border border-hg-line/70 bg-hg-raised px-3 py-2 text-sm text-text-secondary lg:block">{text.rules.keys}</p>
    </div>
  );
}

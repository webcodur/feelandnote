"use client";

import type { RefObject } from "react";
import Image from "next/image";
import { Users, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

const PRETENDARD_STYLE = { fontFamily: "var(--font-pretendard)" } as const;

export interface FactionRosterEntry {
  key: string;
  itemIndex: number;
  /** group = 묶음·세력(얼굴 카드), celeb = 인물 줄 */
  kind: "group" | "celeb";
  title: string;
  meta?: string | null;
  hasVoice?: boolean;
  /** 묶음 줄에 겹쳐 띄울 구성원 얼굴 — 없으면 아이콘으로 */
  faces?: { id: string; url: string | null; name: string }[];
}

const ROSTER_FACE_LIMIT = 3;

interface FactionRosterProps {
  entries: FactionRosterEntry[];
  selectedIndex: number;
  rosterLabel: string;
  voiceLabel: string;
  accentColor: string;
  containerRef: RefObject<HTMLDivElement | null>;
  registerItemRef: (index: number, element: HTMLButtonElement | null) => void;
  onSelect: (index: number) => void;
}

export default function FactionRoster({
  entries,
  selectedIndex,
  rosterLabel,
  voiceLabel,
  accentColor,
  containerRef,
  registerItemRef,
  onSelect,
}: FactionRosterProps) {
  return (
    <section
      className="overflow-hidden rounded-[18px] border border-white/10 bg-[#111211] shadow-[0_18px_45px_rgba(0,0,0,0.24)]"
      style={PRETENDARD_STYLE}
    >
      <header className="border-b border-white/10 px-4 py-3">
        <p
          className="text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ color: accentColor }}
        >
          {rosterLabel}
        </p>
      </header>

      <div
        ref={containerRef}
        className="custom-scrollbar max-h-[min(38svh,330px)] overflow-y-auto overscroll-y-auto p-2 [overflow-anchor:none] md:max-h-[600px]"
      >
        {entries.map((entry) => {
          const isSelected = entry.itemIndex === selectedIndex;

          if (entry.kind === "group") {
            return (
              <button
                key={entry.key}
                ref={(element) => registerItemRef(entry.itemIndex, element)}
                type="button"
                onClick={() => onSelect(entry.itemIndex)}
                aria-pressed={isSelected}
                style={PRETENDARD_STYLE}
                className={cn(
                  "group relative my-2 flex min-h-[66px] w-full items-center overflow-hidden rounded-xl border px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  isSelected
                    ? "border-accent/65 bg-accent/[0.12]"
                    : "border-accent/25 bg-[linear-gradient(110deg,rgba(212,175,55,0.075),rgba(255,255,255,0.015))] hover:border-accent/55 hover:bg-accent/[0.08]",
                )}
              >
                {entry.faces?.length ? (
                  <span aria-hidden className="flex shrink-0 -space-x-2.5">
                    {entry.faces.slice(0, ROSTER_FACE_LIMIT).map((face, index) => (
                      <span
                        key={face.id}
                        className="relative block size-9 overflow-hidden rounded-full bg-[#1c1c1b] ring-2 ring-[#161512]"
                        style={{ zIndex: ROSTER_FACE_LIMIT - index }}
                      >
                        {face.url ? (
                          <Image src={face.url} alt="" fill unoptimized sizes="36px" className="object-cover" />
                        ) : (
                          <span className="grid h-full place-items-center text-[11px] font-black text-white/50">{face.name[0]}</span>
                        )}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-black/25 text-accent/80">
                    <Users size={17} aria-hidden />
                  </span>
                )}

                <span className="flex min-w-0 flex-1 items-center px-3 py-3">
                  <span
                    title={entry.title}
                    className={cn(
                      "truncate whitespace-nowrap text-[16px] font-black leading-5",
                      isSelected ? "text-white" : "text-white/82 group-hover:text-white",
                    )}
                  >
                    {entry.title}
                  </span>
                </span>

                {isSelected ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                ) : null}
              </button>
            );
          }

          return (
            <button
              key={entry.key}
              ref={(element) => registerItemRef(entry.itemIndex, element)}
              type="button"
              onClick={() => onSelect(entry.itemIndex)}
              aria-pressed={isSelected}
              style={PRETENDARD_STYLE}
              className={cn(
                "group relative ms-3 flex min-h-[52px] w-[calc(100%_-_0.75rem)] items-center border-b border-white/[0.07] px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                isSelected
                  ? "bg-accent/[0.07]"
                  : "bg-transparent hover:bg-white/[0.045]",
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2 py-2 whitespace-nowrap">
                <span
                  title={entry.title}
                  className={cn(
                    "min-w-0 flex-[0_1_auto] truncate text-[15px] font-black leading-5",
                    isSelected ? "text-white" : "text-white/90 group-hover:text-white",
                  )}
                >
                  {entry.title}
                </span>
                {entry.meta ? (
                  <span
                    title={entry.meta}
                    className={cn(
                      "min-w-0 flex-1 truncate text-[11px] font-bold leading-4",
                      isSelected ? "text-accent" : "text-amber-300/90",
                    )}
                  >
                    {entry.meta}
                  </span>
                ) : null}
              </span>

              {entry.hasVoice ? (
                <span title={voiceLabel} className="shrink-0 text-accent/85">
                  <span className="sr-only">{voiceLabel}</span>
                  <Volume2 size={14} aria-hidden />
                </span>
              ) : null}

              {isSelected ? (
                <span
                  aria-hidden
                  className="absolute inset-y-2 left-0 w-0.5 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

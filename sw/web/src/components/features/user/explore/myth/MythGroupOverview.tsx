"use client";

import Image from "next/image";
import { Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MythGroup, MythPerson, MythTradition } from "@/actions/home/mythAtlasTypes";
import { FormattedText, splitReadableParagraphs } from "@/components/ui";
import { mythGroupName } from "./mythGroupName";
import { mythLeadImage } from "./mythLeadImage";
import { MYTH_LAYOUT as layout } from "./mythLayout";

/** 왼쪽에 사진으로 세우는 핵심 인물 수 — 나머지는 오른쪽 목록에 이름으로 둔다 */
const CORE_COUNT = 3;

interface Props {
  tradition: MythTradition;
  group: MythGroup;
  /** 이 그룹의 인물 — 전승 차례대로. 앞사람이 핵심 인물이 된다(백오피스 명단 순서) */
  people: MythPerson[];
  onSelectPerson: (id: string) => void;
}

/* 그룹 개요 — 그룹 탭을 고르면 전승 개요 자리에 선다. 왼쪽에 핵심 인물 몇 명을 사진 칸으로 세우고,
   오른쪽에 이 무리가 누구인지와 구성원 한 줄 소개를 둔다. 사진이나 이름을 누르면 그 인물 상세로 간다.
   얼굴을 오려 한 무대에 세우던 출연진 판은 인물이 작고 어설퍼 보여 단순한 칸으로 바꿨다(26.09.12) */
export default function MythGroupOverview({ tradition, group, people, onSelectPerson }: Props) {
  const t = useTranslations("explore.hub.myth");
  const name = mythGroupName(group, { other: t("otherGroup"), unnamed: t("unnamedGroup") });
  const core = people.slice(0, CORE_COUNT);
  const summaryOf = (person: MythPerson) =>
    person.appearances.find((item) => item.traditionId === tradition.id)?.summary ?? null;

  return (
    <section aria-label={name} className={layout.overview}>
      <div className={layout.groupFrame}>
        <div className={layout.groupStage}>
          <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.15em] text-accent md:text-xs">
            <Users size={13} aria-hidden />
            {tradition.name}
          </p>
          <h3 className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-serif text-2xl font-black leading-tight text-white md:text-3xl">
            {name}
            <span className="font-sans text-xs font-bold tabular-nums text-white/70 md:text-sm">
              {t("groupMemberCount", { count: people.length })}
            </span>
          </h3>

          <p className="mt-6 text-xs font-bold tracking-[.16em] text-text-tertiary">{t("groupCore", { count: core.length })}</p>
          <ul className={layout.groupCoreList}>
            {core.map((person) => {
              const image = mythLeadImage(person, tradition.id) ?? person.avatarUrl;
              const summary = summaryOf(person);
              return (
                <li key={person.id} className={layout.groupCoreItem}>
                  <button type="button" onClick={() => onSelectPerson(person.id)} className="group block w-full text-start focus-visible:outline-none">
                    <span className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-white/10 group-hover:ring-accent group-focus-visible:ring-2 group-focus-visible:ring-accent">
                      {image ? (
                        <Image src={image} alt="" fill unoptimized sizes="(max-width: 1024px) 33vw, 200px" className="object-cover object-top" />
                      ) : (
                        <span aria-hidden className="grid h-full place-items-center font-serif text-3xl font-black text-white/30">{person.name[0]}</span>
                      )}
                    </span>
                    <span className="mt-2 block truncate text-sm font-bold text-text-primary group-hover:text-accent">{person.name}</span>
                    {summary && <span className="block truncate text-xs text-text-tertiary">{summary}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={layout.overviewPanel}>
          <div className={layout.overviewBody}>
            <div className={layout.overviewHeader}>
              <p className="flex shrink-0 items-center gap-2 text-xs font-bold tracking-[.16em] text-accent md:text-sm">
                <Users size={17} aria-hidden />
                {t("groupOverview")}
              </p>
            </div>

            <div className={layout.description}>
              <div className="space-y-4 break-keep text-[15px] leading-[1.9] text-text-secondary md:text-[16px]">
                {group.description ? (
                  splitReadableParagraphs(group.description).map((paragraph, index) => (
                    <p key={index}><FormattedText text={paragraph} /></p>
                  ))
                ) : (
                  <p className="text-text-tertiary">{t("groupDescriptionFallback")}</p>
                )}
              </div>

              <ul className="mt-5 space-y-1 border-t border-white/[0.08] pt-4">
                {people.map((person) => {
                  const summary = summaryOf(person);
                  return (
                    <li key={person.id}>
                      <button
                        type="button"
                        onClick={() => onSelectPerson(person.id)}
                        className="group flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                      >
                        <span className="shrink-0 text-sm font-bold text-text-primary group-hover:text-accent">{person.name}</span>
                        {summary && <span className="min-w-0 truncate text-xs text-text-tertiary">{summary}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

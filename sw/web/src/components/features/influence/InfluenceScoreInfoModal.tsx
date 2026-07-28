/*
  영향력 점수 안내 모달
  - 100점이 어떻게 짜였는지, 여섯 영역이 무엇을 보는지, 등급이 어떻게 갈리는지
  - 기준 출처: docs/project/celeb/celeb-4-influence.md
*/
"use client";

import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import {
  INFLUENCE_RANKS,
  INFLUENCE_RANK_LABELS,
  type InfluenceRank,
} from "@feelandnote/influence-constants";

import Modal, { ModalBody } from "@/components/ui/Modal";
import { INFLUENCE_CATEGORIES } from "@/constants/influence";
import { RANK_BADGE_TONES } from "./rankTones";

/** 언어에 기대지 않는 숫자 표기 (상수의 한국어 문구 대신) */
const RANK_RANGE_TEXT: Record<InfluenceRank, string> = {
  S: "80–100",
  A: "60–79",
  B: "50–59",
  C: "40–49",
  D: "0–39",
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentRank: InfluenceRank;
  totalScore: number;
  baseScore: number;
  transScore: number;
}

export default function InfluenceScoreInfoModal({
  isOpen,
  onClose,
  currentRank,
  totalScore,
  baseScore,
  transScore,
}: Props) {
  const t = useTranslations("profilePage.influence");
  const ti = useTranslations("profilePage.influence.scoreInfo");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={ti("title")} icon={Trophy} size="lg">
      <ModalBody className="space-y-5">
        {/* 100점이 어떻게 짜였는지 */}
        <section className="space-y-2">
          <p className="text-sm font-medium leading-relaxed text-text-primary break-keep">
            {ti("composition")}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <p className="text-xs font-bold text-text-secondary/70">{ti("domainsPart")}</p>
              <p className="mt-1 text-sm font-black tabular-nums text-accent">
                {baseScore}
                <span className="ms-1 text-xs font-bold text-text-secondary/70">/ 60</span>
              </p>
            </div>
            <div className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <p className="text-xs font-bold text-text-secondary/70">{ti("transPart")}</p>
              <p className="mt-1 text-sm font-black tabular-nums text-accent">
                {transScore}
                <span className="ms-1 text-xs font-bold text-text-secondary/70">/ 40</span>
              </p>
            </div>
            <div className="flex-1 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2.5">
              <p className="text-xs font-bold text-accent/80">{ti("totalPart")}</p>
              <p className="mt-1 text-sm font-black tabular-nums text-accent">
                {totalScore}
                <span className="ms-1 text-xs font-bold text-text-secondary/70">/ 100</span>
              </p>
            </div>
          </div>
        </section>

        {/* 여섯 영역이 각각 무엇을 보는지 */}
        <section className="space-y-1.5">
          <h3 className="px-1 text-xs font-bold uppercase tracking-wider text-text-secondary/70">
            {ti("domainsTitle")}
          </h3>

          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {INFLUENCE_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.key}
                  className="flex items-start gap-2.5 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-accent-dim/30 bg-accent/10">
                    <Icon size={13} className="text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {t(`categories.${category.key}`)}
                      <span className="ms-1.5 text-xs font-bold text-text-secondary/70">/ 10</span>
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-secondary/70 break-keep">
                      {ti(`domainQuestions.${category.key}`)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 등급이 어디서 갈리는지 */}
        <section className="space-y-1.5">
          <h3 className="px-1 text-xs font-bold uppercase tracking-wider text-text-secondary/70">
            {ti("ranksTitle")}
          </h3>

          <div className="space-y-1">
            {INFLUENCE_RANKS.map((rank) => {
              const isCurrent = rank === currentRank;
              return (
                <div
                  key={rank}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                    isCurrent ? "border border-accent/40 bg-accent/10" : "border border-transparent"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-sm font-black ${RANK_BADGE_TONES[rank]}`}
                  >
                    {rank}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      isCurrent ? "text-accent" : "text-text-primary"
                    }`}
                  >
                    {INFLUENCE_RANK_LABELS[rank]}
                  </span>
                  <span className="ms-auto text-xs font-bold tabular-nums text-text-secondary/70">
                    {RANK_RANGE_TEXT[rank]}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="px-1 pt-1 text-xs leading-relaxed text-text-secondary/70 break-keep">
            {ti("note")}
          </p>
        </section>
      </ModalBody>
    </Modal>
  );
}

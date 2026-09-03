/* ─────────────────────────────────────────────
 * [celeb 상세] analysis — 영향력 순위 상세 모달
 * - 목차 위치: analysis > influence
 * - 데이터: detail(순위·분야) prop
 * - 함께 보기: CelebInfluenceSection.tsx, InfluenceExplorer.tsx
 * ───────────────────────────────────────────── */
"use client";

import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  INFLUENCE_MAX_SCORES,
  type InfluenceField,
} from "@feelandnote/influence-constants";

import type {
  InfluenceExplorerPerson,
  InfluenceFieldLeader,
} from "@/actions/home/getInfluenceExplorer";
import Modal, { ModalBody } from "@/components/ui/Modal";

export type InfluenceRankDetail =
  | {
      kind: "ranking";
      person: InfluenceExplorerPerson;
      total: number;
    }
  | {
      kind: "field";
      person: InfluenceFieldLeader;
      field: InfluenceField;
    };

interface Props {
  detail: InfluenceRankDetail | null;
  onClose: () => void;
}

export default function InfluenceRankModal({ detail, onClose }: Props) {
  const t = useTranslations("profilePage.influence");

  if (!detail) return null;

  const { person } = detail;
  const ranking =
    detail.kind === "ranking"
      ? detail.person.ranking
      : detail.person.fieldRank;
  const tieCount =
    detail.kind === "ranking"
      ? detail.person.tieCount
      : detail.person.fieldTieCount;
  const scopeLabel =
    detail.kind === "field"
      ? detail.field === "transhistoricity"
        ? t("transhistoricity")
        : t(`categories.${detail.field}`)
      : t("explorer.overallRanking");

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("explorer.rankModalTitle")}
      icon={Trophy}
      size="sm"
    >
      <ModalBody className="space-y-4 px-4 pb-4 pt-3">
        <header className="text-center">
          <p className="text-sm font-bold text-text-primary">
            {person.nickname}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-text-secondary">
            {scopeLabel}
          </p>
          <p className="mt-3 font-serif text-3xl font-black tabular-nums text-accent">
            {tieCount > 1
              ? t("explorer.tiedRank", { ranking })
              : t("explorer.rankNumber", { ranking })}
          </p>
          <p className="mt-1 text-xs font-bold text-text-secondary">
            {tieCount > 1
              ? t("explorer.tieCount", { count: tieCount })
              : t("explorer.noTie")}
          </p>
        </header>

        <dl className="grid grid-cols-2 overflow-hidden rounded-md border border-white/[0.09] bg-white/[0.02]">
          {detail.kind === "ranking" ? (
            <>
              <div className="border-e border-white/[0.07] px-3 py-3 text-center">
                <dt className="text-[11px] font-semibold text-text-secondary">
                  {t("explorer.totalScoreLabel")}
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold tabular-nums text-text-primary">
                  {t("explorer.scoreOutOf", {
                    score: person.total_score,
                    max: 100,
                  })}
                </dd>
              </div>
              <div className="px-3 py-3 text-center">
                <dt className="text-[11px] font-semibold text-text-secondary">
                  {t("explorer.rankingPopulation")}
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold tabular-nums text-text-primary">
                  {t("explorer.peopleCount", { count: detail.total })}
                </dd>
              </div>
            </>
          ) : (
            <>
              <div className="border-e border-white/[0.07] px-3 py-3 text-center">
                <dt className="text-[11px] font-semibold text-text-secondary">
                  {t("explorer.fieldScoreLabel", { field: scopeLabel })}
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold tabular-nums text-text-primary">
                  {t("explorer.scoreOutOf", {
                    score: detail.person.fieldScore,
                    max: INFLUENCE_MAX_SCORES[detail.field],
                  })}
                </dd>
              </div>
              <div className="px-3 py-3 text-center">
                <dt className="text-[11px] font-semibold text-text-secondary">
                  {t("explorer.totalScoreLabel")}
                </dt>
                <dd className="mt-1 font-mono text-sm font-bold tabular-nums text-text-primary">
                  {t("explorer.scoreOutOf", {
                    score: person.total_score,
                    max: 100,
                  })}
                </dd>
              </div>
            </>
          )}
        </dl>
      </ModalBody>
    </Modal>
  );
}

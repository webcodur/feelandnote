/*
  시대초월성 안내 모달
  - 40점 척도의 뜻과 구간별 기준·대표 인물을 보여준다
  - 구간 정의 출처: docs/project/celeb/celeb-4-influence.md 「통시성」
*/
"use client";

import { useTranslations } from "next-intl";
import { Hourglass } from "lucide-react";

import Modal, { ModalBody } from "@/components/ui/Modal";

const TRANSHISTORICITY_BANDS = [
  { key: "foundation", range: "35–40", min: 35 },
  { key: "paradigm", range: "28–34", min: 28 },
  { key: "domain", range: "20–27", min: 20 },
  { key: "modern", range: "10–19", min: 10 },
  { key: "contemporary", range: "5–9", min: 5 },
  { key: "ownEra", range: "0–4", min: 0 },
] as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** 현재 인물의 점수 — 해당 구간을 강조한다 */
  value: number;
}

export default function TranshistoricityInfoModal({ isOpen, onClose, value }: Props) {
  const t = useTranslations("profilePage.influence.transhistoricityInfo");
  const currentBand = TRANSHISTORICITY_BANDS.find((band) => value >= band.min);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("title")} icon={Hourglass} size="lg">
      <ModalBody className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium leading-relaxed text-text-primary break-keep">
            {t("definition")}
          </p>
          <p className="text-xs leading-relaxed break-keep">
            {t("criteria")}
          </p>
        </div>

        <div className="space-y-1.5">
          <h3 className="px-1 text-xs font-bold uppercase tracking-wider">
            {t("bandsTitle")}
          </h3>

          {TRANSHISTORICITY_BANDS.map((band) => {
            const isCurrent = band.key === currentBand?.key;
            return (
              <div
                key={band.key}
                className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${
                  isCurrent ? "border border-accent/40 bg-accent/10" : "border border-transparent"
                }`}
              >
                <span
                  className={`shrink-0 rounded-md px-2 py-1 text-xs font-black tabular-nums ${
                    isCurrent
                      ? "bg-accent/25 text-accent"
                      : "bg-white/5 "
                  }`}
                >
                  {band.range}
                </span>

                <div className="min-w-0 space-y-0.5">
                  <p
                    className={`text-sm font-semibold break-keep ${
                      isCurrent ? "text-accent" : "text-text-primary"
                    }`}
                  >
                    {t(`bands.${band.key}.desc`)}
                    {isCurrent && (
                      <span className="ms-2 text-xs font-bold text-accent/80">
                        {t("currentScore", { value })}
                      </span>
                    )}
                  </p>
                  <p className="text-xs leading-relaxed break-keep">
                    {t(`bands.${band.key}.examples`)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ModalBody>
    </Modal>
  );
}

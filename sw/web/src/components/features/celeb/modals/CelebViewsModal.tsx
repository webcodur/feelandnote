/*
  파일명: /components/features/celeb/modals/CelebViewsModal.tsx
  기능: 인물 조회수 안내 모달
  책임: 최근 기간 창의 시작·끝 날짜와 그 기간 조회수, 누적 조회수를 함께 보여
        "언제부터 언제까지 몇 번 열린 프로필인지"를 분명히 알린다.
        (세는 방식: 같은 브라우저 4시간 내 재방문 제외 — 화면에는 밝히지 않는다)
*/ // ------------------------------

"use client";

import { Eye } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Modal, ModalBody } from "@/components/ui";
import { Z_INDEX } from "@/constants/zIndex";

interface CelebViewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nickname: string;
  /** 최근 기간 조회수. 아직 안 받아왔으면 그 칸을 숨긴다 */
  recentViews?: number | null;
  /** 누적 조회수 (없으면 그 줄을 숨긴다) */
  totalViews?: number | null;
  /** 최근 기간 창 시작·끝 (YYYY-MM-DD) */
  windowStart?: string | null;
  windowEnd?: string | null;
}

/** YYYY-MM-DD → 화면 표기. 값이 없거나 형식이 어긋나면 그대로 돌려준다(조용히 꾸미지 않는다). */
function formatDate(iso: string | null | undefined, locale: string) {
  if (!iso) return null;
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return locale === "en" ? `${m}/${d}/${y}` : `${y}. ${Number(m)}. ${Number(d)}.`;
}

export default function CelebViewsModal({
  isOpen,
  onClose,
  nickname,
  recentViews,
  totalViews,
  windowStart,
  windowEnd,
}: CelebViewsModalProps) {
  const t = useTranslations("shared.celebViews");
  const locale = useLocale();

  const from = formatDate(windowStart, locale);
  const to = formatDate(windowEnd, locale);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("title")}
      icon={Eye}
      size="sm"
      zIndex={Z_INDEX.modal + 10}
    >
      <ModalBody className="flex flex-col gap-5 px-5 py-5">
        {/* 설명 + 기간을 구조적으로 분리 */}
        <div className="flex flex-col gap-1.5 text-center">
          <p className="text-base text-text-primary leading-relaxed break-keep">
            {t("description", { nickname })}
          </p>
          {from && to && (
            <p className="text-sm text-text-secondary">
              {t("period", { from, to })}
            </p>
          )}
        </div>

        {/* 숫자 두 칸 */}
        <div className="flex items-stretch gap-2">
          {typeof recentViews === "number" && (
            <div className="flex-1 flex flex-col items-center gap-1.5 py-4 rounded-md bg-white/[0.04] border border-white/10">
              <span className="text-xs text-text-tertiary">{t("recentLabel")}</span>
              <span className="text-2xl font-bold text-accent tabular-nums leading-none">{recentViews}</span>
            </div>
          )}
          {typeof totalViews === "number" && (
            <div className="flex-1 flex flex-col items-center gap-1.5 py-4 rounded-md bg-white/[0.04] border border-white/10">
              <span className="text-xs text-text-tertiary">{t("totalLabel")}</span>
              <span className="text-2xl font-bold text-text-primary tabular-nums leading-none">{totalViews}</span>
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}

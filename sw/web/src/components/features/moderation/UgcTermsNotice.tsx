/*
  파일명: /components/features/moderation/UgcTermsNotice.tsx
  기능: 게시 전 약관 안내
  책임: 글을 올리기 전에 이용약관과 금지 콘텐츠 기준을 알린다.

  제출을 막지 않는다 — 이용약관에 "게시 시 동의로 본다"는 조항(제7조)이 있고,
  별도 확인 절차를 세우면 기존 작성 흐름을 고쳐야 한다.
*/ // ------------------------------

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";

interface UgcTermsNoticeProps {
  className?: string;
  /** compact: 경고 박스 없이 한 줄 고지만 노출한다.
   *  방명록처럼 작성자가 적은 화면에서 큰 경고 박스가 위축 요인이 되므로,
   *  Play 정책이 요구하는 "게시 전 약관 고지"는 유지하되 무게를 줄인다. */
  variant?: "panel" | "compact";
}

export default function UgcTermsNotice({
  className = "",
  variant = "panel",
}: UgcTermsNoticeProps) {
  const t = useTranslations("moderation.ugcNotice");

  if (variant === "compact") {
    return (
      <p className={`text-[10px] leading-relaxed text-text-secondary opacity-70 ${className}`}>
        {t("compact")}{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-accent">
          {t("linkShort")}
        </Link>
      </p>
    );
  }

  return (
    <div className={`rounded-sm border border-border bg-black/20 p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-accent" />
        <div className="space-y-1">
          <p className="text-sm text-text-primary">{t("title")}</p>
          <p className="text-sm text-text-secondary">{t("body")}</p>
          <Link href="/terms" className="inline-block text-sm text-accent hover:text-accent-hover">
            {t("link")}
          </Link>
        </div>
      </div>
    </div>
  );
}

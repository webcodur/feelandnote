import { useTranslations } from "next-intl";
import { CheckCheck } from "lucide-react";

/** 제작 상태를 알리는 읽기 전용 표시. 선택 상태·개인 감상 진행과 구분한다. */
export default function SceneCompletionBadge({ compact = false, shortLabel = false }: { compact?: boolean; shortLabel?: boolean }) {
  const t = useTranslations("explore.hub.myth");
  if (shortLabel) {
    return (
      <span data-scene-completion title={`${t("scenesComplete")} · ${t("scenesCompleteHint")}`}
        className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-sky-200/15 bg-sky-200/[0.07] px-2 py-0.5 text-[11px] font-medium text-sky-100/85">
        <span aria-hidden>{t("scenesCompleteShort")}</span>
        <span className="sr-only">{t("scenesComplete")}</span>
      </span>
    );
  }
  if (compact) {
    return (
      <span data-scene-completion title={`${t("scenesComplete")} · ${t("scenesCompleteHint")}`}
        className="inline-flex shrink-0 items-center align-middle text-sky-100/80">
        <CheckCheck size={16} strokeWidth={2} aria-hidden />
        <span className="sr-only">{t("scenesComplete")}</span>
      </span>
    );
  }
  return (
    <span data-scene-completion title={t("scenesCompleteHint")}
      className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-sky-200/20 bg-sky-200/[0.06] px-3 py-1 text-xs font-medium leading-5 text-sky-100/80">
      {t("scenesComplete")}
    </span>
  );
}

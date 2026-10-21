import { useTranslations } from "next-intl";

/** 선택기와 전체 목록이 공유하는 지역·테마별 완성 편수. */
export function SceneCompletionCountBadge({ names }: { names: string[] }) {
  const t = useTranslations("explore.hub.myth");
  if (!names.length) return null;
  const label = t("scenesCompleteCount", { count: names.length });
  return (
    <span data-scene-completion-count={names.length} title={`${label}: ${names.join(", ")}`}
      className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-sky-200/15 bg-sky-200/[0.07] px-2 py-0.5 text-[11px] font-medium tabular-nums text-sky-100/85">
      <span aria-hidden>{t("scenesCompleteCountShort", { count: names.length })}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** 제작 상태를 알리는 읽기 전용 표시. 선택 상태·개인 감상 진행과 구분한다. */
export default function SceneCompletionBadge({ shortLabel = false }: { shortLabel?: boolean }) {
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
  return (
    <span data-scene-completion title={t("scenesCompleteHint")}
      className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-sky-200/20 bg-sky-200/[0.06] px-3 py-1 text-xs font-medium leading-5 text-sky-100/80">
      {t("scenesComplete")}
    </span>
  );
}

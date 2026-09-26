import { getTranslations } from "next-intl/server";

export default async function WorksRevisionNotice({ section }: { section: "museum" | "academy" }) {
  const t = await getTranslations("library.hub");
  return (
    <aside className="mb-6 flex flex-col gap-2 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
      <span className="shrink-0 text-xs font-semibold text-accent">{t("reorganizing")}</span>
      <p className="text-xs leading-relaxed text-text-secondary sm:text-sm">{t(`${section}Reorganizing`)}</p>
    </aside>
  );
}

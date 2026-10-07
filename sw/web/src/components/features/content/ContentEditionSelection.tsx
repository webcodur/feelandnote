"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, Layers } from "lucide-react";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";
import styles from "./ContentDetail.module.css";

interface Props {
  content: ContentDetailData["content"];
  editions: NonNullable<ContentDetailData["content"]["bookEditions"]>;
  status: string;
  onChange: (id: string) => void;
}

export default function ContentEditionSelection({ content, editions, status, onChange }: Props) {
  const t = useTranslations("contentDetail");
  const unavailable = status === "invalid" || status === "unavailable";
  const scope = editions.find(edition => edition.id === content.purchaseEditionId)?.textScope;
  if (content.type !== "BOOK") return null;
  return (
    <div className="space-y-3">
      {editions.length > 0 && (
        <div className={styles.editionField}>
          <label className="block space-y-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary"><Layers size={13} aria-hidden="true" />{t("editionSelection", { count: editions.length })}</span>
            <div className={styles.selectWrap}>
            <select aria-label={t("editionSelection", { count: editions.length })}
              value={unavailable ? "" : content.purchaseEditionId ?? ""} onChange={event => onChange(event.target.value)}
              className={styles.editionSelect}>
              <option value="" disabled>{t("chooseEdition")}</option>
              {editions.map(edition => <option key={edition.id} value={edition.id}>
                {[edition.title, t(edition.locale === "en" ? "editionEnglish" : "editionKorean"), edition.publisher, edition.isbn].filter(Boolean).join(" · ")}
              </option>)}
            </select>
            <ChevronDown size={15} className={styles.selectChevron} aria-hidden="true" />
            </div>
          </label>
          <p className="text-xs leading-relaxed text-text-tertiary">{t("editionWorkRecords")}</p>
          {!unavailable && scope && <p className="break-words text-xs leading-relaxed text-text-secondary">
            {t("editionScope")}: {scope === "complete" ? t("editionCompleteText") : scope}
          </p>}
        </div>
      )}
      {unavailable && <div role="alert" className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-4 text-sm text-text-secondary">
        <p>{t(status === "invalid" ? "invalidEdition" : "unavailableEdition")}</p>
        <button type="button" onClick={() => onChange("")}
          className="rounded-lg border border-accent/40 px-3 py-2 text-accent hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {t("openWorkInfo")}
        </button>
      </div>}
    </div>
  );
}

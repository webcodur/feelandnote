import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import FormattedText from "@/components/ui/FormattedText";
import type { AtlasCatalogGroup } from "@/lib/atlas-catalog";
import styles from "./AtlasCatalogList.module.css";

/** 전체 선택에서는 표지 대신 분류와 항목 이름을 한눈에 훑는다. */
export default function AtlasCatalogList({ groups }: { groups: AtlasCatalogGroup[] }) {
  const t = useTranslations("explore.atlasCatalog");
  return <div className={styles.list} data-atlas-catalog-list>
    {groups.map(group => <section key={group.id} className={styles.group} aria-labelledby={`catalog-heading-${group.id}`}>
      <h2 id={`catalog-heading-${group.id}`} className={styles.heading}>{group.name}</h2>
      <ul className={styles.entries}>
        {group.entries.map(entry => <li key={entry.id}>
          <Link href={entry.href} prefetch={false} className={styles.entry} data-atlas-catalog-entry={entry.id}
            data-atlas-scenes-complete={entry.scenesComplete || undefined}>
            <span className={styles.name}>{entry.name}</span>
            <span className={styles.members} title={t("members", { count: entry.members })}>
              <Users size={13} aria-hidden />
              <span aria-hidden>{entry.members}</span>
              <span className="sr-only">{t("members", { count: entry.members })}</span>
            </span>
            {entry.headline && <span className={styles.headline}><FormattedText text={entry.headline} /></span>}
            {entry.scenesComplete && <span className={styles.complete}>{t("scenesComplete")}</span>}
          </Link>
        </li>)}
      </ul>
    </section>)}
  </div>;
}

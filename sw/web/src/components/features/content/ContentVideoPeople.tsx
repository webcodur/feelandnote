"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, RotateCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import FigurePersonRows from "@/components/features/celeb/FigurePersonRows";
import { getVideoPeople } from "@/actions/contents/getVideoPeople";
import type { VideoCredit } from "@/lib/celeb/videoCredits";
import styles from "./ContentDetail.module.css";

export default function ContentVideoPeople({ externalId, fallback }: {
  externalId: string; fallback?: { name: string; character: string }[];
}) {
  const locale = useLocale();
  const t = useTranslations("contentDetail");
  const [result, setResult] = useState<{ key: string; people: VideoCredit[] | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${externalId}:${locale}`;
  useEffect(() => {
    let active = true;
    void getVideoPeople(externalId, locale).then(people => {
      if (active) setResult({ key: `${externalId}:${locale}`, people });
    }).catch(() => { if (active) setResult({ key: `${externalId}:${locale}`, people: null }); });
    return () => { active = false; };
  }, [externalId, locale, attempt]);
  const people: VideoCredit[] = result?.key === key && result.people ? result.people : (fallback ?? []).map((person, index) => ({
    id: -index - 1, name: person.name, character: person.character, portrait: null, roles: ['cast'],
  }));
  const groups = [
    { label: t("filmmakers"), people: people.filter(person => person.roles.some(role => role !== 'cast')), cast: false },
    { label: t("cast"), people: people.filter(person => person.roles.includes('cast')), cast: true },
  ].filter(group => group.people.length);
  return <div className={styles.peopleSections}>
    {groups.map(group => <section key={group.label} aria-label={group.label}>
      <h2 className={styles.detailHeading}>{group.label}</h2>
      <FigurePersonRows locale={locale} rows={group.people.map(person => ({
        person: {
          id: person.profile?.id ?? `tmdb-person-${person.id}`,
          slug: person.profile?.slug ?? null,
          listed: Boolean(person.profile?.id),
          name: person.profile?.name || person.name,
          avatarUrl: person.profile?.avatar || person.portrait,
          qid: null,
        },
        subtitle: group.cast ? person.character : person.roles.filter(role => role !== 'cast').map(role => t(role)).join(' · '),
      }))} />
    </section>)}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <a className={styles.creditSource} href={`https://www.themoviedb.org/${externalId.replace('tmdb-', '').replace('-', '/')}/cast`} target="_blank" rel="noopener noreferrer">{t("creditsSource", { source: "TMDB" })}<ArrowUpRight size={12} aria-hidden="true" /></a>
      {result?.key !== key && <span role="status" className="text-xs text-text-tertiary">{t("peopleLoading")}</span>}
      {result?.key === key && !result.people && <button type="button" onClick={() => { setResult(null); setAttempt(value => value + 1); }} className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-xs text-text-secondary hover:bg-bg-raised hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"><RotateCw size={13} aria-hidden="true" />{t("retryPeople")}</button>}
    </div>
  </div>;
}

"use client";

import { LoaderCircle } from "lucide-react";
import Image from "next/image";

import { Link } from "@/i18n/navigation";

import VoiceBadge from "@/components/ui/VoiceBadge";
import WikiMark from "@/components/ui/icons/WikiMark";
import { getCelebProfileUrl } from "@/lib/url";
import AnimatedHeight from "@/components/ui/AnimatedHeight";

import styles from "./RelationGraphSection.module.css";
import type { PersonNode } from "./types";

interface Props {
  person: PersonNode;
  relationLabel: string;
  position: number;
  total: number;
  profession: string | null;
  country: string | null;
  /** 인물 페이지로 바로 가는 링크의 이름 */
  goLabel: string;
  wikidataLabel: string;
  speakLabel: string;
  speakingLoading?: boolean;
  hasVoice?: boolean;
  voicePulse?: number;
  onSpeak?: () => void;
  isCenter?: boolean;
  headline?: string | null;
  quotes?: string | null;
  titleBadge?: string | null;
  centerBreakdown?: {
    social: number;
    family: number;
    other: number;
  } | null;
  locale?: string;
}

const year = (date: string | null) => date ? date.slice(0, 4).replace("-", "") : null;

function ProfileFallback() {
  return <span className={styles.inspectorProfileFallback} aria-hidden="true">
    <svg viewBox="0 0 100 100" focusable="false">
      <circle className={styles.inspectorProfileHead} cx="50" cy="34" r="19" />
      <path className={styles.inspectorProfileBody} d="M17 92c2-24 15-37 33-37s31 13 33 37H17Z" />
    </svg>
  </span>;
}

function InspectorActions(props: Props) {
  const { person } = props;
  if (!props.onSpeak && !person.qid) return null;
  return <div className={styles.inspectorActions}>
    {props.onSpeak && <button type="button" onClick={props.onSpeak}
      disabled={props.speakingLoading} aria-label={`${props.speakLabel}: ${person.name}`} title={props.speakLabel}
      aria-busy={props.speakingLoading || undefined}
      className="outline-none hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">
      {props.speakingLoading ? <LoaderCircle className="animate-spin" size={20} />
        : <VoiceBadge size="lg" active={props.hasVoice} pulse={props.voicePulse} />}
    </button>}
    {person.qid && <a href={`https://www.wikidata.org/wiki/${person.qid}`} target="_blank" rel="noreferrer"
      aria-label={props.wikidataLabel} title={props.wikidataLabel}>
      <WikiMark size={19} />
    </a>}
  </div>;
}

function InspectorCard(props: Props) {
  const { person, isCenter, locale } = props;
  const years = year(person.birthDate)
    ? `${year(person.birthDate)}–${person.deathDate ? year(person.deathDate) : ""}`
    : null;
  const href = isCenter ? "#introduction" : person.listed && person.slug ? getCelebProfileUrl(person) : null;
  const portrait = person.avatarUrl
    ? <Image src={person.avatarUrl} alt="" width={208} height={208} unoptimized />
    : <ProfileFallback />;
  return <div className={styles.inspectorCard}>
    <div className={styles.inspectorPortrait}>
      {href ? <Link href={href} prefetch={false}
        className={`${styles.inspectorAvatar} ${styles.inspectorAvatarButton} outline-none focus-visible:ring-2 focus-visible:ring-accent`}
        aria-label={`${props.goLabel}: ${person.name}`}>
        {portrait}
      </Link> : <span className={styles.inspectorAvatar}>{portrait}</span>}

    </div>

    <div className={styles.inspectorContent}>
      <div className={styles.inspectorIdentity}>
        {isCenter ? (
          <div className="flex items-center gap-2">
            <span className={styles.centerBadge}>
              {locale === "en" ? "Center Figure" : "중심 인물"}
            </span>
            {props.titleBadge && (
              <span className={styles.centerTitleBadge}>{props.titleBadge}</span>
            )}
          </div>
        ) : (
          <small>{String(props.position).padStart(2, "0")} / {String(props.total).padStart(2, "0")}</small>
        )}
        {href ? <Link href={href} prefetch={false}
          className="rounded-sm outline-none hover:[&>strong]:text-accent focus-visible:ring-2 focus-visible:ring-accent">
          <strong>{person.name}</strong>
        </Link> : <strong>{person.name}</strong>}
        <span className={isCenter ? "font-semibold text-accent" : undefined}>{props.relationLabel}</span>
      </div>

      {(props.profession || props.country || years) && <div className={styles.inspectorMeta}>
        {props.profession && <span>{props.profession}</span>}
        {props.country && <span>{props.country}</span>}
        {years && <span>{years}</span>}
      </div>}

      {isCenter ? (
        <div className={styles.centerInspectorArea}>
          <div className={styles.centerHeadlineCard}>
            <span className={styles.centerQuoteMark} aria-hidden="true">“</span>
            <div className={styles.centerHeadlineMeta}>
              <span className={styles.centerHeadlineLabel}>
                {locale === "en" ? "Profile Essence" : "한 줄 정의"}
              </span>
              {props.centerBreakdown && (
                <div className={styles.centerStatsPills}>
                  <span className={styles.centerPill}>
                    {locale === "en" ? "Social" : "사회"} <strong>{props.centerBreakdown.social}</strong>
                  </span>
                  <span className={styles.centerPill}>
                    {locale === "en" ? "Family" : "가족"} <strong>{props.centerBreakdown.family}</strong>
                  </span>
                  {props.centerBreakdown.other > 0 && (
                    <span className={styles.centerPill}>
                      {locale === "en" ? "Other" : "기타"} <strong>{props.centerBreakdown.other}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className={styles.centerHeadlineText}>
              {props.headline || person.note}
            </p>
            {props.quotes && (
              <p className={styles.centerFamousQuote}>
                <span className={styles.centerFamousQuoteLabel}>
                  {locale === "en" ? "Quote" : "어록"}
                </span>
                “{props.quotes}”
              </p>
            )}
          </div>
        </div>
      ) : (
        person.note && <p className={styles.inspectorNote}>{person.note}</p>
      )}
    </div>

    <InspectorActions {...props} />
  </div>;
}

export default function RelationInspector(props: Props) {
  return (
    <aside className={styles.desktopInspector}>
      <AnimatedHeight duration={260}>
        <InspectorCard {...props} />
      </AnimatedHeight>
    </aside>
  );
}

"use client";

import { ExternalLink, LoaderCircle, UserRound } from "lucide-react";
import Image from "next/image";

import VoiceBadge from "@/components/ui/VoiceBadge";

import styles from "./RelationGraphSection.module.css";
import type { PersonNode } from "./types";

interface Props {
  person: PersonNode;
  relationLabel: string;
  position: number;
  total: number;
  profession: string | null;
  country: string | null;
  loading?: boolean;
  openLabel: string;
  wikidataLabel: string;
  speakLabel: string;
  speakingLoading?: boolean;
  hasVoice?: boolean;
  voicePulse?: number;
  onOpen: () => void;
  onSpeak?: () => void;
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
  if ((!person.listed || !person.slug) && !person.qid) return null;
  return <div className={styles.inspectorActions}>
    {person.listed && person.slug && <button type="button" disabled={props.loading} onClick={props.onOpen}
      aria-label={props.openLabel} title={props.openLabel}>
      {props.loading ? <LoaderCircle size={20} className="animate-spin" /> : <UserRound size={21} />}
    </button>}
    {person.qid && <a href={`https://www.wikidata.org/wiki/${person.qid}`} target="_blank" rel="noreferrer"
      aria-label={props.wikidataLabel} title={props.wikidataLabel}>
      <ExternalLink size={19} />
    </a>}
  </div>;
}

function InspectorCard(props: Props) {
  const { person } = props;
  const years = year(person.birthDate)
    ? `${year(person.birthDate)}–${person.deathDate ? year(person.deathDate) : ""}`
    : null;
  const portrait = person.avatarUrl
    ? <Image src={person.avatarUrl} alt="" width={208} height={208} unoptimized />
    : <ProfileFallback />;
  return <div className={styles.inspectorCard}>
    <div className={styles.inspectorPortrait}>
      {props.onSpeak ? <button type="button" className={`${styles.inspectorAvatar} ${styles.inspectorAvatarButton}`}
        onClick={props.onSpeak} disabled={props.speakingLoading} aria-label={props.speakLabel} title={props.speakLabel}
        aria-busy={props.speakingLoading || undefined}>
        {portrait}
        <span className={styles.inspectorVoiceBadge} aria-hidden>
          {props.speakingLoading ? <LoaderCircle className="animate-spin" />
            : <VoiceBadge size="lg" active={props.hasVoice} pulse={props.voicePulse} />}
        </span>
      </button> : <span className={styles.inspectorAvatar}>{portrait}</span>}
    </div>

    <div className={styles.inspectorContent}>
      <div className={styles.inspectorIdentity}>
        <small>{String(props.position).padStart(2, "0")} / {String(props.total).padStart(2, "0")}</small>
        <strong>{person.name}</strong>
        <span>{props.relationLabel}</span>
      </div>

      {(props.profession || props.country || years) && <div className={styles.inspectorMeta}>
        {props.profession && <span>{props.profession}</span>}
        {props.country && <span>{props.country}</span>}
        {years && <span>{years}</span>}
      </div>}

      {person.note && <p className={styles.inspectorNote}>{person.note}</p>}
    </div>

    <InspectorActions {...props} />
  </div>;
}

export default function RelationInspector(props: Props) {
  return <aside className={styles.desktopInspector}><InspectorCard {...props} /></aside>;
}

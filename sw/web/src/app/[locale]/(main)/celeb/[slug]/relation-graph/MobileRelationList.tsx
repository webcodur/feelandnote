import Image from "next/image";
import { useMemo, useRef } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";

import { Link } from "@/i18n/navigation";
import CelebDetailCardButton from "@/components/shared/CelebDetailCardButton";
import SwipeControls from "@/components/ui/SwipeControls";
import VoiceBadge from "@/components/ui/VoiceBadge";
import WikiMark from "@/components/ui/icons/WikiMark";
import { useSnapActiveHeight } from "@/components/ui/useSnapActiveHeight";
import { getCelebProfileUrl } from "@/lib/url";
import styles from "./MobileRelationList.module.css";
import type { FocusOption } from "./RelationToolbar";
import type { PersonNode, RelationFocus } from "./types";

/** 인사 대사를 걸 수 있는지와 그 진행 상태. 데스크톱 인스펙터가 쓰는 것과 같은 값이다 */
interface SpeakerState {
  canSpeak: boolean;
  loading: boolean;
  hasVoice: boolean;
  pulse: number;
}

interface Props {
  label: string;
  focusOptions: FocusOption[];
  selectedFocus: RelationFocus | null;
  activePeople: PersonNode[];
  relationLabel: (person: PersonNode) => string;
  /** 등록된 인물은 눌러 인물 미리보기(인물 페이지 진입)로 잇는다 */
  onOpenPerson: (person: PersonNode) => void;
  openLabel: string;
  /** 얼굴을 누르면 인사 대사가 나온다 — 데스크톱 인스펙터의 아바타 단추와 같은 동작 */
  onSpeak: (person: PersonNode) => void;
  speakerFor: (person: PersonNode) => SpeakerState;
  speakLabels: { voice: string; text: string };
  /** 인물 페이지로 바로 가는 링크의 이름 */
  goLabel: string;
  wikidataLabel: string;
}

function ProfileFallback() {
  return <span className={styles.fallback} aria-hidden="true">
    <svg viewBox="0 0 100 100" focusable="false">
      <circle cx="50" cy="34" r="20" />
      <path d="M5 105c2-31 19-49 45-49s43 18 45 49H5Z" />
    </svg>
  </span>;
}

/** 좁은 화면에서 한 쪽에 세우는 인물 수. 세로로 다 훑지 않고 옆으로 넘겨 본다 */
const PEOPLE_PER_PAGE = 2;

/**
 * 관계 갈래에 매기는 색 번호. 가족은 부모·형제·배우자·자녀, 사회는 네 방향으로
 * 각각 네 갈래다. 갈래별 제목을 없앤 대신 이 색이 무슨 관계인지 눈에 먼저 알린다.
 */
const TONE_BY_FOCUS: Record<string, number> = {
  parents: 1, up: 1,
  siblings: 2, left: 2,
  spouses: 3, right: 3,
  children: 4, down: 4,
};

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );
}

export default function MobileRelationList(props: Props) {
  const sections = useMemo(() => {
    const activeIds = new Set(props.activePeople.map(({ id }) => id));
    const seen = new Set<string>();
    return props.focusOptions
      .filter(({ key }) => !props.selectedFocus || key === props.selectedFocus)
      .map((option) => ({
        ...option,
        people: option.people.filter(({ id }) => {
          if (!activeIds.has(id) || seen.has(id)) return false;
          seen.add(id);
          return true;
        }),
      }))
      .filter(({ people }) => people.length);
  }, [props.activePeople, props.focusOptions, props.selectedFocus]);

  /* 갈래별 상자를 걷고 인물만 한 줄로 잇는다 — 각 항목이 이미 누구와 어떤 사이인지 말한다 */
  const entries = useMemo(
    () => sections.flatMap((section) =>
      section.people.map((person) => ({ person, tone: TONE_BY_FOCUS[section.key] ?? 0 })),
    ),
    [sections],
  );

  const pages = useMemo(() => chunk(entries, PEOPLE_PER_PAGE), [entries]);

  // 가로로 넘기는 줄은 모든 쪽이 한 줄에 나란히 있어, 줄 자체의 높이는 —
  // align-items를 뭘 주든 — 가장 긴 쪽에 묶인다. 지금 보이는 쪽 높이만 쓰려면
  // 직접 재서 입혀야 한다. 그래서 카드 길이가 쪽마다 달라도 출렁이며 맞는다.
  const listRef = useRef<HTMLUListElement>(null);
  const activeHeight = useSnapActiveHeight(listRef, pages);

  if (entries.length === 0) return null;

  return <div className={styles.root} aria-label={props.label}>
      {/* 두 명씩 한 쪽으로 묶어 옆으로 넘긴다 */}
      <ul ref={listRef} className={styles.list} style={activeHeight ? { height: activeHeight } : undefined}>
        {pages.map((page, pageIndex) => <li key={pageIndex} className={styles.page}>
        {page.map(({ person, tone }) => {
          const relation = props.relationLabel(person);
          const listed = person.listed && Boolean(person.slug);
          const speaker = props.speakerFor(person);
          const speakLabel = speaker.hasVoice ? props.speakLabels.voice : props.speakLabels.text;
          const face = person.avatarUrl
            ? <Image src={person.avatarUrl} alt="" width={200} height={200} unoptimized />
            : <ProfileFallback />;
          const identity = <>
            <strong>{person.name}</strong>
            {person.note ? <small>{person.note}</small> : null}
          </>;

          /* 한 카드에 조작이 셋이다. 이름·소개를 누르면 인물로 가고, 얼굴을 누르면 대사가
             나오고, 바깥 링크는 위키데이터로 나간다. 단추 안에 단추를 넣을 수 없으므로
             인물로 가는 단추만 면을 카드 전체로 넓히고(::after) 나머지 둘이 그 위에 올라탄다. */
          return <div key={person.id} role="listitem" data-tone={tone} className={styles.person}>
            {/* 1열: 얼굴과 그 아래 관계 유형("영감을 준" 등) */}
            <span className={styles.portraitCol}>
              {speaker.canSpeak
                ? <button type="button" className={`${styles.portrait} ${styles.portraitButton}`}
                    onClick={() => props.onSpeak(person)} disabled={speaker.loading}
                    aria-label={speakLabel} title={speakLabel} aria-busy={speaker.loading || undefined}>
                    {face}
                    <span className={styles.voiceBadge} aria-hidden>
                      {speaker.loading
                        ? <LoaderCircle className="animate-spin" size={15} />
                        : <VoiceBadge size="sm" active={speaker.hasVoice} pulse={speaker.pulse} />}
                    </span>
                  </button>
                : <span className={styles.portrait}>{face}</span>}
              <span className={styles.relationTag}>{relation}</span>
            </span>

            {listed
              ? <button type="button" className={`${styles.copy} ${styles.copyButton}`}
                  onClick={() => props.onOpenPerson(person)}
                  aria-label={`${props.openLabel}: ${person.name}`}>
                  {identity}
                </button>
              : <span className={styles.copy}>{identity}</span>}

            {/* 오른쪽 세로 띠 — 데스크톱 인스펙터의 조작 띠와 같은 자리, 같은 차례다 */}
            <span className={styles.cardActions}>
              {listed ? <CelebDetailCardButton
                label={props.openLabel}
                onClick={() => props.onOpenPerson(person)}
                iconSize={16}
                className={styles.cardAction}
              /> : null}
              {listed ? <Link href={getCelebProfileUrl(person)}
                onClick={(event) => event.stopPropagation()}
                aria-label={props.goLabel} title={props.goLabel}
                className={styles.cardAction}>
                <ExternalLink size={16} aria-hidden />
              </Link> : null}
              {person.qid ? <a className={styles.cardAction} href={`https://www.wikidata.org/wiki/${person.qid}`}
                target="_blank" rel="noreferrer" aria-label={props.wikidataLabel} title={props.wikidataLabel}>
                <WikiMark size={16} />
              </a> : null}
            </span>
          </div>;
        })}
        </li>)}
      </ul>
      {/* 조작대는 쪽 바로 위에 붙여 둔다 — 사이가 뜨면 어느 목록을 넘기는 단추인지 흐려진다 */}
      <SwipeControls count={pages.length} className="mt-1 pb-1" />
  </div>;
}

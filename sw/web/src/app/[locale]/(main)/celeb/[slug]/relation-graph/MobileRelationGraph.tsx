"use client";

import { useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import FigurePersonRows from "@/components/features/celeb/FigurePersonRows";
import type { FocusOption } from "./RelationToolbar";
import type { PersonNode, RelationFocus } from "./types";
import { MOBILE_RELATION_PAGE_SIZE, mobileRelationPeople, mobileRelationTone } from "./mobileRelationLayout";
import styles from "./MobileRelationGraph.module.css";
import useViewportAnchor from "./useViewportAnchor";

interface Props {
  centerName: string;
  focusOptions: FocusOption[];
  selectedFocus: RelationFocus | null;
  selectedId: string | null;
  onFocusChange: (focus: RelationFocus) => void;
  onSelect: (person: PersonNode) => void;
  relationLabel: (person: PersonNode) => string;
}

function Face({ src }: { src: string | null }) {
  return <span className={styles.face}>
    {src ? <CelebAvatarImage src={src} alt="" width={64} height={64} draggable={false} />
      : <UserRound aria-hidden size={28} />}
  </span>;
}

export default function MobileRelationGraph(props: Props) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const ts = useTranslations("shared.ui.swipe");
  const [page, setPage] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const swipedAt = useRef<number | null>(null);
  const pagerTapAt = useRef<number | null>(null);
  const captureAnchor = useViewportAnchor();
  const focus = props.focusOptions.find(option => option.key === props.selectedFocus);
  const allPeople = mobileRelationPeople(props.focusOptions, focus?.key ?? null);
  const pageCount = Math.ceil(allPeople.length / MOBILE_RELATION_PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, pageCount - 1));
  const people = allPeople.slice(safePage * MOBILE_RELATION_PAGE_SIZE, (safePage + 1) * MOBILE_RELATION_PAGE_SIZE);
  const selected = people.find(person => person.id === props.selectedId) ?? people[0];
  const tone = focus ? mobileRelationTone(focus.key) : "var(--material-accent)";

  const select = (person: PersonNode) => {
    captureAnchor(boardRef.current);
    props.onSelect(person);
  };
  const changePage = (next: number) => {
    const bounded = Math.max(0, Math.min(pageCount - 1, next));
    if (bounded === safePage) return;
    captureAnchor(boardRef.current);
    setPage(bounded);
    const first = allPeople[bounded * MOBILE_RELATION_PAGE_SIZE];
    if (first) props.onSelect(first);
  };
  const pagerEvents = (next: number) => ({
    // 터치에서는 손을 뗄 때 처리하고, 뒤따르는 합성 click은 한 번 더 처리하지 않는다.
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType !== "touch" || !event.isPrimary) return;
      pagerTapAt.current = event.timeStamp;
      changePage(next);
    },
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      if (event.detail && pagerTapAt.current !== null && event.timeStamp - pagerTapAt.current < 500) return;
      changePage(next);
    },
  });

  return <div className={styles.root} style={{ "--relation-tone": tone } as CSSProperties}>
    <div className={styles.heading}>
      {focus ? <>
        <button type="button" className={styles.back} onClick={() => props.onFocusChange(focus.key)}>
          <ArrowLeft size={16} aria-hidden />{t("relMapOverview")}
        </button>
        <span className={styles.focusTitle}>{focus.label}<small>{focus.people.length}</small></span>
      </> : <span className={styles.focusTitle}>{t("relMapOverview")}<small>{allPeople.length}</small></span>}
    </div>

    {!focus && props.focusOptions.length > 1 && <div className={styles.branches}>
      {props.focusOptions.map(option => <button type="button" key={option.key}
        className={styles.branch} disabled={!option.people.length} data-relation-mobile-branch={option.key}
        style={{ "--relation-tone": mobileRelationTone(option.key) } as CSSProperties}
        aria-label={t("relMapOpenBranch", { label: option.label, count: option.people.length })}
        onClick={() => props.onFocusChange(option.key)}>
        <strong>{option.label}</strong><span>{option.people.length}</span>
      </button>)}
    </div>}

    <div ref={boardRef} className={styles.board} role="group" data-relation-mobile-board data-focus={focus?.key ?? "all"}
      aria-label={t("relAllTitle", { name: props.centerName })}
      onPointerDown={event => {
        swipedAt.current = null;
        if (event.isPrimary) pointer.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={event => {
        const start = pointer.current;
        pointer.current = null;
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          swipedAt.current = event.timeStamp;
          // 손을 뗀 이벤트가 끝난 다음 얼굴을 교체한다.
          window.requestAnimationFrame(() => changePage(safePage + (dx < 0 ? 1 : -1)));
        }
      }}
      onPointerCancel={() => { pointer.current = null; }}
      onClickCapture={event => {
        const swipeTime = swipedAt.current;
        swipedAt.current = null;
        if (!event.detail || swipeTime === null || event.timeStamp - swipeTime > 500) return;
        event.preventDefault();
        event.stopPropagation();
      }}>
      {people.map(person => <button type="button" key={person.id}
        className={styles.person}
        data-relation-mobile-person={person.id} aria-pressed={person.id === selected?.id}
        aria-label={t("relMapSelectPerson", { name: person.name })}
        onClick={() => select(person)}>
        <Face src={person.avatarUrl} />
        <strong>{person.name}</strong>
      </button>)}
    </div>

    {people.length > 0 && <>
      <div className={styles.pager}>
        <button type="button" disabled={safePage === 0} {...pagerEvents(safePage - 1)} aria-label={ts("previous")}>
          <ChevronLeft size={20} aria-hidden />
        </button>
        <span aria-live="polite">{safePage * MOBILE_RELATION_PAGE_SIZE + 1}–{safePage * MOBILE_RELATION_PAGE_SIZE + people.length}<small> / {allPeople.length}</small></span>
        <button type="button" disabled={safePage >= pageCount - 1} {...pagerEvents(safePage + 1)} aria-label={ts("next")}>
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>

      {selected && <article className={styles.detail} data-relation-mobile-detail={selected.id} aria-label={selected.name}>
        <FigurePersonRows locale={locale} gridClassName={styles.personRow}
          rows={[{ person: selected, subtitle: props.relationLabel(selected), description: selected.note }]} />
      </article>}
    </>}
  </div>;
}

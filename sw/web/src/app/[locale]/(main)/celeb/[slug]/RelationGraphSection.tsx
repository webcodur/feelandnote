"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Baby, ExternalLink, Handshake, Heart, LoaderCircle, Network, Swords, User, Users, X, type LucideIcon } from "lucide-react";
import type { CelebRelationItem } from "@/actions/user/getCelebBySlug";
import CelebDetailModal from "@/components/features/celeb/modals/CelebDetailModal";
import BlurDissolve from "@/components/ui/BlurDissolve";
import { useCountries } from "@/hooks/useCountries";
import { getCountryNameByLocale } from "@/lib/countries";

import { useCelebPreview } from "./useCelebPreview";

/**
 * 인물 관계망 — 도표 두 장.
 * 1) 가계도: 부모 부부선 → 중앙 강하선 → 형제 모선(본인 포함) → 본인 아래 자식.
 *    혈연은 세대 구조가 생명이라 허브(방사) 문법을 쓰지 않는다.
 * 2) 사회 관계: 본인 허브 — 위 스승·영향줌 / 아래 제자·영향받음 / 왼쪽 동료 / 오른쪽 맞수.
 * 연결선은 전부 실측 좌표 기반 직교선(모선에서 직각 꺾임)이다.
 */

const GROUP_COLOR: Record<CelebRelationItem["relGroup"], string> = {
  family: "#8a8f98",
  thought: "#6b8cae",
  career: "#8f9a6b",
  friendship: "#a2905e",
  rivalry: "#a65b5b",
};

/** 사진이 없는 명단 밖 인물의 자리 — 관계 종류별 색·상징으로 채운다(빈 원 금지). */
const TYPE_VISUAL: Record<string, { color: string; Icon: LucideIcon }> = {
  father: { color: "#7e8aa0", Icon: User },
  mother: { color: "#a07e8a", Icon: User },
  parent: { color: "#7e8aa0", Icon: User },
  spouse: { color: "#a07e8a", Icon: Heart },
  partner: { color: "#a07e8a", Icon: Heart },
  child: { color: "#7f9a7d", Icon: Baby },
  sibling: { color: "#9a916b", Icon: Users },
  rival: { color: "#a65b5b", Icon: Swords },
  friend: { color: "#a2905e", Icon: Handshake },
};
const typeVisual = (types: string[]) => TYPE_VISUAL[types[0]] ?? { color: "#8a8f98", Icon: User };

/** 가계도 세대 자리 */
type KinRank = "parents" | "siblings" | "spouses" | "children";
const KIN_RANK_OF: Record<string, KinRank> = {
  father: "parents", mother: "parents", parent: "parents",
  sibling: "siblings",
  relative: "siblings",
  spouse: "spouses", partner: "spouses",
  child: "children",
};

/** 사회 관계 허브의 띠 */
type SocialBand = "up" | "sideL" | "sideR" | "down";
const SOCIAL_BAND_OF: Record<string, SocialBand> = {
  teacher: "up", influence: "up",
  student: "down", influenced: "down",
  cofounder: "sideL",
  friend: "sideL",
  rival: "sideR",
};
const SOCIAL_GROUPS: CelebRelationItem["relGroup"][] = ["thought", "career", "friendship", "rivalry"];

/**
 * 본문은 관계의 구조만 파악할 수 있을 만큼만 보여준다.
 * 전체 명단은 별도 패널에 남겨 페이지 높이가 관계 수에 비례해 늘어나지 않게 한다.
 */
const FEATURED_FAMILY_CAP = 5;
// Three populated bands receive at least two nodes each, with one extra slot
// for the upward band where mentors and influences are shown.
const FEATURED_SOCIAL_CAP = 7;

/** 요소의 컨테이너 기준 좌표 */
interface Geo {
  avCx: number; avCy: number; avTop: number; avBottom: number;
  elTop: number; elBottom: number; elLeft: number; elRight: number;
}

/** 화면 폭에 접혀 여러 줄이 된 노드들을 실제 세로 위치로 다시 묶는다 */
const wrapRows = (nodes: Geo[]): Geo[][] => {
  const sorted = [...nodes].sort((a, b) => a.avCy - b.avCy || a.avCx - b.avCx);
  const rows: Geo[][] = [];
  for (const n of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last[0].avCy - n.avCy) < 24) last.push(n);
    else rows.push([n]);
  }
  return rows;
};

/** 한 줄의 모선(가로) + 각 노드로 내려꽂는 세로선. anchorX 는 줄기가 서는 자리 */
const rowBus = (row: Geo[], busY: number, anchorX: number) => {
  const xs = row.map((n) => n.avCx);
  return `M ${Math.min(...xs, anchorX)} ${busY} H ${Math.max(...xs, anchorX)}`
    + row.map((n) => ` M ${n.avCx} ${busY} V ${n.avTop - 2}`).join("");
};

interface PersonNode {
  id: string;
  /** null = 명단 밖 인물(위키데이터 등재) — 페이지가 없어 이동 불가 이름 노드 */
  slug: string | null;
  name: string;
  avatar_url: string | null;
  types: string[];
  group: CelebRelationItem["relGroup"];
  note: string | null;
  /** 관계 종류별 근거 원문 — 짧은 것(공동 창업 조직명)은 딱지에 직접 노출한다 */
  notesByType: Record<string, string>;
  profession: string | null;
  nationality: string | null;
  birth_date: string | null;
  death_date: string | null;
  qid: string | null;
}

/** 각 세대·방향에서 한 명씩 번갈아 뽑아 특정 관계만 화면을 독점하지 않게 한다. */
const pickBalancedIds = (buckets: PersonNode[][], cap: number) => {
  const picked = new Set<string>();
  for (let index = 0; picked.size < cap; index += 1) {
    let added = false;
    for (const bucket of buckets) {
      const person = bucket[index];
      if (!person || picked.has(person.id)) continue;
      picked.add(person.id);
      added = true;
      if (picked.size === cap) break;
    }
    if (!added) break;
  }
  return picked;
};

interface Connector { d: string; color: string; dashed: boolean; opacity: number }

interface Props {
  centerName: string;
  centerAvatarUrl: string | null;
  relations: CelebRelationItem[];
}

export default function RelationGraphSection({ centerName, centerAvatarUrl, relations }: Props) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const tp = useTranslations("profession");
  useCountries();
  const [filter, setFilter] = useState<"all" | CelebRelationItem["relGroup"]>("all");
  const [showAllRelations, setShowAllRelations] = useState(false);
  const [allRelationsFilter, setAllRelationsFilter] = useState<"all" | CelebRelationItem["relGroup"]>("all");
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [previewRelation, setPreviewRelation] = useState<PersonNode | null>(null);
  const {
    celeb: previewCeleb,
    loadingId,
    openCelebPreview,
    closeCelebPreview,
  } = useCelebPreview("relations");
  /** 클릭한 인물 — 상세 카드로 관계 사연·기본 정보·이동 단추를 보여준다 */
  const [selected, setSelected] = useState<PersonNode | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const selfRef = useRef<HTMLDivElement | null>(null);
  const hubRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());

  // 사람 단위로 묶는다. 겹관계(형제이자 공동 창업)는 라벨·설명을 병기한다.
  const people = useMemo(() => {
    const map = new Map<string, PersonNode>();
    for (const r of relations) {
      const name = locale === "en" && r.nickname_en ? r.nickname_en : r.nickname;
      const note = locale === "en" && r.note_en ? r.note_en : r.note;
      const cur = map.get(r.id);
      if (cur) {
        if (!cur.types.includes(r.relType)) cur.types.push(r.relType);
        if (note && cur.note !== note) cur.note = cur.note ? `${cur.note} / ${note}` : note;
        if (note && !cur.notesByType[r.relType]) cur.notesByType[r.relType] = note;
      } else {
        map.set(r.id, {
          id: r.id, slug: r.slug, name, avatar_url: r.avatar_url,
          types: [r.relType], group: r.relGroup, note,
          notesByType: note ? { [r.relType]: note } : {},
          profession: r.profession, nationality: r.nationality,
          birth_date: r.birth_date, death_date: r.death_date, qid: r.qid,
        });
      }
    }
    return [...map.values()];
  }, [relations, locale]);

  const view = useMemo(() => {
    // ── 가계도: 세대별 줄 ──
    const allKinRows: Record<KinRank, PersonNode[]> = { parents: [], siblings: [], spouses: [], children: [] };
    const social: PersonNode[] = [];
    for (const p of people) {
      const rank = KIN_RANK_OF[p.types[0]];
      if (p.group === "family" && rank) allKinRows[rank].push(p);
      else social.push(p);
    }

    const featuredKinIds = pickBalancedIds([
      allKinRows.parents,
      allKinRows.siblings,
      allKinRows.spouses,
      allKinRows.children,
    ], FEATURED_FAMILY_CAP);
    const kinRows: Record<KinRank, PersonNode[]> = {
      parents: allKinRows.parents.filter((person) => featuredKinIds.has(person.id)),
      siblings: allKinRows.siblings.filter((person) => featuredKinIds.has(person.id)),
      spouses: allKinRows.spouses.filter((person) => featuredKinIds.has(person.id)),
      children: allKinRows.children.filter((person) => featuredKinIds.has(person.id)),
    };

    // ── 사회 관계: 그룹 필터 + 띠 배치 ──
    // 맞수는 흡수되지 않는다 — 공동 창업이자 맞수인 인물(머스크-틸)은 맞수 쪽에 세운다.
    // 대립이 더 희소하고 특징적인 관계라 우선한다. 딱지는 병기된다.
    const socialResolved = social.map((p) =>
      p.types.includes("rival") ? { ...p, group: "rivalry" as const } : p);
    const socialCounts = new Map<string, number>();
    for (const p of socialResolved) socialCounts.set(p.group, (socialCounts.get(p.group) ?? 0) + 1);
    const filtered = filter === "all" ? socialResolved : socialResolved.filter((p) => p.group === filter);
    const allBands: Record<SocialBand, PersonNode[]> = { up: [], sideL: [], sideR: [], down: [] };
    for (const p of filtered) {
      const band = p.types.includes("rival") ? "sideR" : (SOCIAL_BAND_OF[p.types[0]] ?? "sideR");
      allBands[band].push(p);
    }
    const featuredSocialIds = pickBalancedIds([
      allBands.up,
      allBands.sideL,
      allBands.sideR,
      allBands.down,
    ], FEATURED_SOCIAL_CAP);
    const bands: Record<SocialBand, PersonNode[]> = {
      up: allBands.up.filter((person) => featuredSocialIds.has(person.id)),
      sideL: allBands.sideL.filter((person) => featuredSocialIds.has(person.id)),
      sideR: allBands.sideR.filter((person) => featuredSocialIds.has(person.id)),
      down: allBands.down.filter((person) => featuredSocialIds.has(person.id)),
    };
    const socialMeta = new Map<string, { group: CelebRelationItem["relGroup"]; band: SocialBand }>();
    for (const b of Object.keys(bands) as SocialBand[]) {
      for (const p of bands[b]) socialMeta.set(p.id, { group: p.group, band: b });
    }
    const kinIds: Record<KinRank, string[]> = {
      parents: kinRows.parents.map((p) => p.id),
      siblings: kinRows.siblings.map((p) => p.id),
      spouses: kinRows.spouses.map((p) => p.id),
      children: kinRows.children.map((p) => p.id),
    };
    const hasKin = Object.values(kinRows).some((r) => r.length > 0);
    const hasSocial = Object.values(bands).some((r) => r.length > 0) || social.length > 0;
    const allPeople = [
      ...allKinRows.parents,
      ...allKinRows.siblings,
      ...allKinRows.spouses,
      ...allKinRows.children,
      ...socialResolved,
    ];
    const groupCounts = new Map<CelebRelationItem["relGroup"], number>();
    for (const person of allPeople) {
      groupCounts.set(person.group, (groupCounts.get(person.group) ?? 0) + 1);
    }
    const visibleIds = new Set([
      ...Object.values(kinRows).flat().map((person) => person.id),
      ...Object.values(bands).flat().map((person) => person.id),
    ]);
    return {
      kinRows,
      kinIds,
      hasKin,
      bands,
      socialMeta,
      socialCounts,
      hasSocial,
      allPeople,
      groupCounts,
      familyCount: Object.values(allKinRows).flat().length,
      socialCount: socialResolved.length,
      hiddenCount: Math.max(0, allPeople.length - visibleIds.size),
    };
  }, [people, filter]);

  useEffect(() => {
    if (!showAllRelations) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowAllRelations(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [showAllRelations]);

  // 짧은 근거(공동 창업 조직명)는 딱지에 직접 쓴다 — "공동 창업"이 아니라 "페이팔 공동 창업".
  // 긴 근거(맞수의 사건 한 줄)는 딱지를 유지하고 호버 설명으로 남긴다.
  const noteLabelMax = locale === "en" ? 40 : 24; // 같은 내용이라도 영문이 길어 자릿수를 달리 잡는다
  const label = (p: PersonNode) =>
    p.types
      .map((ty) => {
        const n = p.notesByType[ty];
        return ty === "cofounder" && n && n.length <= noteLabelMax ? n : t(`relType_${ty}`);
      })
      .join(" · ");
  const relationLabel = (p: PersonNode) =>
    p.types.map((ty) => t(`relType_${ty}`)).join(" · ");

  const handlePersonSelect = (person: PersonNode) => {
    setSelected(person);
  };

  const handleOpenPersonCard = async () => {
    const person = selected;
    if (!person?.slug) return;

    const nextCeleb = await openCelebPreview(person.id);
    if (!nextCeleb) return;

    setPreviewRelation(person);
    setSelected(null);
  };

  const closePersonPreview = () => {
    const personId = previewRelation?.id;
    closeCelebPreview();
    setPreviewRelation(null);
    if (personId) requestAnimationFrame(() => nodeRefs.current.get(personId)?.focus());
  };

  const geoOf = useCallback((el: Element | null | undefined, box: DOMRect): Geo | null => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const av = (el.firstElementChild ?? el).getBoundingClientRect();
    return {
      avCx: av.left - box.left + av.width / 2,
      avCy: av.top - box.top + av.height / 2,
      avTop: av.top - box.top, avBottom: av.bottom - box.top,
      elTop: r.top - box.top, elBottom: r.bottom - box.top,
      elLeft: r.left - box.left, elRight: r.right - box.left,
    };
  }, []);

  const measure = useCallback(() => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    const next: Connector[] = [];
    const KIN = GROUP_COLOR.family;
    const push = (d: string, color: string, dashed = false, opacity = 0.72) =>
      next.push({ d, color, dashed, opacity });
    const g = (id: string) => geoOf(nodeRefs.current.get(id), box);

    // ── 가계도 ──
    const self = geoOf(selfRef.current, box);
    if (self) {
      const parents = view.kinIds.parents.map(g).filter(Boolean) as NonNullable<ReturnType<typeof geoOf>>[];
      const siblings = view.kinIds.siblings.map(g).filter(Boolean) as NonNullable<ReturnType<typeof geoOf>>[];
      const spouses = view.kinIds.spouses.map(g).filter(Boolean) as NonNullable<ReturnType<typeof geoOf>>[];
      const children = view.kinIds.children.map(g).filter(Boolean) as NonNullable<ReturnType<typeof geoOf>>[];

      // 부모 부부선 — 부모끼리 일자로 잇는다
      let trunkX = self.avCx;
      let trunkTopY: number | null = null;
      if (parents.length > 0) {
        const y = parents.reduce((s, p) => s + p.avCy, 0) / parents.length;
        const xs = parents.map((p) => p.avCx);
        if (parents.length > 1) push(`M ${Math.min(...xs)} ${y} H ${Math.max(...xs)}`, KIN);
        trunkX = (Math.min(...xs) + Math.max(...xs)) / 2;
        trunkTopY = parents.length > 1 ? y : parents[0].avBottom;
      }
      // 형제 모선 — 부모 중앙 강하선이 여기서 갈라지고, 본인도 이 줄에 매달린다.
      // 한 세대가 화면 폭을 넘겨 여러 줄로 접히면 줄마다 모선을 놓고 세로 줄기로 잇는다.
      // 본인은 반 층 낮게 서 있어 줄 묶기에서 빠지므로, 형제 줄을 묶은 뒤 마지막 줄에 붙인다.
      if (trunkTopY !== null || siblings.length > 0) {
        const sibRows = siblings.length > 0 ? wrapRows(siblings) : [];
        const rows = sibRows.length > 0
          ? [...sibRows.slice(0, -1), [...sibRows[sibRows.length - 1], self]]
          : [[self]];
        let prevBottom = parents.length
          ? Math.max(...parents.map((n) => n.elBottom))
          : Math.min(...rows[0].map((n) => n.elTop)) - 28;
        const busYs = rows.map((row) => {
          const y = (prevBottom + Math.min(...row.map((n) => n.elTop))) / 2;
          prevBottom = Math.max(...row.map((n) => n.elBottom));
          return y;
        });
        if (trunkTopY !== null) push(`M ${trunkX} ${trunkTopY} V ${busYs[busYs.length - 1]}`, KIN);
        else if (rows.length > 1) push(`M ${trunkX} ${busYs[0]} V ${busYs[busYs.length - 1]}`, KIN);
        rows.forEach((row, i) => push(rowBus(row, busYs[i], trunkX), KIN));
      }
      // 본인-배우자 부부선 — 여러 줄이면 본인 중심선으로 줄들을 잇는다
      if (spouses.length > 0) {
        const rows = wrapRows(spouses);
        const ys = rows.map((row) => row.reduce((s, n) => s + n.avCy, 0) / row.length);
        if (rows.length > 1) push(`M ${self.avCx} ${self.avCy} V ${ys[ys.length - 1]}`, KIN);
        rows.forEach((row, i) => {
          const xs = [self.avCx, ...row.map((s) => s.avCx)];
          push(`M ${Math.min(...xs)} ${i === 0 ? self.avCy : ys[i]} H ${Math.max(...xs)}`, KIN);
        });
      }
      // 자식 — 본인 밑에서 내려간다
      if (children.length > 0) {
        const rows = wrapRows(children);
        let prevBottom = self.elBottom;
        const busYs = rows.map((row) => {
          const y = (prevBottom + Math.min(...row.map((n) => n.elTop))) / 2;
          prevBottom = Math.max(...row.map((n) => n.elBottom));
          return y;
        });
        push(`M ${self.avCx} ${self.elBottom + 2} V ${busYs[busYs.length - 1]}`, KIN);
        rows.forEach((row, i) => push(rowBus(row, busYs[i], self.avCx), KIN));
      }
    }

    // ── 사회 관계 허브 ──
    const hub = geoOf(hubRef.current, box);
    if (hub) {
      const C = {
        cx: hub.avCx, cy: hub.avCy,
        top: hub.avTop, bottom: hub.avBottom,
        left: hub.avCx - (hub.avBottom - hub.avTop) / 2, right: hub.avCx + (hub.avBottom - hub.avTop) / 2,
      };
      const TRUNK = "#8a8f98";
      const clusters = new Map<SocialBand, Map<CelebRelationItem["relGroup"], NonNullable<ReturnType<typeof geoOf>>[]>>();
      for (const [id, meta] of view.socialMeta) {
        const geo = g(id);
        if (!geo) continue;
        const perGroup = clusters.get(meta.band) ?? new Map();
        const list = perGroup.get(meta.group) ?? [];
        list.push(geo);
        perGroup.set(meta.group, list);
        clusters.set(meta.band, perGroup);
      }
      const STEP = 7;
      const draw = (band: SocialBand) => {
        const perGroup = clusters.get(band);
        if (!perGroup?.size) return;
        const all = [...perGroup.values()].flat();
        const entries = [...perGroup.entries()];
        if (band === "up" || band === "down") {
          const base = band === "up"
            ? (Math.max(...all.map((n) => n.elBottom)) + C.top) / 2
            : (Math.min(...all.map((n) => n.elTop)) + C.bottom) / 2;
          push(`M ${C.cx} ${band === "up" ? C.top : C.bottom} V ${base}`, TRUNK, false, 0.56);
          entries.forEach(([grp, nodes], i) => {
            const busY = band === "up" ? base + i * STEP : base - i * STEP;
            const xs = nodes.map((n) => n.avCx);
            push(
              `M ${Math.min(...xs, C.cx)} ${busY} H ${Math.max(...xs, C.cx)}`
              + nodes.map((n) => ` M ${n.avCx} ${busY} V ${band === "up" ? n.elBottom + 2 : n.elTop - 2}`).join(""),
              GROUP_COLOR[grp], grp === "rivalry",
            );
          });
        } else {
          const base = band === "sideL"
            ? (Math.max(...all.map((n) => n.elRight)) + C.left) / 2
            : (Math.min(...all.map((n) => n.elLeft)) + C.right) / 2;
          push(`M ${band === "sideL" ? C.left : C.right} ${C.cy} H ${base}`, TRUNK, false, 0.56);
          entries.forEach(([grp, nodes], i) => {
            const busX = band === "sideL" ? base + i * STEP : base - i * STEP;
            const ys = nodes.map((n) => n.avCy);
            push(
              `M ${busX} ${Math.min(...ys, C.cy)} V ${Math.max(...ys, C.cy)}`
              + nodes.map((n) => ` M ${busX} ${n.avCy} H ${band === "sideL" ? n.elRight + 2 : n.elLeft - 2}`).join(""),
              GROUP_COLOR[grp], grp === "rivalry",
            );
          });
        }
      };
      (["up", "down", "sideL", "sideR"] as SocialBand[]).forEach(draw);
    }

    setConnectors(next);
  }, [view, geoOf]);

  useEffect(() => {
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => measure());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [measure]);

  const setNodeRef = (id: string) => (el: HTMLElement | null) => {
    if (el) nodeRefs.current.set(id, el);
    else nodeRefs.current.delete(id);
  };

  const avatarCircle = (p: PersonNode, sizeClass: string, iconSize: number) => {
    const relationColor = GROUP_COLOR[p.group];

    return (
      <div
        className={`${sizeClass} overflow-hidden rounded-full border-2 bg-bg-card p-[2px] shadow-lg group-hover:brightness-110`}
        style={{
          borderColor: relationColor,
          boxShadow: `0 0 0 1px ${relationColor}33, 0 8px 18px rgb(0 0 0 / 0.34)`,
        }}
      >
        <div className="h-full w-full overflow-hidden rounded-full border border-black/30 bg-bg-secondary">
          {loadingId === p.id ? (
            <div className="flex h-full w-full items-center justify-center text-accent">
              <LoaderCircle size={19} className="animate-spin" aria-hidden />
            </div>
          ) : p.avatar_url ? (
            <BlurDissolve className="h-full w-full">
              <Image src={p.avatar_url} alt={p.name} width={56} height={56} className="h-full w-full object-cover" unoptimized />
            </BlurDissolve>
          ) : p.slug ? (
            <div className="w-full h-full flex items-center justify-center text-sm font-serif">{p.name.charAt(0)}</div>
          ) : (
            (() => {
              const v = typeVisual(p.types);
              return (
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${v.color}2b` }}>
                  <v.Icon size={iconSize} strokeWidth={1.6} style={{ color: v.color }} aria-hidden />
                </div>
              );
            })()
          )}
        </div>
      </div>
    );
  };

  const nodeCard = (p: PersonNode, size: "md" | "sm" = "md") => {
    const hoverNote = p.note ? `${label(p)} — ${p.note}` : undefined;
    const inner = (
      <>
        {avatarCircle(
          p,
          size === "md" ? "w-12 h-12 md:w-16 md:h-16" : "w-11 h-11 md:w-14 md:h-14",
          size === "md" ? 22 : 19,
        )}
        <span className={`block text-xs font-serif leading-tight text-center break-keep ${p.slug ? "text-text-primary group-hover:text-accent font-bold" : "text-text-secondary"}`}>
          {p.name}
        </span>
      </>
    );
    // 클릭 = 이동이 아니라 상세 카드 열기. 명단 밖 인물도 카드는 열린다(이동 단추만 다르다).
    return (
      <button
        key={p.id}
        ref={setNodeRef(p.id)}
        type="button"
        onClick={() => handlePersonSelect(p)}
        disabled={loadingId === p.id}
        aria-busy={loadingId === p.id}
        className={`group relative z-10 flex w-[72px] cursor-pointer flex-col items-center gap-1 rounded-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:w-20 ${p.slug ? "" : "opacity-80"}`}
        aria-label={hoverNote ?? `${p.name} — ${label(p)}`}
        title={hoverNote}
      >
        {inner}
      </button>
    );
  };

  const compactPersonCard = (p: PersonNode) => (
    <button
      key={p.id}
      type="button"
      onClick={() => handlePersonSelect(p)}
      disabled={loadingId === p.id}
      aria-busy={loadingId === p.id}
      className="group flex min-w-0 items-center gap-2 rounded-lg border bg-white/[0.018] p-2 text-start hover:border-accent/45 hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={{ borderColor: `${GROUP_COLOR[p.group]}66` }}
    >
      {avatarCircle(p, "h-10 w-10 shrink-0", 16)}
      <span className="min-w-0 flex-1">
        {/* 사람 이름은 잘리면 누구인지 알 수 없다 — 긴 서양 이름은 석 줄까지 받는다 */}
        <span className="line-clamp-3 break-words font-serif text-[13px] font-bold leading-tight text-text-primary group-hover:text-accent">
          {p.name}
        </span>
        <span
          className="mt-1 block truncate text-xs font-semibold leading-tight"
          style={{ color: GROUP_COLOR[p.group] }}
        >
          {relationLabel(p)}
        </span>
      </span>
    </button>
  );

  const mobileBand = (heading: string, peopleInBand: PersonNode[]) => {
    if (peopleInBand.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.08em] text-text-secondary">
          {heading}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {peopleInBand.map(compactPersonCard)}
        </div>
      </div>
    );
  };

  /** 본인 노드 — 가계도와 사회 허브 양쪽에 선다 */
  const selfNode = (ref: React.RefObject<HTMLDivElement | null>) => (
    <div ref={ref} className="relative z-10 flex flex-col items-center gap-1 shrink-0" aria-label={centerName}>
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden ring-2 ring-accent/50 bg-bg-secondary shadow-lg">
        {centerAvatarUrl ? (
          <BlurDissolve className="h-full w-full">
            <Image src={centerAvatarUrl} alt={centerName} width={80} height={80} className="w-full h-full object-cover" unoptimized />
          </BlurDissolve>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl font-serif text-accent/40">{centerName.charAt(0)}</div>
        )}
      </div>
      <span className="text-[13px] font-serif font-bold text-text-primary">{centerName}</span>
    </div>
  );

  const subHeading = (text: string, count?: number) => (
    <div className="relative z-10 flex items-center gap-3">
      <p className="flex shrink-0 items-baseline gap-2 font-serif text-base font-bold tracking-[0.14em] text-text-primary">
        {text}
        {typeof count === "number" && (
          <span className="font-mono text-xs font-normal tracking-normal text-text-secondary">
            {count}
          </span>
        )}
      </p>
      <span
        aria-hidden
        className="h-px flex-1 bg-gradient-to-r from-accent-dim/45 to-transparent"
      />
    </div>
  );

  const socialFilters: ("all" | CelebRelationItem["relGroup"])[] = [
    "all",
    ...SOCIAL_GROUPS.filter((grp) => view.socialCounts.has(grp)),
  ];
  const selectedWikidataUrl = selected?.qid
    ? `https://www.wikidata.org/wiki/${selected.qid}`
    : selected?.slug
      ? `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(selected.name)}`
      : null;
  const allRelationGroups: CelebRelationItem["relGroup"][] = [
    "family",
    "thought",
    "career",
    "friendship",
    "rivalry",
  ];
  const allRelationFilters: ("all" | CelebRelationItem["relGroup"])[] = [
    "all",
    ...allRelationGroups.filter((group) => view.groupCounts.has(group)),
  ];
  const panelGroups = (allRelationsFilter === "all"
    ? allRelationGroups
    : [allRelationsFilter]
  ).map((group) => ({
    group,
    people: view.allPeople.filter((person) => person.group === group),
  })).filter(({ people: groupPeople }) => groupPeople.length > 0);

  const openAllRelations = () => {
    setAllRelationsFilter("all");
    setShowAllRelations(true);
  };

  const handlePanelPersonSelect = (person: PersonNode) => {
    setShowAllRelations(false);
    setSelected(person);
  };

  const socialFilterBar = () => view.socialCounts.size > 0 ? (
    <div className="flex flex-wrap justify-start gap-2">
      {socialFilters.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => setFilter(f)}
          aria-pressed={filter === f}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] hover:text-text-primary ${
            filter === f
              ? "font-semibold text-text-primary"
              : "text-text-secondary hover:bg-white/[0.035]"
          }`}
          style={{
            borderColor: `${f === "all" ? GROUP_COLOR.family : GROUP_COLOR[f]}${filter === f ? "b3" : "66"}`,
            backgroundColor: filter === f
              ? `${f === "all" ? GROUP_COLOR.family : GROUP_COLOR[f]}1f`
              : undefined,
          }}
        >
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: f === "all" ? GROUP_COLOR.family : GROUP_COLOR[f],
            }}
          />
          {t(`relFilter_${f}`)}
          <span className="ml-1 font-mono text-xs opacity-70">
            {f === "all"
              ? [...view.socialCounts.values()].reduce((a, b) => a + b, 0)
              : view.socialCounts.get(f)}
          </span>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="space-y-5">
      <div className="space-y-8 md:hidden">
        {view.hasKin && (
          <div className="space-y-4">
            {subHeading(t("relSubFamily"), view.familyCount)}
            <div className="grid grid-cols-2 gap-2">
              {([
                ...view.kinRows.parents,
                ...view.kinRows.siblings,
                ...view.kinRows.spouses,
                ...view.kinRows.children,
              ]).map(compactPersonCard)}
            </div>
          </div>
        )}

        {view.hasSocial && (
          <div className="space-y-4">
            {subHeading(t("relSubSocial"), view.socialCount)}
            {socialFilterBar()}
            <div className="space-y-5">
              {mobileBand(t("relBandUp", { name: centerName }), view.bands.up)}
              {mobileBand(t("relBandSideL"), view.bands.sideL)}
              {mobileBand(t("relBandSideR"), view.bands.sideR)}
              {mobileBand(t("relBandDown", { name: centerName }), view.bands.down)}
            </div>
          </div>
        )}
      </div>

      <div ref={containerRef} className="relative hidden min-w-0 select-none overflow-hidden md:block">
        <svg className="absolute inset-0 h-full w-full overflow-hidden pointer-events-none" aria-hidden>
          {connectors.map((c, i) => (
            <path
              key={i}
              d={c.d}
              fill="none"
              stroke={c.color}
              strokeWidth={1.25}
              strokeOpacity={c.opacity}
              strokeLinecap="round"
              strokeDasharray={c.dashed ? "5 3" : undefined}
            />
          ))}
        </svg>

        {/* ── 가계도 ── */}
        {view.hasKin && (
          <div className="space-y-0">
            {subHeading(t("relSubFamily"), view.familyCount)}
            {view.kinRows.parents.length > 0 && (
              <div className="relative flex flex-wrap justify-center gap-x-3 gap-y-3 mt-4">
                {view.kinRows.parents.map((p) => nodeCard(p))}
              </div>
            )}
            <div className="relative flex flex-wrap items-start justify-center gap-x-3 gap-y-3 mt-10">
              {view.kinRows.siblings.map((p) => nodeCard(p, "sm"))}
              {/* 본인은 형제 줄보다 반 층 낮게 — 모선에서 본인에게 오는 선만 길게 뻗어 시선이 떨어진다 */}
              <div className={`flex items-start gap-x-3 ${view.kinRows.parents.length > 0 || view.kinRows.siblings.length > 0 ? "mt-6 md:mt-8" : ""}`}>
                {selfNode(selfRef)}
                {/* 배우자 아바타 중심을 본인 아바타 중심 높이에 맞춘다 */}
                {view.kinRows.spouses.length > 0 && (
                  <div className="flex items-start gap-x-3 mt-3 md:mt-4">
                    {view.kinRows.spouses.map((p) => nodeCard(p, "sm"))}
                  </div>
                )}
              </div>
            </div>
            {view.kinRows.children.length > 0 && (
              <div className="relative flex flex-wrap justify-center gap-x-3 gap-y-3 mt-10">
                {view.kinRows.children.map((p) => nodeCard(p))}
              </div>
            )}
          </div>
        )}

        {view.hasKin && view.hasSocial && <hr className="border-accent-dim/20 my-8" />}

        {/* ── 사회 관계 (사상·동료·대립) ── */}
        {view.hasSocial && (
          <div className="space-y-4">
            {subHeading(t("relSubSocial"), view.socialCount)}
            {socialFilterBar()}
            {view.bands.up.length > 0 && (
              <div className="relative mb-10 space-y-3">
                <p className="text-center text-xs font-semibold tracking-[0.08em] text-text-secondary">
                                {t("relBandUp", { name: centerName })}
                              </p>
                <div className="flex flex-wrap justify-center gap-x-2 gap-y-3">
                  {view.bands.up.map((p) => nodeCard(p))}
                </div>
              </div>
            )}
            <div className="relative flex items-center justify-center gap-4 md:gap-8 my-4">
              {view.bands.sideL.length > 0 && (
                <div className="flex max-w-[38%] flex-1 flex-col items-end gap-3">
                  <p className="text-end text-xs font-semibold tracking-[0.08em] text-text-secondary">
                                    {t("relBandSideL")}
                                  </p>
                  <div className="flex flex-wrap justify-end gap-x-2 gap-y-3">
                    {view.bands.sideL.map((p) => nodeCard(p, "sm"))}
                  </div>
                </div>
              )}
              {selfNode(hubRef)}
              {view.bands.sideR.length > 0 && (
                <div className="flex max-w-[38%] flex-1 flex-col items-start gap-3">
                  <p className="text-xs font-semibold tracking-[0.08em] text-text-secondary">
                                    {t("relBandSideR")}
                                  </p>
                  <div className="flex flex-wrap justify-start gap-x-2 gap-y-3">
                    {view.bands.sideR.map((p) => nodeCard(p, "sm"))}
                  </div>
                </div>
              )}
            </div>
            {view.bands.down.length > 0 && (
              <div className="relative mt-10 space-y-3">
                <p className="text-center text-xs font-semibold tracking-[0.08em] text-text-secondary">
                                {t("relBandDown", { name: centerName })}
                              </p>
                <div className="flex flex-wrap justify-center gap-x-2 gap-y-3">
                  {view.bands.down.map((p) => nodeCard(p))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {view.hiddenCount > 0 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={openAllRelations}
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.025] px-4 py-2 text-[13px] font-medium text-text-secondary hover:border-accent/45 hover:bg-white/[0.055] hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Network size={15} aria-hidden />
            {t("relViewAll", { count: view.allPeople.length })}
            <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-text-secondary group-hover:text-accent">
              +{view.hiddenCount}
            </span>
          </button>
        </div>
      )}

      {/* 출처 고지 — 사실 관계는 위키데이터 기준 */}
      <p className="text-xs text-center leading-relaxed break-keep">
        {t("relationGraphNote")}
      </p>

      {showAllRelations && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t("relAllTitle", { name: centerName })}
          onClick={() => setShowAllRelations(false)}
        >
          <div
            className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-accent/25 bg-bg-secondary shadow-[0_24px_80px_rgba(0,0,0,0.9)] animate-fade-in sm:max-h-[82dvh] sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="font-serif text-lg font-bold text-text-primary">
                  {t("relAllTitle", { name: centerName })}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {t("relAllCount", { count: view.allPeople.length })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllRelations(false)}
                className="shrink-0 rounded-full p-2 text-text-secondary hover:bg-white/5 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={t("hideDetail")}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-white/10 px-4 py-3 sm:px-5">
              {allRelationFilters.map((group) => {
                const color = group === "all" ? GROUP_COLOR.family : GROUP_COLOR[group];
                const count = group === "all"
                  ? view.allPeople.length
                  : view.groupCounts.get(group) ?? 0;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setAllRelationsFilter(group)}
                    aria-pressed={allRelationsFilter === group}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs hover:text-text-primary ${
                      allRelationsFilter === group
                        ? "font-semibold text-text-primary"
                        : "text-text-secondary hover:bg-white/[0.035]"
                    }`}
                    style={{
                      borderColor: `${color}${allRelationsFilter === group ? "b3" : "55"}`,
                      backgroundColor: allRelationsFilter === group ? `${color}1f` : undefined,
                    }}
                  >
                    {t(`relFilter_${group}`)}
                    <span className="font-mono text-[11px] opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
              <div className="space-y-6">
                {panelGroups.map(({ group, people: groupPeople }) => (
                  <section key={group} className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: GROUP_COLOR[group] }}
                      />
                      <h4 className="font-serif text-sm font-bold text-text-primary">
                        {t(`relFilter_${group}`)}
                      </h4>
                      <span className="font-mono text-[11px] text-text-secondary">
                        {groupPeople.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {groupPeople.map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => handlePanelPersonSelect(person)}
                          disabled={loadingId === person.id}
                          aria-busy={loadingId === person.id}
                          className="group flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.018] px-3 py-2.5 text-start hover:border-accent/40 hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          {avatarCircle(person, "h-11 w-11 shrink-0", 17)}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-serif text-sm font-bold text-text-primary group-hover:text-accent">
                              {person.name}
                            </span>
                            <span
                              className="mt-0.5 block truncate text-xs font-semibold"
                              style={{ color: GROUP_COLOR[person.group] }}
                            >
                              {relationLabel(person)}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {previewCeleb && previewRelation && (
        <CelebDetailModal
          celeb={previewCeleb}
          isOpen
          context={{
            label: label(previewRelation),
            description: previewRelation.note,
            color: GROUP_COLOR[previewRelation.group],
          }}
          onClose={closePersonPreview}
        />
      )}

      {/* 인물 상세 카드 — 관계 사연·기본 정보·이동. 노드가 작아 안 보이는 것을 여기서 크게 보여준다 */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={selected.name}
          onClick={() => setSelected(null)}
        >
          {/* 바탕은 완전 불투명(#0a0a0a) — 뒤 화면이 비치면 글이 안 읽힌다 */}
          <div
            className="w-full max-w-md rounded-xl border border-accent/25 bg-bg-secondary shadow-[0_24px_80px_rgba(0,0,0,0.9)] p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-black/40 flex-shrink-0 ring-2 ring-accent/40 shadow-lg">
                  {selected.avatar_url ? (
                    <BlurDissolve className="h-full w-full">
                      <Image src={selected.avatar_url} alt={selected.name} width={80} height={80} className="object-cover w-full h-full" unoptimized />
                    </BlurDissolve>
                  ) : (
                    (() => {
                      const v = typeVisual(selected.types);
                      return (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${v.color}2b` }}>
                          <v.Icon size={32} strokeWidth={1.6} style={{ color: v.color }} aria-hidden />
                        </div>
                      );
                    })()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-serif font-bold text-lg md:text-xl text-text-primary break-keep leading-tight">{selected.name}</p>
                  <p className="text-sm font-semibold mt-1" style={{ color: GROUP_COLOR[selected.group] }}>
                    {selected.types.map((ty) => t(`relType_${ty}`)).join(" · ")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 -mt-1 -mr-1 rounded-full hover:text-accent hover:bg-white/5"
                aria-label={t("hideDetail")}
              >
                <X size={20} />
              </button>
            </div>

            {/* 관계 사연 — 맞수의 근거, 공동 창업 조직 */}
            {selected.note && (
              <p
                className="text-[15px] text-text-primary/90 leading-relaxed break-keep border-l-[3px] pl-4 py-1 rounded-r bg-white/[0.03]"
                style={{ borderColor: GROUP_COLOR[selected.group] }}
              >
                {selected.note}
              </p>
            )}

            {/* 기본 정보 */}
            <div className="flex items-center gap-x-3 gap-y-1 text-sm text-text-secondary flex-wrap">
              {selected.profession && <span className="text-accent font-medium">{tp(selected.profession)}</span>}
              {selected.nationality && <span>{getCountryNameByLocale(selected.nationality, locale)}</span>}
              {selected.birth_date && (
                <span className="font-mono">
                  {formatYear(selected.birth_date)}–{selected.death_date ? formatYear(selected.death_date) : ""}
                </span>
              )}
              {!selected.slug && <span className="">{t("relExternalNote")}</span>}
            </div>

            {/* 등록 인물은 본 카드와 원전 경로를 나란히 제공한다. */}
            {(selected.slug || selectedWikidataUrl) && (
              <div className={`grid gap-2 ${selected.slug && selectedWikidataUrl ? "grid-cols-2" : "grid-cols-1"}`}>
                {selected.slug && (
                  <button
                    type="button"
                    onClick={() => void handleOpenPersonCard()}
                    disabled={loadingId === selected.id}
                    aria-busy={loadingId === selected.id}
                    className="flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-accent/50 px-2 py-2.5 text-sm font-medium text-accent hover:bg-accent/15 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {loadingId === selected.id && (
                      <LoaderCircle size={15} className="animate-spin" aria-hidden />
                    )}
                    {t("relViewPersonCard")}
                  </button>
                )}
                {selectedWikidataUrl && (
                  <a
                    href={selectedWikidataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-white/15 px-2 py-2.5 text-sm font-medium text-text-secondary hover:border-accent/40 hover:text-accent"
                  >
                    {t("relViewWikidata")}
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const formatYear = (year: string) => {
  const num = parseInt(year);
  if (isNaN(num)) return year;
  return num < 0 ? `BC ${Math.abs(num)}` : `${num}`;
};

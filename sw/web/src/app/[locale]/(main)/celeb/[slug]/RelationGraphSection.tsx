"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Baby, Heart, User, Users, type LucideIcon } from "lucide-react";
import type { CelebRelationItem } from "@/actions/user/getCelebBySlug";

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
};
const typeVisual = (types: string[]) => TYPE_VISUAL[types[0]] ?? { color: "#8a8f98", Icon: User };

/** 가계도 세대 자리 */
type KinRank = "parents" | "siblings" | "spouses" | "children";
const KIN_RANK_OF: Record<string, KinRank> = {
  father: "parents", mother: "parents", parent: "parents",
  sibling: "siblings",
  spouse: "spouses", partner: "spouses",
  child: "children",
};

/** 사회 관계 허브의 띠 */
type SocialBand = "up" | "sideL" | "sideR" | "down";
const SOCIAL_BAND_OF: Record<string, SocialBand> = {
  teacher: "up", influence: "up",
  student: "down", influenced: "down",
  cofounder: "sideL",
  rival: "sideR",
};
const SOCIAL_GROUPS: CelebRelationItem["relGroup"][] = ["thought", "career", "rivalry"];

/** 한 줄(띠)에 한 번에 펼치는 최대 인원. 넘치면 접이식 목록으로 뺀다. */
const ROW_CAP = 8;

interface PersonNode {
  id: string;
  /** null = 명단 밖 인물(위키데이터 등재) — 페이지가 없어 이동 불가 이름 노드 */
  slug: string | null;
  name: string;
  avatar_url: string | null;
  types: string[];
  group: CelebRelationItem["relGroup"];
  note: string | null;
}

interface Connector { d: string; color: string; dashed: boolean; opacity: number }

interface Props {
  centerName: string;
  centerAvatarUrl: string | null;
  relations: CelebRelationItem[];
}

export default function RelationGraphSection({ centerName, centerAvatarUrl, relations }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const [filter, setFilter] = useState<"all" | CelebRelationItem["relGroup"]>("all");
  const [expanded, setExpanded] = useState(false);
  const [connectors, setConnectors] = useState<Connector[]>([]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const selfRef = useRef<HTMLDivElement | null>(null);
  const hubRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());

  // 사람 단위로 묶는다. 겹관계(형제이자 공동 창업)는 라벨·설명을 병기한다.
  const people = useMemo(() => {
    const map = new Map<string, PersonNode>();
    for (const r of relations) {
      const name = locale === "en" && r.nickname_en ? r.nickname_en : r.nickname;
      const cur = map.get(r.id);
      if (cur) {
        if (!cur.types.includes(r.relType)) cur.types.push(r.relType);
        if (r.note && cur.note !== r.note) cur.note = cur.note ? `${cur.note} / ${r.note}` : r.note;
      } else {
        map.set(r.id, {
          id: r.id, slug: r.slug, name, avatar_url: r.avatar_url,
          types: [r.relType], group: r.relGroup, note: r.note,
        });
      }
    }
    return [...map.values()];
  }, [relations, locale]);

  const view = useMemo(() => {
    // ── 가계도: 세대별 줄 ──
    const kinRows: Record<KinRank, PersonNode[]> = { parents: [], siblings: [], spouses: [], children: [] };
    const social: PersonNode[] = [];
    for (const p of people) {
      const rank = KIN_RANK_OF[p.types[0]];
      if (p.group === "family" && rank) kinRows[rank].push(p);
      else social.push(p);
    }
    const overflowAll: PersonNode[] = [];
    for (const r of Object.keys(kinRows) as KinRank[]) {
      overflowAll.push(...kinRows[r].slice(ROW_CAP));
      kinRows[r] = kinRows[r].slice(0, ROW_CAP);
    }

    // ── 사회 관계: 그룹 필터 + 띠 배치 ──
    const socialCounts = new Map<string, number>();
    for (const p of social) socialCounts.set(p.group, (socialCounts.get(p.group) ?? 0) + 1);
    const filtered = filter === "all" ? social : social.filter((p) => p.group === filter);
    const bands: Record<SocialBand, PersonNode[]> = { up: [], sideL: [], sideR: [], down: [] };
    for (const p of filtered) bands[SOCIAL_BAND_OF[p.types[0]] ?? "sideR"].push(p);
    const socialMeta = new Map<string, { group: CelebRelationItem["relGroup"]; band: SocialBand }>();
    for (const b of Object.keys(bands) as SocialBand[]) {
      overflowAll.push(...bands[b].slice(ROW_CAP));
      bands[b] = bands[b].slice(0, ROW_CAP);
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
    return { kinRows, kinIds, hasKin, bands, socialMeta, socialCounts, hasSocial, overflow: overflowAll };
  }, [people, filter]);

  const label = (p: PersonNode) => p.types.map((ty) => t(`relType_${ty}`)).join(" · ");

  /** 요소의 컨테이너 기준 좌표 */
  const geoOf = useCallback((el: Element | null | undefined, box: DOMRect) => {
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
    const push = (d: string, color: string, dashed = false, opacity = 0.5) => next.push({ d, color, dashed, opacity });
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
      // 형제 모선 — 부모 중앙 강하선이 여기서 갈라지고, 본인도 이 줄에 매달린다
      const rank1 = [...siblings, self];
      if (trunkTopY !== null || siblings.length > 0) {
        const rowTop = Math.min(...rank1.map((n) => n.elTop));
        const parentsBottom = parents.length ? Math.max(...parents.map((n) => n.elBottom)) : rowTop - 28;
        const busY = (parentsBottom + rowTop) / 2;
        const xs = rank1.map((n) => n.avCx);
        if (trunkTopY !== null) push(`M ${trunkX} ${trunkTopY} V ${busY}`, KIN);
        push(
          `M ${Math.min(...xs, trunkX)} ${busY} H ${Math.max(...xs, trunkX)}`
          + rank1.map((n) => ` M ${n.avCx} ${busY} V ${n.avTop - 2}`).join(""),
          KIN,
        );
      }
      // 본인-배우자 부부선
      if (spouses.length > 0) {
        const xs = [self.avCx, ...spouses.map((s) => s.avCx)];
        push(`M ${Math.min(...xs)} ${self.avCy} H ${Math.max(...xs)}`, KIN);
      }
      // 자식 — 본인 밑에서 내려간다
      if (children.length > 0) {
        const rowTop = Math.min(...children.map((n) => n.elTop));
        const busY = (self.elBottom + rowTop) / 2;
        const xs = children.map((n) => n.avCx);
        push(`M ${self.avCx} ${self.elBottom + 2} V ${busY}`, KIN);
        push(
          `M ${Math.min(...xs, self.avCx)} ${busY} H ${Math.max(...xs, self.avCx)}`
          + children.map((n) => ` M ${n.avCx} ${busY} V ${n.avTop - 2}`).join(""),
          KIN,
        );
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
          push(`M ${C.cx} ${band === "up" ? C.top : C.bottom} V ${base}`, TRUNK, false, 0.3);
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
          push(`M ${band === "sideL" ? C.left : C.right} ${C.cy} H ${base}`, TRUNK, false, 0.3);
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

  const avatarCircle = (p: PersonNode, sizeClass: string, iconSize: number) => (
    <div className={`${sizeClass} rounded-full overflow-hidden p-[2px] ${p.slug ? "bg-gradient-to-b from-accent/20 to-transparent group-hover:from-accent/60 group-hover:to-accent/30" : "bg-white/5"} transition-all duration-500 shadow-lg bg-bg-primary`}>
      <div className={`w-full h-full rounded-full overflow-hidden bg-bg-secondary border ${p.slug ? "border-white/10" : "border-dashed border-white/15"}`}>
        {p.avatar_url ? (
          <Image src={p.avatar_url} alt={p.name} width={56} height={56} className="object-cover w-full h-full transition-all duration-700 group-hover:scale-110" unoptimized />
        ) : p.slug ? (
          <div className="w-full h-full flex items-center justify-center text-sm font-serif text-text-tertiary">{p.name.charAt(0)}</div>
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

  const nodeCard = (p: PersonNode, size: "md" | "sm" = "md") => {
    const hoverNote = p.note ? `${label(p)} — ${p.note}` : undefined;
    const inner = (
      <>
        {avatarCircle(p, size === "md" ? "w-11 h-11 md:w-14 md:h-14" : "w-10 h-10 md:w-12 md:h-12", size === "md" ? 20 : 17)}
        <span className={`block text-[11px] font-serif leading-tight text-center break-keep ${p.slug ? "text-text-primary group-hover:text-accent transition-colors font-bold" : "text-text-secondary"}`}>
          {p.name}
        </span>
        <span className="block text-[10px] font-medium leading-tight text-center" style={{ color: GROUP_COLOR[p.group] }}>
          {label(p)}
        </span>
      </>
    );
    if (!p.slug) {
      return (
        <div key={p.id} ref={setNodeRef(p.id)} className="relative z-10 flex flex-col items-center gap-1 w-[72px] md:w-20 opacity-80" aria-label={`${p.name} — ${label(p)}`} title={hoverNote}>
          {inner}
        </div>
      );
    }
    return (
      <button
        key={p.id}
        ref={setNodeRef(p.id)}
        type="button"
        onClick={() => router.push(`/${locale}/celeb/${p.slug}`)}
        className="group relative z-10 flex flex-col items-center gap-1 w-[72px] md:w-20 cursor-pointer"
        aria-label={hoverNote ?? `${p.name} — ${label(p)}`}
        title={hoverNote}
      >
        {inner}
      </button>
    );
  };

  /** 본인 노드 — 가계도와 사회 허브 양쪽에 선다 */
  const selfNode = (ref: React.RefObject<HTMLDivElement | null>) => (
    <div ref={ref} className="relative z-10 flex flex-col items-center gap-1 shrink-0">
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden ring-2 ring-accent/50 bg-bg-secondary shadow-lg">
        {centerAvatarUrl ? (
          <Image src={centerAvatarUrl} alt={centerName} width={80} height={80} className="w-full h-full object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl font-serif text-accent/40">{centerName.charAt(0)}</div>
        )}
      </div>
      <span className="text-xs font-serif font-bold text-text-primary">{centerName}</span>
    </div>
  );

  const subHeading = (text: string) => (
    <p className="text-[11px] tracking-[0.2em] text-text-tertiary text-center">{text}</p>
  );

  const socialFilters: ("all" | CelebRelationItem["relGroup"])[] = [
    "all",
    ...SOCIAL_GROUPS.filter((grp) => view.socialCounts.has(grp)),
  ];

  return (
    <div className="space-y-5">
      <div ref={containerRef} className="relative select-none">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
          {connectors.map((c, i) => (
            <path key={i} d={c.d} fill="none" stroke={c.color} strokeWidth={1} strokeOpacity={c.opacity} strokeDasharray={c.dashed ? "4 3" : undefined} />
          ))}
        </svg>

        {/* ── 가계도 ── */}
        {view.hasKin && (
          <div className="space-y-0">
            {subHeading(t("relSubFamily"))}
            {view.kinRows.parents.length > 0 && (
              <div className="relative flex flex-wrap justify-center gap-x-3 gap-y-3 mt-4">
                {view.kinRows.parents.map((p) => nodeCard(p))}
              </div>
            )}
            <div className="relative flex flex-wrap items-end justify-center gap-x-3 gap-y-3 mt-10">
              {view.kinRows.siblings.map((p) => nodeCard(p, "sm"))}
              {selfNode(selfRef)}
              {view.kinRows.spouses.map((p) => nodeCard(p, "sm"))}
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
            {subHeading(t("relSubSocial"))}
            {view.socialCounts.size > 1 && (
              <div className="flex justify-center gap-2 flex-wrap">
                {socialFilters.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      filter === f
                        ? "border-accent/60 text-accent bg-accent/10"
                        : "border-white/10 text-text-tertiary hover:border-accent/30 hover:text-text-secondary"
                    }`}
                  >
                    {t(`relFilter_${f}`)}
                    <span className="ml-1 font-mono text-[10px] opacity-70">
                      {f === "all"
                        ? [...view.socialCounts.values()].reduce((a, b) => a + b, 0)
                        : view.socialCounts.get(f)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {view.bands.up.length > 0 && (
              <div className="relative flex flex-wrap justify-center gap-x-2 gap-y-3 mb-10">
                {view.bands.up.map((p) => nodeCard(p))}
              </div>
            )}
            <div className="relative flex items-center justify-center gap-4 md:gap-8 my-4">
              {view.bands.sideL.length > 0 && (
                <div className="flex flex-wrap justify-end gap-x-2 gap-y-3 flex-1 max-w-[38%]">
                  {view.bands.sideL.map((p) => nodeCard(p, "sm"))}
                </div>
              )}
              {selfNode(hubRef)}
              {view.bands.sideR.length > 0 && (
                <div className="flex flex-wrap justify-start gap-x-2 gap-y-3 flex-1 max-w-[38%]">
                  {view.bands.sideR.map((p) => nodeCard(p, "sm"))}
                </div>
              )}
            </div>
            {view.bands.down.length > 0 && (
              <div className="relative flex flex-wrap justify-center gap-x-2 gap-y-3 mt-10">
                {view.bands.down.map((p) => nodeCard(p))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 줄에 못 올린 인원 — 접이식 목록 */}
      {view.overflow.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs text-text-secondary hover:text-accent border border-white/10 hover:border-accent/30 rounded-full transition-colors"
            >
              {expanded ? t("hideDetail") : `+${view.overflow.length}`}
            </button>
          </div>
          {expanded && (
            <div className="flex gap-3 flex-wrap justify-center animate-fade-in">
              {view.overflow.map((p) => {
                const chip = (
                  <>
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-bg-secondary flex-shrink-0">
                      {p.avatar_url ? (
                        <Image src={p.avatar_url} alt={p.name} width={28} height={28} className="object-cover w-full h-full" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[11px] text-text-tertiary font-serif">{p.name.charAt(0)}</div>
                      )}
                    </div>
                    <span className={`text-xs font-serif ${p.slug ? "text-text-primary group-hover:text-accent transition-colors" : "text-text-secondary"}`}>{p.name}</span>
                    <span className="text-[10px]" style={{ color: GROUP_COLOR[p.group] }}>{label(p)}</span>
                  </>
                );
                if (!p.slug) {
                  return (
                    <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-dashed border-white/10 opacity-80">
                      {chip}
                    </div>
                  );
                }
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => router.push(`/${locale}/celeb/${p.slug}`)}
                    className="group flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-white/10 hover:border-accent/40 transition-colors"
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 출처 고지 — 사실 관계는 위키데이터 기준 */}
      <p className="text-[11px] text-text-tertiary text-center leading-relaxed break-keep">
        {t("relationGraphNote")}
      </p>
    </div>
  );
}

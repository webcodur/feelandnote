"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Baby, Heart, User, Users, type LucideIcon } from "lucide-react";
import type { CelebRelationItem } from "@/actions/user/getCelebBySlug";

/** 관계 그룹별 간선·라벨 색. 페이지의 저채도 고전 팔레트에 맞춘 뮤트 톤. */
const GROUP_COLOR: Record<CelebRelationItem["relGroup"], string> = {
  family: "#8a8f98",
  thought: "#6b8cae",
  career: "#8f9a6b",
  rivalry: "#a65b5b",
};

const GROUP_ORDER: CelebRelationItem["relGroup"][] = ["family", "thought", "career", "rivalry"];

/**
 * 배치가 관계를 말한다 — 세로축이 계보다.
 * 위 = 물려받은 곳(부모·스승·영향 준 인물), 아래 = 물려준 곳(자녀·제자·영향 받은 인물),
 * 옆 = 동렬(왼쪽 혈연, 오른쪽 동료·맞수). 가계도와 학맥 계보가 공유하는 문법.
 */
type Band = "up" | "sideL" | "sideR" | "down";
const BAND_OF: Record<string, Band> = {
  father: "up", mother: "up", parent: "up", teacher: "up", influence: "up",
  spouse: "sideL", partner: "sideL", sibling: "sideL", relative: "sideL",
  cofounder: "sideR", rival: "sideR",
  child: "down", student: "down", influenced: "down",
};

/** 띠별로 한 번에 펼치는 최대 인원. 넘치면 접이식 목록으로 뺀다. */
const BAND_CAP = 8;

/** 사진이 없는 인물의 자리 — 관계 종류별 색·상징으로 채운다(빈 원 금지). */
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

interface PersonNode {
  id: string;
  /** null = 명단 밖 인물(위키데이터 등재) — 페이지가 없어 이동 불가 이름 노드로 띄운다 */
  slug: string | null;
  name: string;
  avatar_url: string | null;
  /** 한 사람이 여러 관계를 겸할 수 있다(형제이자 공동 창업 등) — 라벨은 병기한다 */
  types: string[];
  group: CelebRelationItem["relGroup"];
  band: Band;
  /** 관계의 근거 한 줄 — 마우스를 올리면 보여준다(수동 수록 라이벌 보유) */
  note: string | null;
}

/** 직교 연결선 한 벌 — 모선(가로/세로 버스)과 가지·줄기를 SVG 경로로 담는다 */
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
  const centerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef(new Map<string, HTMLElement>());

  // 사람 단위로 묶는다. 관계가 여럿이면 정렬상 첫 관계가 띠와 그룹을 정한다.
  const people = useMemo(() => {
    const map = new Map<string, PersonNode>();
    for (const r of relations) {
      const name = locale === "en" && r.nickname_en ? r.nickname_en : r.nickname;
      const cur = map.get(r.id);
      if (cur) {
        if (!cur.types.includes(r.relType)) cur.types.push(r.relType);
        // 공동 창업이자 맞수 같은 겹관계는 설명도 병기한다
        if (r.note && cur.note !== r.note) cur.note = cur.note ? `${cur.note} / ${r.note}` : r.note;
      } else {
        map.set(r.id, {
          id: r.id, slug: r.slug, name, avatar_url: r.avatar_url,
          types: [r.relType], group: r.relGroup, band: BAND_OF[r.relType] ?? "sideR",
          note: r.note,
        });
      }
    }
    return [...map.values()].sort(
      (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
    );
  }, [relations, locale]);

  const { bands, overflow, groupCounts, metaById } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of people) counts.set(p.group, (counts.get(p.group) ?? 0) + 1);

    const visibleList = filter === "all" ? people : people.filter((p) => p.group === filter);
    const raw: Record<Band, PersonNode[]> = { up: [], sideL: [], sideR: [], down: [] };
    for (const p of visibleList) raw[p.band].push(p);

    const over: PersonNode[] = [];
    const capped = {} as Record<Band, PersonNode[]>;
    for (const b of Object.keys(raw) as Band[]) {
      capped[b] = raw[b].slice(0, BAND_CAP);
      over.push(...raw[b].slice(BAND_CAP));
    }
    const byId = new Map<string, { group: CelebRelationItem["relGroup"]; band: Band }>();
    for (const b of Object.keys(capped) as Band[]) for (const p of capped[b]) byId.set(p.id, { group: p.group, band: b });
    return { bands: capped, overflow: over, groupCounts: counts, metaById: byId };
  }, [people, filter]);

  const label = (p: PersonNode) => p.types.map((ty) => t(`relType_${ty}`)).join(" · ");

  /**
   * 연결선은 실제 화면 좌표를 재서 가계도식 직교선으로 긋는다.
   * 중심에서 줄기가 나가 그룹별 모선에서 직각으로 꺾이고, 모선에서 각 노드로 가지가 뻗는다.
   * 같은 띠에 그룹이 여럿이면 모선을 7px씩 층지게 쌓아 색이 섞이지 않게 한다.
   */
  const measure = useCallback(() => {
    const box = containerRef.current?.getBoundingClientRect();
    const cAv = centerRef.current?.firstElementChild?.getBoundingClientRect();
    if (!box || !cAv) return;
    const C = {
      cx: cAv.left - box.left + cAv.width / 2,
      cy: cAv.top - box.top + cAv.height / 2,
      top: cAv.top - box.top,
      bottom: cAv.bottom - box.top,
      left: cAv.left - box.left,
      right: cAv.right - box.left,
    };

    type Geo = { avCx: number; avCy: number; elTop: number; elBottom: number; elLeft: number; elRight: number };
    const clusters = new Map<Band, Map<CelebRelationItem["relGroup"], Geo[]>>();
    for (const [id, el] of nodeRefs.current) {
      const meta = metaById.get(id);
      if (!meta) continue;
      const elR = el.getBoundingClientRect();
      const avR = el.firstElementChild?.getBoundingClientRect() ?? elR;
      const g: Geo = {
        avCx: avR.left - box.left + avR.width / 2,
        avCy: avR.top - box.top + avR.height / 2,
        elTop: elR.top - box.top, elBottom: elR.bottom - box.top,
        elLeft: elR.left - box.left, elRight: elR.right - box.left,
      };
      const perGroup = clusters.get(meta.band) ?? new Map<CelebRelationItem["relGroup"], Geo[]>();
      const list = perGroup.get(meta.group) ?? [];
      list.push(g);
      perGroup.set(meta.group, list);
      clusters.set(meta.band, perGroup);
    }

    const TRUNK = "#8a8f98";
    const STEP = 7;
    const next: Connector[] = [];
    const sortGroups = (m: Map<CelebRelationItem["relGroup"], Geo[]>) =>
      [...m.entries()].sort((a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]));

    const up = clusters.get("up");
    if (up?.size) {
      const all = [...up.values()].flat();
      const base = (Math.max(...all.map((n) => n.elBottom)) + C.top) / 2;
      next.push({ d: `M ${C.cx} ${C.top} V ${base}`, color: TRUNK, dashed: false, opacity: 0.3 });
      sortGroups(up).forEach(([g, nodes], i) => {
        const busY = base + i * STEP;
        const xs = nodes.map((n) => n.avCx);
        const d = `M ${Math.min(...xs, C.cx)} ${busY} H ${Math.max(...xs, C.cx)}`
          + nodes.map((n) => ` M ${n.avCx} ${busY} V ${n.elBottom + 2}`).join("");
        next.push({ d, color: GROUP_COLOR[g], dashed: g === "rivalry", opacity: 0.5 });
      });
    }

    const down = clusters.get("down");
    if (down?.size) {
      const all = [...down.values()].flat();
      const base = (Math.min(...all.map((n) => n.elTop)) + C.bottom) / 2;
      next.push({ d: `M ${C.cx} ${C.bottom} V ${base}`, color: TRUNK, dashed: false, opacity: 0.3 });
      sortGroups(down).forEach(([g, nodes], i) => {
        const busY = base - i * STEP;
        const xs = nodes.map((n) => n.avCx);
        const d = `M ${Math.min(...xs, C.cx)} ${busY} H ${Math.max(...xs, C.cx)}`
          + nodes.map((n) => ` M ${n.avCx} ${busY} V ${n.elTop - 2}`).join("");
        next.push({ d, color: GROUP_COLOR[g], dashed: g === "rivalry", opacity: 0.5 });
      });
    }

    const sideL = clusters.get("sideL");
    if (sideL?.size) {
      const all = [...sideL.values()].flat();
      const base = (Math.max(...all.map((n) => n.elRight)) + C.left) / 2;
      next.push({ d: `M ${C.left} ${C.cy} H ${base}`, color: TRUNK, dashed: false, opacity: 0.3 });
      sortGroups(sideL).forEach(([g, nodes], i) => {
        const busX = base + i * STEP;
        const ys = nodes.map((n) => n.avCy);
        const d = `M ${busX} ${Math.min(...ys, C.cy)} V ${Math.max(...ys, C.cy)}`
          + nodes.map((n) => ` M ${busX} ${n.avCy} H ${n.elRight + 2}`).join("");
        next.push({ d, color: GROUP_COLOR[g], dashed: g === "rivalry", opacity: 0.5 });
      });
    }

    const sideR = clusters.get("sideR");
    if (sideR?.size) {
      const all = [...sideR.values()].flat();
      const base = (Math.min(...all.map((n) => n.elLeft)) + C.right) / 2;
      next.push({ d: `M ${C.right} ${C.cy} H ${base}`, color: TRUNK, dashed: false, opacity: 0.3 });
      sortGroups(sideR).forEach(([g, nodes], i) => {
        const busX = base - i * STEP;
        const ys = nodes.map((n) => n.avCy);
        const d = `M ${busX} ${Math.min(...ys, C.cy)} V ${Math.max(...ys, C.cy)}`
          + nodes.map((n) => ` M ${busX} ${n.avCy} H ${n.elLeft - 2}`).join("");
        next.push({ d, color: GROUP_COLOR[g], dashed: g === "rivalry", opacity: 0.5 });
      });
    }

    setConnectors(next);
  }, [metaById]);

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

  const filters: ("all" | CelebRelationItem["relGroup"])[] = [
    "all",
    ...GROUP_ORDER.filter((g) => groupCounts.has(g)),
  ];

  const nodeCard = (p: PersonNode, size: "md" | "sm" = "md") => {
    const avatarSize = size === "md" ? "w-11 h-11 md:w-14 md:h-14" : "w-10 h-10 md:w-12 md:h-12";
    const inner = (
      <>
        <div className={`${avatarSize} rounded-full overflow-hidden p-[2px] ${p.slug ? "bg-gradient-to-b from-accent/20 to-transparent group-hover:from-accent/60 group-hover:to-accent/30" : "bg-white/5"} transition-all duration-500 shadow-lg bg-bg-primary`}>
          <div className={`w-full h-full rounded-full overflow-hidden bg-bg-secondary border ${p.slug ? "border-white/10" : "border-dashed border-white/15"}`}>
            {p.avatar_url ? (
              <Image
                src={p.avatar_url}
                alt={p.name}
                width={56}
                height={56}
                className="object-cover w-full h-full transition-all duration-700 group-hover:scale-110"
                unoptimized
              />
            ) : p.slug ? (
              <div className="w-full h-full flex items-center justify-center text-sm font-serif text-text-tertiary">
                {p.name.charAt(0)}
              </div>
            ) : (
              (() => {
                const v = typeVisual(p.types);
                return (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${v.color}2b` }}>
                    <v.Icon size={size === "md" ? 20 : 17} strokeWidth={1.6} style={{ color: v.color }} aria-hidden />
                  </div>
                );
              })()
            )}
          </div>
        </div>
        <span className={`block text-[11px] font-serif leading-tight text-center break-keep ${p.slug ? "text-text-primary group-hover:text-accent transition-colors font-bold" : "text-text-secondary"}`}>
          {p.name}
        </span>
        <span className="block text-[10px] font-medium leading-tight text-center" style={{ color: GROUP_COLOR[p.group] }}>
          {label(p)}
        </span>
      </>
    );
    const hoverNote = p.note ? `${label(p)} — ${p.note}` : undefined;
    // 명단 밖 인물은 페이지가 없다 — 이름 노드로만 세운다
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

  return (
    <div className="space-y-4">
      {/* 필터: 존재하는 그룹만 */}
      {groupCounts.size > 1 && (
        <div className="flex justify-center gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setFilter(f); setExpanded(false); }}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filter === f
                  ? "border-accent/60 text-accent bg-accent/10"
                  : "border-white/10 text-text-tertiary hover:border-accent/30 hover:text-text-secondary"
              }`}
            >
              {t(`relFilter_${f}`)}
              <span className="ml-1 font-mono text-[10px] opacity-70">
                {f === "all" ? people.length : groupCounts.get(f)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 계보 배치: 위 = 물려받은 곳, 아래 = 물려준 곳, 옆 = 동렬 */}
      <div ref={containerRef} key={filter} className="relative animate-fade-in select-none py-2">
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
          {connectors.map((c, i) => (
            <path
              key={i}
              d={c.d}
              fill="none"
              stroke={c.color}
              strokeWidth={1}
              strokeOpacity={c.opacity}
              strokeDasharray={c.dashed ? "4 3" : undefined}
            />
          ))}
        </svg>

        {bands.up.length > 0 && (
          <div className="relative flex flex-wrap justify-center gap-x-2 gap-y-3 mb-10 md:mb-12">
            {bands.up.map((p) => nodeCard(p))}
          </div>
        )}

        <div className="relative flex items-center justify-center gap-4 md:gap-8 my-4">
          {bands.sideL.length > 0 && (
            <div className="flex flex-wrap justify-end gap-x-2 gap-y-3 flex-1 max-w-[38%]">
              {bands.sideL.map((p) => nodeCard(p, "sm"))}
            </div>
          )}

          {/* 중심: 본인 */}
          <div ref={centerRef} className="relative z-10 flex flex-col items-center gap-1 shrink-0">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden ring-2 ring-accent/50 bg-bg-secondary shadow-lg">
              {centerAvatarUrl ? (
                <Image
                  src={centerAvatarUrl}
                  alt={centerName}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-serif text-accent/40">
                  {centerName.charAt(0)}
                </div>
              )}
            </div>
            <span className="text-xs font-serif font-bold text-text-primary">{centerName}</span>
          </div>

          {bands.sideR.length > 0 && (
            <div className="flex flex-wrap justify-start gap-x-2 gap-y-3 flex-1 max-w-[38%]">
              {bands.sideR.map((p) => nodeCard(p, "sm"))}
            </div>
          )}
        </div>

        {bands.down.length > 0 && (
          <div className="relative flex flex-wrap justify-center gap-x-2 gap-y-3 mt-10 md:mt-12">
            {bands.down.map((p) => nodeCard(p))}
          </div>
        )}
      </div>

      {/* 띠에 못 올린 인원 — 접이식 목록 */}
      {overflow.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs text-text-secondary hover:text-accent border border-white/10 hover:border-accent/30 rounded-full transition-colors"
            >
              {expanded ? t("hideDetail") : `+${overflow.length}`}
            </button>
          </div>
          {expanded && (
            <div className="flex gap-3 flex-wrap justify-center animate-fade-in">
              {overflow.map((p) => {
                const chip = (
                  <>
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-bg-secondary flex-shrink-0">
                      {p.avatar_url ? (
                        <Image src={p.avatar_url} alt={p.name} width={28} height={28} className="object-cover w-full h-full" unoptimized />
                      ) : p.slug ? (
                        <div className="w-full h-full flex items-center justify-center text-[11px] text-text-tertiary font-serif">
                          {p.name.charAt(0)}
                        </div>
                      ) : (
                        (() => {
                          const v = typeVisual(p.types);
                          return (
                            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${v.color}2b` }}>
                              <v.Icon size={13} strokeWidth={1.6} style={{ color: v.color }} aria-hidden />
                            </div>
                          );
                        })()
                      )}
                    </div>
                    <span className={`text-xs font-serif ${p.slug ? "text-text-primary group-hover:text-accent transition-colors" : "text-text-secondary"}`}>
                      {p.name}
                    </span>
                    <span className="text-[10px]" style={{ color: GROUP_COLOR[p.group] }}>
                      {label(p)}
                    </span>
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

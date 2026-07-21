"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { CelebRelationItem } from "@/actions/user/getCelebBySlug";

/** 관계 그룹별 간선·라벨 색. 페이지의 저채도 고전 팔레트에 맞춘 뮤트 톤. */
const GROUP_COLOR: Record<CelebRelationItem["relGroup"], string> = {
  family: "#8a8f98",
  thought: "#6b8cae",
  career: "#8f9a6b",
  rivalry: "#a65b5b",
};

const GROUP_ORDER: CelebRelationItem["relGroup"][] = ["family", "thought", "career", "rivalry"];

/** 원판에 한 번에 올리는 최대 인원. 넘치면 아래 목록으로 편다. */
const GRAPH_CAP = 12;

interface PersonNode {
  id: string;
  slug: string;
  name: string;
  avatar_url: string | null;
  /** 한 사람이 여러 관계를 겸할 수 있다(배우자이자 조력자 등) — 라벨은 병기한다 */
  types: string[];
  group: CelebRelationItem["relGroup"];
}

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

  // 사람 단위로 묶는다. 대표 그룹은 관계 정렬 순서상 첫 관계의 그룹.
  const people = useMemo(() => {
    const map = new Map<string, PersonNode>();
    for (const r of relations) {
      const name = locale === "en" && r.nickname_en ? r.nickname_en : r.nickname;
      const cur = map.get(r.id);
      if (cur) {
        if (!cur.types.includes(r.relType)) cur.types.push(r.relType);
      } else {
        map.set(r.id, {
          id: r.id, slug: r.slug, name,
          avatar_url: r.avatar_url, types: [r.relType], group: r.relGroup,
        });
      }
    }
    return [...map.values()].sort(
      (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
    );
  }, [relations, locale]);

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of people) counts.set(p.group, (counts.get(p.group) ?? 0) + 1);
    return counts;
  }, [people]);

  const visible = filter === "all" ? people : people.filter((p) => p.group === filter);
  const onGraph = visible.slice(0, GRAPH_CAP);
  const overflow = visible.slice(GRAPH_CAP);

  const label = (p: PersonNode) => p.types.map((ty) => t(`relType_${ty}`)).join(" · ");

  // 원판 배치: 위(-90°)에서 시계 방향 균등 분할. 그룹 정렬이 돼 있어 색이 부채꼴로 모인다.
  const pos = (i: number, n: number) => {
    const rad = ((-90 + (360 / n) * i) * Math.PI) / 180;
    return { x: 50 + 40 * Math.cos(rad), y: 50 + 37 * Math.sin(rad) };
  };

  const filters: ("all" | CelebRelationItem["relGroup"])[] = [
    "all",
    ...GROUP_ORDER.filter((g) => groupCounts.has(g)),
  ];

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

      {/* 관계 원판 — 필터가 바뀌면 새로 그려지며 은은히 등장한다 */}
      <div key={filter} className="relative h-[340px] md:h-[420px] animate-fade-in select-none">
        {/* 간선 층 */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {onGraph.map((p, i) => {
            const { x, y } = pos(i, onGraph.length);
            return (
              <line
                key={p.id}
                x1={50} y1={50} x2={x} y2={y}
                stroke={GROUP_COLOR[p.group]}
                strokeWidth={1}
                strokeOpacity={0.45}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {/* 중심: 본인 */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
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

        {/* 관계 인물 */}
        {onGraph.map((p, i) => {
          const { x, y } = pos(i, onGraph.length);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => router.push(`/${locale}/celeb/${p.slug}`)}
              className="group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 w-20 cursor-pointer z-10"
              style={{ left: `${x}%`, top: `${y}%` }}
              aria-label={`${p.name} — ${label(p)}`}
            >
              <div className="w-11 h-11 md:w-14 md:h-14 rounded-full overflow-hidden p-[2px] bg-gradient-to-b from-accent/20 to-transparent group-hover:from-accent/60 group-hover:to-accent/30 transition-all duration-500 shadow-lg">
                <div className="w-full h-full rounded-full overflow-hidden bg-bg-secondary border border-white/10">
                  {p.avatar_url ? (
                    <Image
                      src={p.avatar_url}
                      alt={p.name}
                      width={56}
                      height={56}
                      className="object-cover w-full h-full transition-all duration-700 group-hover:scale-110"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-text-tertiary font-serif">
                      {p.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>
              <span className="block text-[11px] text-text-primary group-hover:text-accent transition-colors font-serif font-bold leading-tight text-center break-keep">
                {p.name}
              </span>
              <span
                className="block text-[10px] font-medium leading-tight text-center"
                style={{ color: GROUP_COLOR[p.group] }}
              >
                {label(p)}
              </span>
            </button>
          );
        })}
      </div>

      {/* 원판에 못 올린 인원 — 접이식 목록 */}
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
              {overflow.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => router.push(`/${locale}/celeb/${p.slug}`)}
                  className="group flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-white/10 hover:border-accent/40 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-bg-secondary flex-shrink-0">
                    {p.avatar_url ? (
                      <Image src={p.avatar_url} alt={p.name} width={28} height={28} className="object-cover w-full h-full" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[11px] text-text-tertiary font-serif">
                        {p.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-text-primary group-hover:text-accent transition-colors font-serif">
                    {p.name}
                  </span>
                  <span className="text-[10px]" style={{ color: GROUP_COLOR[p.group] }}>
                    {label(p)}
                  </span>
                </button>
              ))}
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

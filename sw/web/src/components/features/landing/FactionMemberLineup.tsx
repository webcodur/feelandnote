"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import Image from "next/image";
import { Users } from "lucide-react";

/*
  세력도감 출연진 판.
  단체샷을 쓰지 않는 세력도감(V1)에서 묶음·세력을 고르면 좌측 큰 화면에 구성원을 한 무대에 세운다.
  아바타는 전부 배경을 지운 상반신이라 네모 칸에 가두지 않고 어깨를 맞대어 세운다(선수단 라인업).
  - 인원별로 정한 대칭 대형에 세운다(3명 삼각형, 4명 마름모, 6명 피라미드…). 뒷줄은 바로 앞줄보다
    한 명 적거나 많아 늘 앞사람 둘 사이 틈에 선다 — 줄을 반 칸 비켜 세우면 평행사변형으로 기울어 어색했다.
  - 가장 영향력 높은 사람이 맨 위 가운데(꼭짓점)에 서고, 나머지는 윗줄부터 가운데에서 바깥으로 선다.
    그래서 모두 같은 크기로 세운다 — 뒷줄을 줄이면 꼭짓점의 대표가 앞사람보다 작아진다.
  - 인원이 많으면 핵심만 무대에 세우고 나머지는 발치에 작은 얼굴로 둔다. 핵심은 영향력 점수로 가른다.
  - 아바타 아래쪽의 수평 잘림은 아래로 흐려 감추고, 뒤에서 세력 색 역광을 쳐 검은 머리가 묻히지 않게 한다.
  한 장의 가짜 단체 사진을 흉내 내지 않는다 — 조명·원근을 맞춘 척하지 않고 그래픽 라인업으로 둔다.
*/
export interface FactionLineupMember {
  id: string;
  name: string;
  role: string | null;
  avatarUrl: string | null;
  /** 영향력 총점 — 핵심과 나머지를 가르고 대형의 자리를 정한다. 없으면 목록 순서가 대신한다 */
  influence: number | null;
  itemIndex: number;
}

interface FactionMemberLineupProps {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  color: string;
  logoUrl?: string | null;
  members: FactionLineupMember[];
  countLabel: string;
  onSelect: (itemIndex: number) => void;
}

/** 이 인원까지는 모두 핵심이다 — 작은 무리는 가를 이유가 없다 */
const ALL_CORE_LIMIT = 6;
/** 무대에 세우는 핵심 인원의 하한·상한. 상한은 아래 대형표가 받는 최대 인원과 같다 */
const CORE_MIN = 5;
const CORE_MAX = 9;
/** 무리 최고점의 이 비율 이상이면 핵심이다 — 점수가 뚝 떨어지는 자리에서 끊는다 */
const CORE_SCORE_RATIO = 0.6;

/** 인원별 대형 — 앞줄부터 줄마다 선 인원. 이웃한 줄은 한 명 차이라 뒷사람이 앞사람 틈에 선다 */
const FORMATIONS: Record<number, number[]> = {
  1: [1],
  2: [2],
  3: [2, 1],
  4: [1, 2, 1],
  5: [3, 2],
  6: [3, 2, 1],
  7: [4, 3],
  8: [3, 4, 1],
  9: [4, 3, 2],
};
/**
 * 같은 줄 이웃의 중심 간격(인물 폭 대비) — 1이면 어깨가 맞닿는다. 0.8로 겹치면 투구·관모가 큰
 * 아바타(삼국지·춘추전국)가 옆·뒷사람 얼굴을 가려 넉넉히 펼쳤다
 */
const STEP = 1;
/** 한 줄 뒤로 갈 때 올라서는 높이(인물 폭 대비) — 뒷사람 턱이 앞사람 머리 윗선 위로 온다 */
const LIFT = 0.6;
/** 인물 한 명의 최대 폭(무대 폭 대비 %) — 한두 명일 때 화면을 다 먹지 않게 */
const FIGURE_MAX_WIDTH = 58;
/** 무대 높이 중 인물이 차지하는 최대 비율 — 맨 윗사람 머리가 제목에 닿지 않게 남기는 여백 */
const STAGE_FILL = 0.94;

/** 영향력 순위 — 점수가 같거나 없으면 목록 앞사람이 먼저다 */
function byInfluence(members: FactionLineupMember[]) {
  return members
    .map((member, index) => ({ member, index }))
    .sort((a, b) => (b.member.influence ?? -1) - (a.member.influence ?? -1) || a.index - b.index)
    .map(({ member }) => member);
}

/** 핵심(무대)과 나머지(발치 작은 얼굴)로 가른다. 두 쪽 모두 목록 순서를 지킨다 */
function splitCore(members: FactionLineupMember[]) {
  if (members.length <= ALL_CORE_LIMIT) return { core: members, minor: [] as FactionLineupMember[] };
  const top = Math.max(0, ...members.map((member) => member.influence ?? 0));
  const strong = top > 0 ? members.filter((member) => (member.influence ?? 0) >= top * CORE_SCORE_RATIO).length : 0;
  const count = Math.min(CORE_MAX, Math.max(CORE_MIN, strong));
  const coreIds = new Set(byInfluence(members).slice(0, count).map((member) => member.id));
  return {
    core: members.filter((member) => coreIds.has(member.id)),
    minor: members.filter((member) => !coreIds.has(member.id)),
  };
}

interface Placement {
  member: FactionLineupMember;
  x: number;
  row: number;
}

/** 대형 좌표에 사람을 앉힌다 — 윗줄부터, 한 줄 안에서는 가운데에서 바깥으로 영향력 순서대로 */
function placeInFormation(core: FactionLineupMember[]): Placement[] {
  const rows = FORMATIONS[core.length] ?? [];
  const slots = rows.flatMap((size, row) =>
    Array.from({ length: size }, (_, index) => ({ x: (index - (size - 1) / 2) * STEP, row })),
  );
  slots.sort((a, b) => b.row - a.row || Math.abs(a.x) - Math.abs(b.x) || a.x - b.x);
  return byInfluence(core).map((member, index) => ({ member, ...slots[index] }));
}

export default function FactionMemberLineup({
  eyebrow,
  title,
  subtitle,
  color,
  logoUrl,
  members,
  countLabel,
  onSelect,
}: FactionMemberLineupProps) {
  const { core, minor } = splitCore(members);
  const placements = placeInFormation(core);
  const rowCount = FORMATIONS[core.length]?.length ?? 0;
  const singleRow = rowCount <= 1;

  // 대형이 차지하는 가로·세로(인물 폭 단위). 무대에는 이 비율 그대로 담는다
  const minX = Math.min(0, ...placements.map((p) => p.x)) - 0.5;
  const maxX = Math.max(0, ...placements.map((p) => p.x)) + 0.5;
  const spanWidth = maxX - minX;
  const spanHeight = Math.max(0, rowCount - 1) * LIFT + 1;

  const select = (itemIndex: number) => (event: ReactMouseEvent) => {
    event.stopPropagation();
    onSelect(itemIndex);
  };

  return (
    <div
      className="absolute inset-0 animate-fade-in"
      style={{
        background: `radial-gradient(ellipse 70% 55% at 50% 62%, ${color}59, transparent 70%), radial-gradient(circle at 20% 12%, ${color}26, #0a0a0a 68%)`,
      }}
    >
      {logoUrl && (
        <div className="absolute right-5 top-5 z-10 aspect-square w-16 overflow-hidden rounded-xl ring-1 ring-white/15 md:right-7 md:top-7 md:w-20">
          <Image src={logoUrl} alt="" fill unoptimized sizes="80px" className="object-cover" />
        </div>
      )}

      <div className="absolute inset-0 flex flex-col p-5 md:p-7">
        <span
          className="inline-flex items-center gap-1.5 font-serif text-[11px] font-bold tracking-[0.15em] md:text-xs"
          style={{ color }}
        >
          <Users size={13} aria-hidden />
          {eyebrow}
        </span>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 pe-20">
          <h3 className="font-serif text-2xl font-black leading-tight text-white md:text-3xl">{title}</h3>
          <span className="text-xs font-bold tabular-nums text-white/70 md:text-sm">{countLabel}</span>
        </div>
        {subtitle && (
          <p className="mt-1 break-keep text-sm font-semibold tracking-wide text-white/90">{subtitle}</p>
        )}

        {/*
          무대 — 대형은 바닥에 발을 붙이고 선다. 좁은 화면에서는 무대 높이(cqh)가 모자라 사람이 제목 위로
          넘치므로(삼국지 위, 모바일에서 확인) 대형의 가로 폭을 높이에 맞춰 줄인다.
        */}
        <div className="relative mt-3 flex min-h-0 flex-1 flex-col justify-end [container-type:size]">
          {placements.length > 0 && (
            <div
              className="relative mx-auto w-full"
              style={{
                aspectRatio: `${spanWidth} / ${spanHeight}`,
                maxWidth: `min(${spanWidth * FIGURE_MAX_WIDTH}%, ${(spanWidth / spanHeight) * 100 * STAGE_FILL}cqh)`,
              }}
            >
              {placements.map(({ member, x, row }) => (
                <div
                  key={member.id}
                  className="absolute hover:!z-50 focus-within:!z-50"
                  style={{
                    left: `${((x - 0.5 - minX) / spanWidth) * 100}%`,
                    bottom: `${((row * LIFT) / spanHeight) * 100}%`,
                    width: `${100 / spanWidth}%`,
                    // 앞줄이 위, 한 줄 안에서는 가운데가 위
                    zIndex: (rowCount - row) * 10 + 9 - Math.round(Math.abs(x) / STEP),
                  }}
                >
                  <Figure member={member} showName={singleRow} onSelect={select} />
                </div>
              ))}
            </div>
          )}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(10,10,10,0.85))" }}
          />
        </div>

        {/* 여러 줄로 서면 발치에 이름을 달 자리가 없다 — 목록 순서대로 한 줄에 모은다 */}
        {!singleRow && (
          <p className="relative z-10 mt-2 flex flex-wrap justify-center gap-x-1.5 gap-y-0.5 text-[12px] font-bold leading-5 md:text-[13px]">
            {core.map((member, index) => (
              <span key={member.id} className="inline-flex items-center gap-1.5">
                {index > 0 && <span aria-hidden className="text-white/30">·</span>}
                <button
                  type="button"
                  title={member.role ?? undefined}
                  onClick={select(member.itemIndex)}
                  className="cursor-pointer rounded text-white/85 hover:text-accent focus-visible:text-accent focus-visible:outline-none"
                >
                  {member.name}
                </button>
              </span>
            ))}
          </p>
        )}

        {/* 나머지 — 무대에 세우지 않고 작은 얼굴로 발치에 둔다 */}
        {minor.length > 0 && (
          <ul className="relative z-10 mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1.5 border-t border-white/10 pt-2">
            {minor.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  title={member.role ? `${member.name} · ${member.role}` : member.name}
                  onClick={select(member.itemIndex)}
                  className="group/minor flex cursor-pointer items-center gap-1.5 rounded-full text-[11px] font-semibold leading-5 text-white/65 hover:text-accent focus-visible:text-accent focus-visible:outline-none md:text-[12px]"
                >
                  <span className="relative block size-6 shrink-0 overflow-hidden rounded-full bg-white/[0.08] ring-1 ring-white/15 group-hover/minor:ring-accent">
                    {member.avatarUrl ? (
                      <Image src={member.avatarUrl} alt="" fill unoptimized sizes="24px" className="object-cover object-top" />
                    ) : (
                      <span aria-hidden className="grid h-full place-items-center text-[10px] font-black text-white/50">{member.name[0]}</span>
                    )}
                  </span>
                  {member.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Figure({
  member,
  showName,
  onSelect,
}: {
  member: FactionLineupMember;
  showName: boolean;
  onSelect: (itemIndex: number) => (event: ReactMouseEvent) => void;
}) {
  const label = member.role ? `${member.name} · ${member.role}` : member.name;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onSelect(member.itemIndex)}
      className="group/figure relative block w-full cursor-pointer rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span className="relative block aspect-square w-full">
        {member.avatarUrl ? (
          <Image
            src={member.avatarUrl}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 768px) 45vw, 300px"
            className="object-contain object-bottom group-hover/figure:brightness-110"
            style={{
              maskImage: "linear-gradient(to bottom, #000 70%, transparent 98%)",
              WebkitMaskImage: "linear-gradient(to bottom, #000 70%, transparent 98%)",
              filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.55))",
            }}
          />
        ) : (
          <span aria-hidden className="absolute inset-x-[18%] bottom-[12%] top-[10%] grid place-items-center rounded-full bg-white/[0.07] font-serif text-3xl font-black text-white/35">
            {member.name[0]}
          </span>
        )}
      </span>
      {showName && (
        <span
          className="absolute inset-x-[10%] bottom-1 z-10 truncate text-center text-[12px] font-bold leading-5 text-white/90 group-hover/figure:text-accent md:text-[13px]"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.95)" }}
        >
          {member.name}
        </span>
      )}
    </button>
  );
}

/*
  파일명: /components/features/celeb/FigureLinkGrid.tsx
  기능: 인물 상세로 가는 링크 격자 — 표시 전용
  책임: 조회는 호출처(홈·탐색 허브)가 하고, 여기는 받은 인물을 얼굴·이름·직함 카드로 세운다.
        인물 상세가 인물 사전 한 곳에서만 링크되던 구조를 여러 화면에서 잇는 공용 부품이다.
        얼굴은 CelebAvatarImage가 96px 작은 판을 받아 24장이 실려도 가볍다.
*/

import { getLocale } from "next-intl/server";
import { User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";
import CenteredSectionHeading from "@/components/ui/CenteredSectionHeading";
import { PendingBlock } from "@/components/ui/pending";

/** 격자 열 구성. 기다림 표시가 같은 모양으로 서도록 카드와 한 규칙을 쓴다.
 *  항목이 적을 때 4열을 쓰면 마지막 줄이 반만 차서 빈자리가 눈에 띈다 — 6개 이하는 3열로 접는다.
 *  tailwind가 클래스를 정적으로 훑으므로 두 줄 모두 문자열 그대로 적는다(보간 금지) */
const GRID_COLS_WIDE = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
const GRID_COLS_NARROW = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

/** 항목 수에 맞는 열 구성 */
function colsFor(count: number) {
  return count <= 6 ? GRID_COLS_NARROW : GRID_COLS_WIDE;
}

/** 카드 한 장의 최소 높이. 아래 고스트 높이와 같은 값이어야 기다림이 실물과 겹친다.
 *  tailwind가 클래스를 정적으로 훑으므로 두 값을 문자열 그대로 적는다(보간 금지) */
const CARD_MIN_H = "min-h-[68px]";
const GHOST_H = "h-[68px]";

/** 이 격자가 채워지기를 기다리는 자리. 열 수·칸 높이가 실제 카드와 같다 */
export function FigureLinkGridPending({
  count = 12,
  label,
}: {
  count?: number;
  label?: string;
}) {
  return (
    <PendingBlock
      variant="grid"
      cols={colsFor(count)}
      aspect={GHOST_H}
      count={count}
      label={label}
    />
  );
}

export interface FigureLinkItem {
  id: string;
  slug: string | null;
  nickname: string;
  nickname_en: string | null;
  avatar_url: string | null;
  title: string | null;
  title_en?: string | null;
  /** 지정하면 직함 대신 이 문구를 부제로 쓴다 — 관계 라벨 같은 호출처 고유 정보 */
  subtitle?: string;
  /** 감상 항목 수. 넘기면 카드 오른쪽에 세운다 */
  content_count?: number;
}

interface FigureLinkGridProps {
  /** 제목·설명을 생략하면 격자만 그린다 — 구획 헤더를 밖(HubSection)이 쥐는 화면용 */
  headingId?: string;
  title?: string;
  description?: string;
  figures: FigureLinkItem[];
  /** 격자 아래 "전체 보기" 줄 — 명부 전체로 가는 길을 남길 때 쓴다 */
  moreHref?: string;
  moreLabel?: string;
}

/** 얼굴 칸 너비(px). 48을 넘기면 800px 원본을 받는다 — celeb-avatar-small.ts의 상한이다 */
const AVATAR_W = "48px";

export default async function FigureLinkGrid({
  headingId,
  title,
  description,
  figures,
  moreHref,
  moreLabel,
}: FigureLinkGridProps) {
  // slug가 없으면 상세로 갈 주소가 없다
  const linkable = figures.filter((figure) => figure.slug);
  if (linkable.length === 0) return null;

  const locale = await getLocale();
  const isEn = locale === "en";

  return (
    <section aria-labelledby={headingId}>
      {title && (
        <CenteredSectionHeading
          id={headingId}
          title={title}
          description={description}
          className="mb-4 md:mb-7"
        />
      )}

      <ul className={`grid gap-3 ${colsFor(linkable.length)}`}>
        {linkable.map((figure) => {
          const name = (isEn && figure.nickname_en) || figure.nickname;
          const sub =
            figure.subtitle ?? ((isEn && figure.title_en) || figure.title);

          return (
            <li key={figure.id}>
              <Link
                href={`/celeb/${figure.slug}`}
                className={`group flex h-full ${CARD_MIN_H} items-stretch overflow-hidden rounded-xl border border-white/5 bg-card hover:border-accent/30 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
              >
                {/* 얼굴이 카드 왼쪽 끝에서 위아래를 채운다 — 여백 없이 붙여 인물이 먼저 읽히게 한다 */}
                <span className="relative w-12 shrink-0 overflow-hidden bg-main">
                  {figure.avatar_url ? (
                    <CelebAvatarImage
                      src={figure.avatar_url}
                      alt={name}
                      sizes={AVATAR_W}
                      className="object-cover"
                    />
                  ) : (
                    <User
                      aria-hidden
                      size={20}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-text-secondary"
                    />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col justify-center px-3.5 py-2.5">
                  <span className="truncate font-semibold text-text-primary group-hover:text-accent">
                    {name}
                  </span>
                  {sub && (
                    <span className="truncate text-xs text-text-secondary">
                      {sub}
                    </span>
                  )}
                </span>
                {/* 감상 항목 수 — 인물을 고르는 기준이라 이름 반대편에 세운다 */}
                {figure.content_count !== undefined && figure.content_count > 0 && (
                  <span className="flex shrink-0 items-center pr-3.5 text-xs font-medium tabular-nums text-text-secondary group-hover:text-accent">
                    {figure.content_count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {moreHref && moreLabel && (
        <div className="mt-4 flex justify-end">
          <Link
            href={moreHref}
            className="text-xs text-accent/80 hover:text-accent"
          >
            {moreLabel} →
          </Link>
        </div>
      )}
    </section>
  );
}

/*
  파일명: /components/features/user/explore/monologue/SilentMonologueList.tsx
  기능: 글로 읽는 가상독백 명부
  책임: 낭독 음원이 아직 없는 인물의 독백을 작게 모아 보인다. 규모가 크므로
        앞의 일부만 펴 두고, 나머지는 이름 검색이나 「모두 보기」로 찾게 한다.
        카드를 누르면 인물 상세 「읽어보기」로 이동한다.
*/ // ------------------------------

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCelebProfileUrl } from "@/lib/url";
import type { VirtualMonologueCeleb } from "@/actions/celebs/getVirtualMonologueCelebs";
import CelebAvatarImage from "@/components/ui/CelebAvatarImage";

const COLLAPSED_COUNT = 24;
const SEARCH_RESULT_CAP = 96;

interface SilentMonologueListProps {
  /** 명부 카드가 쓰는 필드만 넘긴다 — excerpt는 낭독 카드 전용이라 싣지 않는다 */
  celebs: Pick<VirtualMonologueCeleb, "id" | "slug" | "nickname" | "avatar_url" | "quote">[];
}

export default function SilentMonologueList({ celebs }: SilentMonologueListProps) {
  const t = useTranslations("explore.monologue");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const q = query.trim().toLowerCase();
  const matched = useMemo(
    () => (q ? celebs.filter((celeb) => celeb.nickname.toLowerCase().includes(q)) : celebs),
    [celebs, q],
  );
  const cap = q ? SEARCH_RESULT_CAP : COLLAPSED_COUNT;
  const visible = expanded ? matched : matched.slice(0, cap);
  const hiddenCount = matched.length - visible.length;

  return (
    <div>
      <div className="relative mx-auto mb-4 max-w-xs md:mb-5">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="w-full rounded-full border border-white/10 bg-white/[0.03] py-2 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-tertiary hover:border-white/20 focus:border-accent/50 focus:outline-none"
        />
      </div>

      {matched.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">{t("noResults")}</p>
      ) : (
        <>
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((celeb) => (
              <li key={celeb.id}>
                <Link
                  href={`${getCelebProfileUrl(celeb)}#reading`}
                  prefetch={false}
                  className="group flex h-full items-start gap-3 rounded-xl border border-white/10 px-3 py-3 hover:border-accent/50 hover:bg-white/5 active:bg-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/30">
                    {celeb.avatar_url ? <CelebAvatarImage src={celeb.avatar_url} alt="" boxPx={40} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text-primary group-hover:text-accent">
                      {celeb.nickname}
                    </span>
                    <span className="mt-1 block break-keep text-xs leading-relaxed text-text-secondary line-clamp-2">
                      {celeb.quote}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 ? (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-text-secondary hover:border-accent/50 hover:text-accent active:bg-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t("showAll", { count: hiddenCount })}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, MessageSquare } from "lucide-react";
import { getFreePosts } from "@/actions/board/free";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/types/locale";
import { formatBoardRelativeTime } from "@/lib/board/boardDate";

/** 글이 없을 때는 게시판 입구 한 줄만 남긴다. 언어·차단 처리는 게시판 조회를 그대로 따른다. */
export default async function HomeFreeBoardSection({ sectionId }: { sectionId: string }) {
  const locale = resolveLocale(await getLocale());
  const t = await getTranslations("home.hub");
  const { posts } = await getFreePosts({ locale, limit: 3 });
  const linkClass = "outline-none focus-visible:ring-2 focus-visible:ring-accent hover:text-accent";

  return (
    <section id={sectionId} aria-labelledby="home-free-board-title" className="mx-auto max-w-3xl scroll-mt-20 border-t border-line pt-5">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 id="home-free-board-title" className="text-base font-semibold text-text-primary">
          <Link href="/agora/board/free" className={`inline-flex items-center gap-2 rounded-control ${linkClass}`}>
            <MessageSquare size={17} className="text-accent" aria-hidden />{t("freeBoard")}
          </Link>
        </h2>
        <Link href="/agora/board/free" className={`inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-sm text-text-secondary ${linkClass}`}>
          {t("viewAll")}<ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      {posts.length > 0 && (
        <ul className="mt-2 divide-y divide-line">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/agora/board/free/${post.id}`} className={`flex min-h-12 items-center gap-3 rounded-control px-2 py-3 text-sm text-text-primary hover:bg-white/5 ${linkClass}`}>
                <span className="min-w-0 flex-1 truncate">{post.title}</span>
                {(post.comment_count ?? 0) > 0 && <span className="inline-flex shrink-0 items-center gap-1 text-xs text-accent"><MessageSquare size={12} aria-hidden />{post.comment_count}</span>}
                <time dateTime={post.created_at} className="shrink-0 text-xs text-text-secondary">{formatBoardRelativeTime(post.created_at, locale)}</time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

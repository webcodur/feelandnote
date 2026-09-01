import { ArrowUpRight, BookOpenText, ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { FictionSourceContent } from "@/actions/fiction/getFictionSources";
import { AFFILIATE_PLATFORMS } from "@/constants/affiliatePlatforms";
import { cn } from "@/lib/utils";

interface FictionSourceActionsProps {
  source: FictionSourceContent;
  className: string;
  compact?: boolean;
}

export default function FictionSourceActions({
  source,
  className,
  compact = false,
}: FictionSourceActionsProps) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const purchaseUrl = locale === "en" ? source.amazonUrl : source.coupangUrl;
  const purchaseLabel = locale === "en" ? "sourceWorkBuyAmazon" : "sourceWorkBuyCoupang";
  const isCoupang = locale === "ko";
  const contentHref = `${locale === "en" ? "/en" : ""}/content/${source.id}?category=${source.category}`;

  return (
    <div className={`relative z-10 ${className}`}>
      <a
        href={contentHref}
        className="effect-bevel group inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap border border-accent bg-accent px-3 py-2.5 text-sm font-black text-bg-secondary hover:bg-accent-hover active:bg-accent-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card"
      >
        <BookOpenText size={17} aria-hidden />
        {t("sourceWorkOpen")}
        {!compact && (
          <ArrowUpRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        )}
      </a>

      {purchaseUrl && (
        <div className="w-full">
          <a
            href={purchaseUrl}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className={cn(
              "effect-engraved group inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap border px-3 py-2.5 text-sm font-black focus-visible:outline-none focus-visible:ring-2",
              isCoupang
                ? "border-red-400/35 bg-red-400/[0.08] text-red-100 hover:border-red-300/60 hover:bg-red-400/[0.16] hover:text-red-50 active:bg-red-400/[0.22] focus-visible:ring-red-300/70"
                : "border-stone-light bg-bg-secondary text-text-primary hover:border-accent hover:bg-accent/10 hover:text-accent active:bg-accent/15 focus-visible:ring-accent",
            )}
          >
            <ShoppingBag size={17} aria-hidden />
            {t(purchaseLabel)}
            {!compact && (
              <ArrowUpRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            )}
          </a>
          {locale === "ko" && (
            <p className="mt-2 text-sm leading-relaxed text-text-tertiary">
              {AFFILIATE_PLATFORMS.coupang.notice}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import { ExternalLink } from "lucide-react";
import InnerBox from "@/components/ui/InnerBox";
import type { NewsSearchResult } from "@feelandnote/content-search/naver-news";

// 날짜 포맷 (RFC 2822 → YYYY.MM.DD)
function formatDate(pubDate: string): string {
  try {
    const date = new Date(pubDate);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}.${m}.${d}`;
  } catch {
    return "";
  }
}

interface NewsItemProps {
  item: NewsSearchResult;
}

export default function NewsItem({ item }: NewsItemProps) {
  return (
    <a
      href={item.originalLink}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <InnerBox variant="dark" className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-accent">
              {item.title}
            </h4>
            <p className="mt-1.5 text-xs text-text-secondary line-clamp-2">
              {item.description}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary/60">
              {item.source && <span>{item.source}</span>}
              {item.source && item.pubDate && <span>·</span>}
              {item.pubDate && <span>{formatDate(item.pubDate)}</span>}
            </div>
          </div>
          <ExternalLink className="size-3.5 shrink-0 text-text-secondary/40 group-hover:text-accent mt-0.5" />
        </div>
      </InnerBox>
    </a>
  );
}

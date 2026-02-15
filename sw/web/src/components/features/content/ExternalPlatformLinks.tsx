import { ExternalLink } from "lucide-react";
import { generatePlatformLinks } from "@/lib/utils/platformLinks";
import type { ContentType } from "@/types/database";

interface ExternalPlatformLinksProps {
  contentId: string;
  contentType: ContentType;
  title: string;
}

export default function ExternalPlatformLinks({
  contentId,
  contentType,
  title,
}: ExternalPlatformLinksProps) {
  const links = generatePlatformLinks(contentId, contentType, title);
  if (!links.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-text-secondary">외부 링크</h3>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.key}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 rounded-full border border-white/10 text-text-secondary hover:text-accent hover:border-accent/30 transition-colors"
          >
            {link.name}
            <ExternalLink size={10} />
          </a>
        ))}
      </div>
    </div>
  );
}

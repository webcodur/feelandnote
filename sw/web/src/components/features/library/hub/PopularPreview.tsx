/*
  파일명: /components/features/library/hub/PopularPreview.tsx
  기능: 서가 허브의 「인기 작품」 미리보기
  책임: 인물들이 가장 많이 감상한 작품 몇 개를 그대로 보여준다.
        구획 이름이 작품이므로 시대·직군 목록이 아니라 작품이 나와야 한다.
*/ // ------------------------------

import { ContentCard } from "@/components/ui/cards";
import ContentGrid from "@/components/ui/ContentGrid";
import { getCategoryByDbType } from "@/constants/categories";
import type { LibraryContent } from "@/actions/library/types";
import type { ContentType } from "@/types/database";

export default function PopularPreview({ contents }: { contents: LibraryContent[] }) {
  if (contents.length === 0) return null;

  // 안내 문구는 구획 부제가 이미 말한다 — 여기서 되풀이하지 않는다
  return (
    <ContentGrid>
        {contents.map((content) => (
          <ContentCard
            key={content.id}
            contentId={content.id}
            contentType={content.type as ContentType}
            title={content.title}
            creator={content.creator}
            thumbnail={content.thumbnail_url}
            celebCount={content.celeb_count}
            userCount={content.user_count}
            rating={content.avg_rating ?? undefined}
            href={`/content/${content.id}?category=${getCategoryByDbType(content.type)?.id || "book"}`}
            titleKo={content.title_ko}
            titleEn={content.title_en}
            creatorEn={content.creator_en}
            thumbnailEn={content.thumbnail_en}
            hasEnEdition={content.has_en_edition}
          />
      ))}
    </ContentGrid>
  );
}

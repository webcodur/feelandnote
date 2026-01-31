/*
  파일명: /components/features/home/ScripturesPreview.tsx
  기능: 메인페이지 서고 프리뷰
  책임: 인물들의 선택 콘텐츠를 간략하게 보여준다.
*/ // ------------------------------

import { getChosenScriptures } from "@/actions/scriptures";
import ScriptureCard from "@/components/features/scriptures/ScriptureCard";

export default async function ScripturesPreview() {
  const { contents } = await getChosenScriptures({ limit: 6 });

  if (!contents.length) {
    return (
      <div className="text-center py-8 text-text-secondary">
        아직 등록된 경전이 없습니다.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
        {contents.map((content, index) => (
          <ScriptureCard
            key={content.id}
            id={content.id}
            title={content.title}
            creator={content.creator}
            thumbnail={content.thumbnail_url}
            type={content.type}
            celebCount={content.celeb_count}
            avgRating={content.avg_rating}
            rank={index + 1}
          />
        ))}
      </div>
    </div>
  );
}

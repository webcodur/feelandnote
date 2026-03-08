/*
  파일명: /components/features/user/explore/hub/HubSkeleton.tsx
  기능: 허브 페이지 스켈레톤 로딩
  책임: Suspense fallback용 스켈레톤 UI
*/ // ------------------------------

function SectionSkeleton({ cardCount = 6 }: { cardCount?: number }) {
  return (
    <div className="animate-pulse">
      {/* 제목 스켈레톤 */}
      <div className="h-5 w-48 bg-bg-card rounded mb-4 md:mb-6 mx-1" />
      {/* 카드 그리드 스켈레톤 */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 md:gap-4">
        {Array.from({ length: cardCount }).map((_, i) => (
          <div key={i}>
            <div className="aspect-square bg-bg-card rounded-md" />
            <div className="mt-1.5 space-y-1 px-0.5">
              <div className="h-3 w-2/3 bg-bg-card rounded mx-auto" />
              <div className="h-2.5 w-1/2 bg-bg-card rounded mx-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HubSkeleton() {
  return (
    <div className="space-y-12 md:space-y-16">
      <SectionSkeleton cardCount={6} />
      {/* 분야별 4컬럼 */}
      <div className="animate-pulse">
        <div className="h-5 w-48 bg-bg-card rounded mb-4 md:mb-6 mx-1" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-4 w-16 bg-bg-card rounded mx-auto mb-1.5" />
              <div className="aspect-square bg-bg-card rounded-md" />
            </div>
          ))}
        </div>
      </div>
      <SectionSkeleton cardCount={6} />
      <SectionSkeleton cardCount={12} />
    </div>
  );
}

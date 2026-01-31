/*
  파일명: /components/ui/PageHeroSection.tsx
  기능: 페이지 상단 히어로 섹션
  책임: SectionHeader를 이오니아식 기둥과 MeanderDivider로 감싸 렌더링한다.
*/ // ------------------------------

import SectionHeader from "./SectionHeader";
import MeanderDivider from "./MeanderDivider";

interface PageHeroSectionProps {
  englishTitle: string;
  title: string;
  description: string;
}

export default function PageHeroSection({ englishTitle, title, description }: PageHeroSectionProps) {
  return (
    <div className="flex flex-col items-center">
      <SectionHeader
        variant="hero"
        englishTitle={englishTitle}
        title={title}
        description={description}
      />
      <MeanderDivider size="sm" className="mt-6 mb-6" />
    </div>
  );
}

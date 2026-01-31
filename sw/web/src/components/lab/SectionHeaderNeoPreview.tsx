import PageHeroSectionNeo from "@/components/ui/PageHeroSectionNeo";

export default function SectionHeaderNeoPreview() {
  return (
    <div className="flex flex-col gap-12 w-full">
      {/* V1: Standard Neo-Pantheon */}
      <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#0a0a0a]">
        <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
          <span className="text-xs text-text-tertiary">Ver 1. Neo-Pantheon (Standard)</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent">Recommended</span>
        </div>
        <PageHeroSectionNeo
          englishTitle="The Great Library"
          title="기록의 전당"
          description="당신이 경험한 모든 문화적 순간들이 영원히 기록되는 공간입니다."
        />
      </div>
    </div>
  );
}

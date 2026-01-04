import { BookOpen } from "lucide-react";
import { SectionHeader } from "@/components/ui";

export default function Page() {
  return (
    <>
      <SectionHeader
        title="방명록"
        description="방문자들의 메시지를 확인하세요"
        icon={<BookOpen size={20} />}
        className="mb-4"
      />

      <div className="bg-surface rounded-2xl p-12 text-center">
        <div className="text-text-tertiary mb-2 flex justify-center">
          <BookOpen size={48} />
        </div>
        <p className="text-lg font-medium text-text-secondary">준비 중입니다</p>
        <p className="text-sm text-text-tertiary mt-1">곧 방명록 기능이 추가될 예정이에요</p>
      </div>
    </>
  );
}

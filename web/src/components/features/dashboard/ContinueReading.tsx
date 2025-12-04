import Link from "next/link";
import { READING_LIST } from "@/lib/mock-data";
import { BookOpen } from "lucide-react";
import ContentCard from "@/components/features/archive/ContentCard";
import { SectionHeader, ContentGrid } from "@/components/ui";

export default function ContinueReading() {
  return (
    <div className="mb-8">
      <SectionHeader
        title="계속 보기"
        icon={<BookOpen size={24} />}
        linkText="전체보기 →"
        linkHref="/archive"
      />
      <ContentGrid>
        {READING_LIST.map((item) => (
          <Link href={`/archive/${item.id}`} key={item.id}>
            <ContentCard item={item} />
          </Link>
        ))}
      </ContentGrid>
    </div>
  );
}

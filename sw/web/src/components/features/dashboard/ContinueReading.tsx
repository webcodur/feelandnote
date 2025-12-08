"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Loader2 } from "lucide-react";
import ContentCard from "@/components/features/archive/ContentCard";
import { SectionHeader, ContentGrid } from "@/components/ui";
import { getMyContents, type UserContentWithContent } from "@/actions/contents/getMyContents";

export default function ContinueReading() {
  const [contents, setContents] = useState<UserContentWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadContents() {
      try {
        // EXPERIENCE 상태인 콘텐츠만 가져오기
        const data = await getMyContents({ status: "EXPERIENCE" });
        setContents(data.slice(0, 6)); // 최대 6개만 표시
      } catch (error) {
        console.error("Failed to load contents:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadContents();
  }, []);

  if (isLoading) {
    return (
      <div className="mb-8">
        <SectionHeader
          title="계속 보기"
          icon={<BookOpen size={24} />}
          linkText="전체보기 →"
          linkHref="/archive"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-accent" />
        </div>
      </div>
    );
  }

  if (contents.length === 0) {
    return (
      <div className="mb-8">
        <SectionHeader
          title="계속 보기"
          icon={<BookOpen size={24} />}
          linkText="전체보기 →"
          linkHref="/archive"
        />
        <div className="text-center py-12 text-text-secondary">
          <p>아직 감상 중인 콘텐츠가 없습니다.</p>
          <Link href="/archive" className="text-accent hover:underline mt-2 inline-block">
            콘텐츠 추가하기 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <SectionHeader
        title="계속 보기"
        icon={<BookOpen size={24} />}
        linkText="전체보기 →"
        linkHref="/archive"
      />
      <ContentGrid>
        {contents.map((item) => (
          <Link href={`/archive/${item.content_id}`} key={item.id}>
            <ContentCard item={item} />
          </Link>
        ))}
      </ContentGrid>
    </div>
  );
}

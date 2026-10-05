import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { isDeveloperMode } from "@/lib/developer-mode";
import { getContentBriefStrict } from "@/actions/contents/getContentBrief";
import TextLayoutLab from "@/components/lab/TextLayoutLab";

export async function generateMetadata() {
  return {
    title: "본문 표시 비교 | Lab",
    robots: { index: false, follow: false },
    alternates: await getLocalizedAlternates("/lab/text"),
  };
}

// 개발 모드에서만 여는 비교 화면이며 공개 사이트맵에는 등록하지 않는다.
export default async function Page({ searchParams }: {
  searchParams: Promise<{ contentId?: string }>;
}) {
  if (!isDeveloperMode() || await getLocale() !== "ko") notFound();
  const { contentId } = await searchParams;
  if (!contentId) return <TextLayoutLab />;
  try {
    const brief = await getContentBriefStrict(contentId, "ko");
    return <TextLayoutLab initialText={brief?.description} sourceHref={brief?.introductionAttribution?.url}
      loadError={!brief?.description} />;
  } catch {
    return <TextLayoutLab loadError />;
  }
}

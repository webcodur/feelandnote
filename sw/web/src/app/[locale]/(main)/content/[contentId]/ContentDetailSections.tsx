import { getPublicReviewFeed } from "@/actions/contents/getReviewFeed";
import { getFigureBookCharactersForContent } from "@/actions/figure-books/getFigureBooks";
import { getCuratedEntriesForContent } from "@/actions/library/curated";
import AllReviewsSection from "@/components/features/content/AllReviewsSection";
import { ContentCharacters, ContentCurated } from "@/components/features/content/ContentRelations";
import Lane from "@/components/ui/pending/Lane";
import { PendingBlock, RetryBlock } from "@/components/ui/pending";

interface Props { contentId: string; locale: string }

export function ContentRelatedSections(props: Props) {
  return <>
    <Lane fallback={<PendingBlock variant="panel" minHeight="min-h-16" />}><Characters {...props} /></Lane>
    <Lane fallback={<PendingBlock variant="panel" minHeight="min-h-16" />}><Curated {...props} /></Lane>
  </>;
}

async function Characters({ contentId, locale }: Props) {
  const characters = await getFigureBookCharactersForContent(contentId, locale).catch(error => {
    console.error("[ContentDetail:characters]", error);
    return null;
  });
  if (!characters) return <RetryBlock />;
  return characters.length ? <ContentCharacters characters={characters} /> : null;
}

async function Curated({ contentId, locale }: Props) {
  const entries = await getCuratedEntriesForContent(contentId, locale).catch(error => {
    console.error("[ContentDetail:curated]", error);
    return null;
  });
  if (!entries) return <RetryBlock />;
  return entries.length ? <ContentCurated entries={entries} /> : null;
}

export function ContentReviewsSection(props: Props & { title: string; type: string }) {
  return <Lane fallback={<PendingBlock variant="rows" count={3} />}><Reviews {...props} /></Lane>;
}

async function Reviews({ contentId, locale, title, type }: Props & { title: string; type: string }) {
  const reviews = await getPublicReviewFeed({ contentId, limit: 10 }, locale).catch(error => {
    console.error("[ContentDetail:reviews]", error);
    return null;
  });
  if (!reviews) return <RetryBlock />;
  return <AllReviewsSection contentId={contentId} contentTitle={title} contentType={type} initialReviews={reviews} />;
}

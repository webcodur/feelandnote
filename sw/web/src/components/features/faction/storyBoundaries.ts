import type { LocalizedSceneEnding } from '@feelandnote/shared/lib/faction-team-image';

export interface StoryGuide {
  phase: 'opening' | 'closing';
  title: string;
}

export interface StoryArtwork {
  url: string;
  label?: string | null;
  caption?: string | null;
  kind?: 'scene';
  ending?: LocalizedSceneEnding;
}

/** Only standalone boundary paragraphs are metadata; quoted words inside a story stay intact. */
export function readStoryBoundary(caption: string, storyTitle?: string) {
  const paragraphs = caption.split(/\r?\n\s*\r?\n/);
  const first = paragraphs[0]?.trim() ?? '';
  const last = paragraphs.at(-1)?.trim() ?? '';
  const opening = first.match(/^〈(.+)〉 이야기를 시작합니다\.$/u)?.[1]
    ?? first.match(/^A new story begins: (.+)\.$/u)?.[1];
  const closingCandidate = last.match(/^〈(.+)〉 이야기는 여기서 마칩니다\.$/u)?.[1]
    ?? last.match(/^This concludes (.+)\.$/u)?.[1];
  const closing = closingCandidate === (opening ?? storyTitle) ? closingCandidate : undefined;
  const start = opening ? 1 : 0;
  const end = closing ? paragraphs.length - 1 : paragraphs.length;
  return { opening, closing, caption: paragraphs.slice(start, end).join('\n\n') };
}

/** Guides use the adjacent scene as a background; they do not create or duplicate DB images. */
export function buildStorySlides(images: StoryArtwork[]) {
  const slides: (StoryArtwork & { sourceIndex: number; guide?: StoryGuide })[] = [];
  let storyTitle: string | undefined;
  images.forEach((image, sourceIndex) => {
    const boundary = image.kind === 'scene' && image.caption ? readStoryBoundary(image.caption, storyTitle) : undefined;
    if (boundary?.opening) storyTitle = boundary.opening;
    if (boundary?.opening) slides.push({ url: image.url, label: boundary.opening, sourceIndex,
      guide: { phase: 'opening', title: boundary.opening } });
    slides.push({ ...image, sourceIndex, ...(boundary ? { caption: boundary.caption } : {}) });
    if (boundary?.closing) slides.push({ url: image.url, label: boundary.closing, sourceIndex,
      guide: { phase: 'closing', title: boundary.closing }, ...(image.ending ? { ending: image.ending } : {}) });
    if (boundary?.closing) storyTitle = undefined;
  });
  return slides;
}

import { sceneBoundaryFormat, type LocalizedSceneEnding } from '@feelandnote/shared/lib/faction-team-image';

export interface ArtworkImage {
  url: string;
  label?: string | null;
  caption?: string | null;
  kind?: 'scene';
  opening?: LocalizedSceneEnding;
  ending?: LocalizedSceneEnding;
}

export interface ArtworkSlide extends ArtworkImage {
  sourceIndex: number;
  card?: LocalizedSceneEnding;
  cardKind?: 'opening' | 'ending';
  storyTitle?: string;
  storyNumber?: number;
}

/** 도입 → 해당 장면들 → 마무리 순서. 메타데이터가 없는 기존 그림은 그대로 읽힌다. */
export function buildArtworkSlides(images: ArtworkImage[]): ArtworkSlide[] {
  const slides: ArtworkSlide[] = [];
  let storyTitle: string | undefined;
  let storyNumber = 0;
  let htmlUsed = false;
  images.forEach((image, sourceIndex) => {
    if (image.opening) {
      storyTitle = image.opening.title;
      storyNumber++;
      htmlUsed = false;
      if (sceneBoundaryFormat(image.opening, 'opening') === 'html') {
        slides.push({ url: image.url, label: image.opening.title, sourceIndex, card: image.opening,
          cardKind: 'opening', storyTitle, storyNumber });
        htmlUsed = true;
      }
    }
    slides.push({ ...image, sourceIndex, storyTitle, storyNumber });
    if (image.ending && sceneBoundaryFormat(image.ending, 'ending') === 'html' && !htmlUsed) {
      slides.push({ url: image.url, label: image.ending.title,
        sourceIndex: sourceIndex === images.length - 1 ? images.length : sourceIndex,
        card: image.ending, cardKind: 'ending', storyTitle, storyNumber });
      htmlUsed = true;
    }
  });
  return slides;
}

/** 장면 기억은 원본 번호를 유지한다. 이야기를 처음 열면 도입부터 보여 준다. */
export function artworkEntryIndex(slides: ArtworkSlide[], sourceIndex: number) {
  const found = slides.findIndex(slide => slide.sourceIndex === sourceIndex);
  return found >= 0 ? found : Math.max(0, Math.min(slides.length - 1, sourceIndex));
}

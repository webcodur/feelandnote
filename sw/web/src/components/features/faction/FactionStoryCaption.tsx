import { useMemo, type CSSProperties, type RefObject } from "react";
import FactionSceneText from "./FactionSceneText";
import { sceneCaptionPages } from "./sceneCaptionPages";

interface Props {
  images: { url: string; caption?: string | null; kind?: "scene" }[];
  index: number;
  page: number;
  split: boolean;
  selecting: boolean;
  boxRef: RefObject<HTMLSpanElement | null>;
  style: CSSProperties;
  onTransitionEnd: React.TransitionEventHandler;
}

/** 모든 해설을 한 번만 마운트한다. 숨긴 글도 display:none 대신 화면 밖에 두어 페이지 번역이 읽을 수 있게 한다. */
export default function FactionStoryCaption({ images, index, page, split, selecting, boxRef, style, onTransitionEnd }: Props) {
  const stories = useMemo(() => images.map(image => sceneCaptionPages(image.caption ?? "")), [images]);
  const paginated = split && !selecting;
  return <span ref={boxRef} className="relative block" style={style} onTransitionEnd={onTransitionEnd}>
    {stories.map((pages, sceneIndex) => <span key={`${images[sceneIndex].url}-${sceneIndex}`}
      data-story-caption={sceneIndex} aria-hidden={sceneIndex !== index || undefined}
      className={sceneIndex === index ? "relative block" : "pointer-events-none absolute top-0 block w-full"}
      style={sceneIndex === index ? undefined : { left: "200%" }}>
      {pages.map(({ text, separator }, pageIndex) => {
        const offset = pageIndex - page;
        const outside = paginated && offset !== 0;
        return <span key={pageIndex} data-story-page={pageIndex}
          aria-hidden={outside || undefined}
          className={paginated ? (outside ? "pointer-events-none absolute top-0 block w-full" : "block") : ""}
          style={outside ? { left: `${(Math.abs(offset) === 1 ? offset : 2) * 100}%` } : undefined}>
          <span className={paginated ? "sr-only" : ""}>{separator}</span>
          <FactionSceneText text={text} />
        </span>;
      })}
    </span>)}
  </span>;
}

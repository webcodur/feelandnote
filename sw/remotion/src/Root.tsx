import React from "react";
import { Composition } from "remotion";
import "./style.css";
import {
  ServiceIntro,
  totalFrames as serviceIntroFrames,
} from "./compositions/ServiceIntro";
import {
  BookRecommend,
  calcTotalFrames as calcBookFrames,
  BookRecommendShort,
  calcShortTotalFrames,
  episodes,
} from "./compositions/BookRecommend";
import { FPS } from "./compositions/BookRecommend/timing";
import { Thumbnail } from "./compositions/Thumbnail/Thumbnail";
import { ThumbnailShort } from "./compositions/Thumbnail/ThumbnailShort";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* === 에피소드별 composition 자동 등록 === */}
      {Object.entries(episodes).map(([name, script]) => {
        // kebab-case → PascalCase (elon-musk → ElonMusk)
        const label = name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
        const dur = calcBookFrames(script)
        // duration이 NaN이면 미완성 에피소드 — 스킵
        if (!Number.isFinite(dur) || dur <= 0) return null
        return (
          <React.Fragment key={name}>
            {/* 롱폼 */}
            <Composition
              id={`${label}`}
              component={BookRecommend}
              durationInFrames={dur}
              fps={FPS}
              width={1920}
              height={1080}
              defaultProps={{ script, episodeName: name }}
            />
            {/* 쇼츠 */}
            {script.shorts && (
              <Composition
                id={`${label}Short`}
                component={BookRecommendShort}
                durationInFrames={calcShortTotalFrames(script)}
                fps={FPS}
                width={1080}
                height={1920}
                defaultProps={{ script, episodeName: name }}
              />
            )}
          </React.Fragment>
        )
      })}

      {/* === 썸네일 (에피소드별 × variant A/B/C) === */}
      {Object.entries(episodes).map(([name, script]) => {
        const label = name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
        return (['A', 'B', 'C', 'D', 'E'] as const).map(v => (
          <Composition
            key={`${name}-thumb-${v}`}
            id={`${label}Thumb${v}`}
            component={Thumbnail}
            durationInFrames={1}
            fps={1}
            width={1280}
            height={720}
            defaultProps={{ script, variant: v }}
          />
        ))
      })}

      {/* === 쇼츠 썸네일 === */}
      {Object.entries(episodes).map(([name, script]) => {
        const label = name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
        return (
          <Composition
            key={`${name}-thumb-short`}
            id={`${label}ThumbShort`}
            component={ThumbnailShort}
            durationInFrames={1}
            fps={1}
            width={1080}
            height={1920}
            defaultProps={{ script }}
          />
        )
      })}

      {/* 서비스 소개 영상 — 60초 트레일러 */}
      <Composition
        id="ServiceIntro"
        component={ServiceIntro}
        durationInFrames={serviceIntroFrames}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};

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

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* === 에피소드별 composition 자동 등록 === */}
      {Object.entries(episodes).map(([name, script]) => {
        // kebab-case → PascalCase (elon-musk → ElonMusk)
        const label = name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
        return (
          <React.Fragment key={name}>
            {/* 롱폼 텍스트 */}
            <Composition
              id={`${label}`}
              component={BookRecommend}
              durationInFrames={calcBookFrames(script)}
              fps={30}
              width={1920}
              height={1080}
              defaultProps={{ script, episodeName: name }}
            />
            {/* 롱폼 비주얼 */}
            <Composition
              id={`${label}Visual`}
              component={BookRecommend}
              durationInFrames={calcBookFrames(script)}
              fps={30}
              width={1920}
              height={1080}
              defaultProps={{ script, visual: true, episodeName: name }}
            />
            {/* 쇼츠 */}
            {script.shorts && (
              <Composition
                id={`${label}Short`}
                component={BookRecommendShort}
                durationInFrames={calcShortTotalFrames(script)}
                fps={30}
                width={1080}
                height={1920}
                defaultProps={{ script, episodeName: name }}
              />
            )}
          </React.Fragment>
        )
      })}

      {/* 서비스 소개 영상 — 60초 트레일러 */}
      <Composition
        id="ServiceIntro"
        component={ServiceIntro}
        durationInFrames={serviceIntroFrames}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};

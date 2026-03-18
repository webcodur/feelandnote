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
import {
  CelebProfile,
  episodes as profileEpisodes,
  calcTotalFrames as calcProfileFrames,
} from "./compositions/CelebProfile";
import { FPS } from "./compositions/BookRecommend/timing";
import { Thumbnail } from "./compositions/Thumbnail/Thumbnail";


export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* === 에피소드별 composition — 인물 단위로 그룹 정렬 === */}
      {Object.entries(episodes).sort(([a], [b]) => a.localeCompare(b)).map(([name, script]) => {
        const label = name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
        const dur = calcBookFrames(script)
        if (!Number.isFinite(dur) || dur <= 0) return null
        return (
          <React.Fragment key={name}>
            <Composition
              id={`${label}-L`}
              component={BookRecommend}
              durationInFrames={dur}
              fps={FPS}
              width={1920}
              height={1080}
              defaultProps={{ script, episodeName: name }}
            />
            {script.shorts && (
              <Composition
                id={`${label}-S`}
                component={BookRecommendShort}
                durationInFrames={calcShortTotalFrames(script)}
                fps={FPS}
                width={1080}
                height={1920}
                defaultProps={{ script, episodeName: name }}
              />
            )}
            <Composition
              id={`${label}-LT`}
              component={Thumbnail}
              durationInFrames={1}
              fps={1}
              width={1280}
              height={720}
              defaultProps={{ script }}
            />
          </React.Fragment>
        )
      })}

      {/* === 인물 열전 — celeb-profile === */}
      {Object.entries(profileEpisodes).sort(([a], [b]) => a.localeCompare(b)).map(([name, script]) => {
        const label = 'CP-' + name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
        const dur = calcProfileFrames(script)
        if (!Number.isFinite(dur) || dur <= 0) return null
        return (
          <Composition
            key={name}
            id={label}
            component={CelebProfile}
            durationInFrames={dur}
            fps={FPS}
            width={1920}
            height={1080}
            defaultProps={{ script, episodeName: name }}
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

import React from "react";
import { Composition, Folder } from "remotion";
import "./style.css";
import {
  ServiceIntro,
  totalFrames as serviceIntroFrames,
} from "./compositions/ServiceIntro";
import {
  ServiceMV,
  totalFrames as serviceMVFrames,
} from "./compositions/ServiceMV";
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


/** 에피소드 목록을 baseName(인물명) 기준으로 그룹핑 */
function groupByPerson<T>(entries: [string, T][]) {
  const sorted = [...entries].sort(([a], [b]) => a.localeCompare(b))
  const groups: Record<string, { label: string; items: { name: string; lang: string; script: T }[] }> = {}
  for (const [name, script] of sorted) {
    const isEn = name.endsWith('-en')
    const baseName = isEn ? name.slice(0, -3) : name
    const label = baseName.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
    if (!groups[baseName]) groups[baseName] = { label, items: [] }
    groups[baseName].items.push({ name, lang: isEn ? 'EN' : 'KO', script })
  }
  return Object.values(groups)
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* === 서재 탐방 === */}
      <Folder name="BookRecommend">
        {groupByPerson(Object.entries(episodes)).map(({ label, items }) => (
          <Folder key={label} name={label}>
            {(() => {
              const valid = items.filter(({ script }) => {
                const dur = calcBookFrames(script)
                return Number.isFinite(dur) && dur > 0
              })
              return (
                <>
                  {valid.map(({ name, lang, script }) => (
                    <Composition key={`${name}-L`} id={`${label}-${lang}-L`} component={BookRecommend} durationInFrames={calcBookFrames(script)} fps={FPS} width={1920} height={1080} defaultProps={{ script, episodeName: name }} />
                  ))}
                  {valid.map(({ name, lang, script }) => (
                    <Composition key={`${name}-LT`} id={`${label}-${lang}-LT`} component={Thumbnail} durationInFrames={1} fps={1} width={1280} height={720} defaultProps={{ script }} />
                  ))}
                  {valid.filter(({ script }) => script.shorts).map(({ name, lang, script }) => (
                    <Composition key={`${name}-S`} id={`${label}-${lang}-S`} component={BookRecommendShort} durationInFrames={calcShortTotalFrames(script)} fps={FPS} width={1080} height={1920} defaultProps={{ script, episodeName: name }} />
                  ))}
                  {valid.filter(({ script }) => script.shorts).map(({ name, lang, script }) => (
                    <Composition key={`${name}-ST`} id={`${label}-${lang}-ST`} component={BookRecommendShort} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ script, episodeName: name }} />
                  ))}
                </>
              )
            })()}
          </Folder>
        ))}
      </Folder>

      {/* === 인물 열전 === */}
      <Folder name="CelebProfile">
        {groupByPerson(Object.entries(profileEpisodes)).map(({ label, items }) => (
          <Folder key={label} name={label}>
            {items.map(({ name, lang, script }) => {
              const dur = calcProfileFrames(script)
              if (!Number.isFinite(dur) || dur <= 0) return null
              return (
                <Composition
                  key={name}
                  id={`CP-${label}-${lang}`}
                  component={CelebProfile}
                  durationInFrames={dur}
                  fps={FPS}
                  width={1920}
                  height={1080}
                  defaultProps={{ script, episodeName: name }}
                />
              )
            })}
          </Folder>
        ))}
      </Folder>

      {/* === 기타 === */}
      <Folder name="Misc">
        <Composition
          id="ServiceIntro"
          component={ServiceIntro}
          durationInFrames={serviceIntroFrames}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="ServiceMV"
          component={ServiceMV}
          durationInFrames={serviceMVFrames}
          fps={FPS}
          width={1920}
          height={1080}
        />
      </Folder>
    </>
  );
};

import React from "react";
import { Composition, Folder } from "remotion";
import "./style.css";
import {
  OlympusMV,
  totalFrames as olympusMVFrames,
} from "./compositions/OlympusMV";
import {
  BookRecommend,
  calcTotalFrames as calcBookFrames,
  BookRecommendShort,
  calcShortTotalFrames,
  episodes,
  episodeStatus,
} from "./compositions/BookRecommend";
import type { EpisodeStatus } from "./compositions/BookRecommend";
import { FPS } from "./compositions/BookRecommend/timing";
import { Thumbnail } from "./compositions/Thumbnail/Thumbnail";
import { ShortsThumbnail } from "./compositions/Thumbnail/ShortsThumbnail";


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

/** baseName에서 상태를 결정 (KO 기준, 없으면 todo) */
function getStatus(baseName: string): EpisodeStatus {
  return episodeStatus[baseName] ?? 'todo'
}

const STATUS_LABELS: Record<EpisodeStatus, string> = {
  done: '1-Done',
  live: '2-Live',
  todo: '3-Todo',
}

/** 에피소드를 상태별로 분류 */
function groupByStatus(allEntries: [string, unknown][]) {
  const result: Record<EpisodeStatus, [string, unknown][]> = { done: [], live: [], todo: [] }
  for (const [name, script] of allEntries) {
    const isEn = name.endsWith('-en')
    const baseName = isEn ? name.slice(0, -3) : name
    const status = getStatus(baseName)
    result[status].push([name, script])
  }
  return result
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* === 서재 탐방 === */}
      <Folder name="BookRecommend">
        {(Object.entries(STATUS_LABELS) as [EpisodeStatus, string][]).map(([status, folderName]) => {
          const statusEntries = groupByStatus(Object.entries(episodes))[status]
          if (statusEntries.length === 0) return null
          return (
            <Folder key={status} name={folderName}>
              {groupByPerson(statusEntries as [string, typeof episodes[string]][]).map(({ label, items }) => (
                <Folder key={label} name={label}>
                  {(() => {
                    const validLong = items.filter(({ script }) => {
                      const dur = calcBookFrames(script)
                      return Number.isFinite(dur) && dur > 0
                    })
                    const validShort = items.filter(({ script }) => {
                      if (!script.shorts) return false
                      const dur = calcShortTotalFrames(script)
                      return Number.isFinite(dur) && dur > 0
                    })
                    return (
                      <>
                        {validLong.map(({ name, lang, script }) => (
                          <Composition key={`${name}-L-VID`} id={`${label}-${lang}-L-VID`} component={BookRecommend} durationInFrames={calcBookFrames(script)} fps={FPS} width={1920} height={1080} defaultProps={{ script, episodeName: name }} />
                        ))}
                        {validLong.map(({ name, lang, script }) => (
                          <Composition key={`${name}-LV-VID`} id={`${label}-${lang}-LV-VID`} component={BookRecommend} durationInFrames={calcBookFrames(script)} fps={FPS} width={1080} height={1920} defaultProps={{ script, episodeName: name }} />
                        ))}
                        {validLong.map(({ name, lang, script }) => (
                          <Composition key={`${name}-L-THUMB`} id={`${label}-${lang}-L-THUMB`} component={Thumbnail} durationInFrames={1} fps={1} width={1280} height={720} defaultProps={{ script }} />
                        ))}
                        {validShort.map(({ name, lang, script }) => (
                          <Composition key={`${name}-S-VID`} id={`${label}-${lang}-S-VID`} component={BookRecommendShort} durationInFrames={calcShortTotalFrames(script)} fps={FPS} width={1080} height={1920} defaultProps={{ script, episodeName: name }} />
                        ))}
                        {validShort.map(({ name, lang, script }) => (
                          <Composition key={`${name}-S-THUMB`} id={`${label}-${lang}-S-THUMB`} component={ShortsThumbnail} durationInFrames={1} fps={1} width={1080} height={1920} defaultProps={{ script }} />
                        ))}
                      </>
                    )
                  })()}
                </Folder>
              ))}
            </Folder>
          )
        })}
      </Folder>

      {/* === 기타 === */}
      <Folder name="Misc">
        <Composition
          id="OlympusMV"
          component={OlympusMV}
          durationInFrames={olympusMVFrames}
          fps={FPS}
          width={1080}
          height={1920}
        />
      </Folder>
    </>
  );
};

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


/** 에피소드명에서 로케일·파트 접미사를 분리 */
function parseEpMeta(name: string) {
  const isEn = name.endsWith('-en')
  const withoutEn = isEn ? name.slice(0, -3) : name
  const partMatch = withoutEn.match(/-(\d+)$/)
  const partNum = partMatch ? parseInt(partMatch[1]) : 1
  const baseName = withoutEn.replace(/-\d+$/, '')
  return { isEn, baseName, partNum }
}

/** 에피소드 목록을 baseName(인물명) 기준으로 그룹핑 — 파트 접미사(-2, -3)도 같은 폴더에 묶는다 */
function groupByPerson<T>(entries: [string, T][]) {
  const sorted = [...entries].sort(([a], [b]) => a.localeCompare(b))
  const groups: Record<string, { label: string; items: { name: string; lang: string; partNum: number; script: T }[] }> = {}
  for (const [name, script] of sorted) {
    const { isEn, baseName, partNum } = parseEpMeta(name)
    const label = baseName.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
    if (!groups[baseName]) groups[baseName] = { label, items: [] }
    groups[baseName].items.push({ name, lang: isEn ? 'EN' : 'KO', partNum, script })
  }
  return Object.values(groups)
}

/** baseName에서 상태를 결정. script.ts에서 이미 done/live만 등록되므로 폴백은 타입 만족용. */
function getStatus(baseName: string): EpisodeStatus {
  return episodeStatus[baseName] ?? 'done'
}

const STATUS_LABELS: Record<EpisodeStatus, string> = {
  done: '1-Done',
  live: '2-Live',
}

/** 에피소드를 상태별로 분류 */
function groupByStatus(allEntries: [string, unknown][]) {
  const result: Record<EpisodeStatus, [string, unknown][]> = { done: [], live: [] }
  for (const [name, script] of allEntries) {
    const { baseName } = parseEpMeta(name)
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
                    // shortsIndex는 1-based로 일관 생성 (i + 1)
                    const shortsEntries = items.flatMap(({ name, lang, partNum, script }) => {
                      const arr = script.shorts ?? []
                      return arr.map((_, i) => ({ name, lang, partNum, script, shortsIndex: i + 1 }))
                    }).filter(({ script, shortsIndex }) => {
                      const dur = calcShortTotalFrames(script, shortsIndex)
                      return Number.isFinite(dur) && dur > 0
                    })
                    /** 파트 접미사 — 1편은 빈 문자열, 2편 이상은 -P2, -P3 등 */
                    const pt = (partNum: number) => partNum > 1 ? `-P${partNum}` : ''
                    return (
                      <>
                        {validLong.map(({ name, lang, partNum, script }) => (
                          <Composition key={`${name}-L-VID`} id={`${label}-${lang}${pt(partNum)}-L-VID`} component={BookRecommend} durationInFrames={calcBookFrames(script)} fps={FPS} width={1920} height={1080} defaultProps={{ script, episodeName: name }} />
                        ))}
                        {validLong.map(({ name, lang, partNum, script }) => (
                          <Composition key={`${name}-LV-VID`} id={`${label}-${lang}${pt(partNum)}-LV-VID`} component={BookRecommend} durationInFrames={calcBookFrames(script)} fps={FPS} width={1080} height={1920} defaultProps={{ script, episodeName: name }} />
                        ))}
                        {validLong.map(({ name, lang, partNum, script }) => (
                          <Composition key={`${name}-L-THUMB`} id={`${label}-${lang}${pt(partNum)}-L-THUMB`} component={Thumbnail} durationInFrames={1} fps={1} width={1280} height={720} defaultProps={{ script }} />
                        ))}
                        {shortsEntries.map(({ name, lang, partNum, script, shortsIndex }) => (
                          <Composition key={`${name}-S${shortsIndex}-VID`} id={`${label}-${lang}${pt(partNum)}-S${shortsIndex}-VID`} component={BookRecommendShort} durationInFrames={calcShortTotalFrames(script, shortsIndex)} fps={FPS} width={1080} height={1920} defaultProps={{ script, episodeName: name, shortsIndex }} />
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

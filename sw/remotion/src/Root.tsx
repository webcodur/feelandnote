import React from "react";
import { Composition, Folder } from "remotion";
import "./style.css";
import {
  OlympusMV,
  totalFrames as olympusMVFrames,
} from "./compositions/OlympusMV";
import {
  calcTotalFrames as calcBookFrames,
  BookRecommendShort,
  calcShortTotalFrames,
  BookRecommendSolo,
  calcSoloTotalFrames,
  episodes,
  soloEpisodes,
  episodeStatus,
  getEpisodeGroup,
} from "./compositions/BookRecommend";
import type { EpisodeStatus, SoloScript } from "./compositions/BookRecommend";
import { FPS } from "./compositions/BookRecommend/timing";
import {
  Faction,
  calcTotalFrames as calcFactionFrames,
  episodes as factionEpisodes,
  episodeNames as factionEpisodeNames,
  FPS as FACTION_FPS,
} from "./compositions/Faction";
import { Thumbnail } from "./compositions/Thumbnail/Thumbnail";
import { BookRecommendLegacy } from "./compositions/BookRecommend/legacy/BookRecommendLongLegacy";


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

// status 폴더 분류는 폐기. 그룹 폴더(예: Three-Kingdoms)와 미분류(Other)로 표시한다.
void episodeStatus // 외부 export 유지를 위해 reference만 보존

/** 그룹명 폴더 라벨로 변환 — 'three-kingdoms' → 'Three-Kingdoms' */
function toGroupLabel(group: string): string {
  return group.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('-')
}

const UNGROUPED_LABEL = 'Zzz-Ungrouped' // Remotion Folder 명명 규칙(a-z A-Z 0-9 -)에 맞추고 알파벳 정렬 시 끝쪽 배치

/** 에피소드를 그룹별로 분류 */
function groupByGroup(allEntries: [string, unknown][]): Record<string, [string, unknown][]> {
  const result: Record<string, [string, unknown][]> = {}
  for (const [name, script] of allEntries) {
    const { baseName } = parseEpMeta(name)
    const group = getEpisodeGroup(baseName)
    const folder = group ? toGroupLabel(group) : UNGROUPED_LABEL
    if (!result[folder]) result[folder] = []
    result[folder].push([name, script])
  }
  return result
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* === 서재 탐방 === */}
      <Folder name="BookRecommend">
        {Object.entries(groupByGroup(Object.entries(episodes)))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([groupFolder, groupEntries]) => {
          if (groupEntries.length === 0) return null
          return (
            <Folder key={groupFolder} name={groupFolder}>
              {groupByPerson(groupEntries as [string, typeof episodes[string]][]).map(({ label, items }) => (
                <Folder key={label} name={label}>
                  {(() => {
                    const validLong = items.filter(({ script }) => {
                      const dur = calcBookFrames(script)
                      return Number.isFinite(dur) && dur > 0
                    })
                    // shortsIndex=배열 위치(데이터 접근용), slot=출력 번호(고정). 파일 slot 우선, 없으면 폴더순.
                    const shortsEntries = items.flatMap(({ name, lang, partNum, script }) => {
                      const arr = script.shorts ?? []
                      return arr.map((s, i) => ({ name, lang, partNum, script, shortsIndex: i + 1, slot: (s as { slot?: number })?.slot ?? (i + 1) }))
                    }).filter(({ script, shortsIndex }) => {
                      const dur = calcShortTotalFrames(script, shortsIndex)
                      return Number.isFinite(dur) && dur > 0
                    })
                    /** 파트 접미사 — 1편은 빈 문자열, 2편 이상은 -P2, -P3 등 */
                    const pt = (partNum: number) => partNum > 1 ? `-P${partNum}` : ''
                    return (
                      <>
                        {validLong.map(({ name, lang, partNum, script }) => (
                          <Composition key={`${name}-L-VID`} id={`${label}-${lang}${pt(partNum)}-L-VID`} component={BookRecommendLegacy} durationInFrames={calcBookFrames(script)} fps={FPS} width={1920} height={1080} defaultProps={{ script, episodeName: name }} />
                        ))}
                        {validLong.map(({ name, lang, partNum, script }) => (
                          <Composition key={`${name}-LH-THUMB`} id={`${label}-${lang}${pt(partNum)}-LH-THUMB`} component={Thumbnail} durationInFrames={1} fps={1} width={1280} height={720} defaultProps={{ script }} />
                        ))}
                        {shortsEntries.map(({ name, lang, partNum, script, shortsIndex, slot }) => (
                          <Composition key={`${name}-S${slot}-VID`} id={`${label}-${lang}${pt(partNum)}-S${slot}-VID`} component={BookRecommendShort} durationInFrames={calcShortTotalFrames(script, shortsIndex)} fps={FPS} width={1080} height={1920} defaultProps={{ script, episodeName: name, shortsIndex }} />
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

      {/* === 서재 탐방 · 1권 모드 === */}
      <Folder name="BookRecommendSolo">
        {(() => {
          // soloEpisodes 키 → person·locale·bookNum 분해 후 인물별 그룹핑
          type SoloEntry = { key: string; person: string; lang: 'KO' | 'EN'; bookNum: string; script: SoloScript }
          const entries: SoloEntry[] = []
          for (const [key, script] of Object.entries(soloEpisodes)) {
            const m = key.match(/^(.+?)-B(\d{2})(-en)?$/)
            if (!m) continue
            entries.push({ key, person: m[1], lang: m[3] ? 'EN' : 'KO', bookNum: m[2], script })
          }
          const groups: Record<string, SoloEntry[]> = {}
          for (const e of entries) {
            if (!groups[e.person]) groups[e.person] = []
            groups[e.person].push(e)
          }
          return Object.entries(groups)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([person, items]) => {
              // 컴포지션 ID는 기존 롱폼/쇼츠와 동일한 PascalCase(대시 제거).
              // 예: 'elon-musk' → 'ElonMusk'. 솔로 ID: 'ElonMusk-KO-B01-VID'
              const label = person.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
              return (
                <Folder key={person} name={label}>
                  {items
                    .sort((a, b) => (a.lang + a.bookNum).localeCompare(b.lang + b.bookNum))
                    .map(({ key, lang, bookNum, script }) => {
                      const dur = calcSoloTotalFrames(script)
                      if (!Number.isFinite(dur) || dur <= 0) return null
                      return (
                        <Composition
                          key={key}
                          id={`${label}-${lang}-B${bookNum}-VID`}
                          component={BookRecommendSolo}
                          durationInFrames={dur}
                          fps={FPS}
                          width={1920}
                          height={1080}
                          defaultProps={{ script }}
                        />
                      )
                    })}
                </Folder>
              )
            })
        })()}
      </Folder>

      {/* === 세력도 === */}
      <Folder name="Faction">
        {Object.entries(factionEpisodes)
          // 한국어 키만 (영문 키 '-en'은 지금 미사용). EN 컴포지션은 아래 주석 참고.
          .filter(([key]) => !key.endsWith('-en'))
          .map(([key, script]) => {
            const durLong = calcFactionFrames(script, false)
            if (!Number.isFinite(durLong) || durLong <= 0) return null
            const base = `Faction-${key.toUpperCase().replace(/[^A-Z0-9-]/g, '-')}`
            const ep = factionEpisodeNames[key]
            // 쇼츠 편(part) — 진영 part 의 실제 편 수만큼 등록. 편이 없으면 전체 진영을 담은 단일 쇼츠(part 미지정).
            // 접미사 규칙(KO-S{part})은 @feelandnote/shared 의 factionVariants 와 일치한다.
            const parts = Array.from(
              new Set(
                script.groups
                  .filter((g) => !g.disabled && g.part != null && g.part > 0)
                  .map((g) => g.part as number),
              ),
            ).sort((a, b) => a - b)
            const shortsVariants: { suffix: string; part: number | undefined }[] =
              parts.length === 0
                ? [{ suffix: 'S1', part: undefined }]
                : parts.map((p) => ({ suffix: `S${p}`, part: p }))
            return (
              <React.Fragment key={key}>
                {/* KO-S{n} — 한국어 세로 쇼츠. 진영 part 별로 분리(편 없으면 전체 1편). */}
                {shortsVariants.map(({ suffix, part }) => {
                  const durS = calcFactionFrames(script, true, part)
                  if (!Number.isFinite(durS) || durS <= 0) return null
                  return (
                    <Composition
                      key={`${base}-KO-${suffix}`}
                      id={`${base}-KO-${suffix}`}
                      component={Faction}
                      durationInFrames={durS}
                      fps={FACTION_FPS}
                      width={1080}
                      height={1920}
                      defaultProps={{ script, episodeName: ep, orientation: 'portrait' as const, shorts: true, part }}
                    />
                  )
                })}
                {/* KO-LV — 한국어 세로 롱폼 (1080x1920, 전체 세력) */}
                <Composition
                  id={`${base}-KO-LV`}
                  component={Faction}
                  durationInFrames={durLong}
                  fps={FACTION_FPS}
                  width={1080}
                  height={1920}
                  defaultProps={{ script, episodeName: ep, orientation: 'portrait' as const, shorts: false }}
                />
                {/* KO-LH — 한국어 가로 롱폼 (1920x1080, 전체). 지금 미사용 — 필요 시 주석 해제
                <Composition
                  id={`${base}-KO-LH`}
                  component={Faction}
                  durationInFrames={durLong}
                  fps={FACTION_FPS}
                  width={1920}
                  height={1080}
                  defaultProps={{ script, episodeName: ep, orientation: 'landscape' as const, shorts: false }}
                />
                */}
                {/* EN(영문) — 지금 미사용. 영문 스크립트는 factionEpisodes[`${key}-en`]. 필요 시 주석 해제
                <Composition id={`${base}-EN-S`}  component={Faction} durationInFrames={durS}    fps={FACTION_FPS} width={1080} height={1920} defaultProps={{ script: factionEpisodes[`${key}-en`], episodeName: ep, orientation: 'portrait'  as const, shorts: true  }} />
                <Composition id={`${base}-EN-LV`} component={Faction} durationInFrames={durLong} fps={FACTION_FPS} width={1080} height={1920} defaultProps={{ script: factionEpisodes[`${key}-en`], episodeName: ep, orientation: 'portrait'  as const, shorts: false }} />
                <Composition id={`${base}-EN-LH`} component={Faction} durationInFrames={durLong} fps={FACTION_FPS} width={1920} height={1080} defaultProps={{ script: factionEpisodes[`${key}-en`], episodeName: ep, orientation: 'landscape' as const, shorts: false }} />
                */}
              </React.Fragment>
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

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
import { FactionCard, type FactionCardSpec } from "./compositions/FactionCard";
import { BookCard, type BookCardSpec, josa } from "./compositions/BookCard";
import { Thumbnail } from "./compositions/Thumbnail/Thumbnail";
import { FactionLVThumbnail } from "./compositions/Thumbnail/FactionLVThumbnail";
import { FactionLVThumbCandidate } from "./compositions/Thumbnail/FactionLVThumbCandidate";
import { BookRecommendLegacy } from "./compositions/BookRecommend/legacy/BookRecommendLongLegacy";
import { factionCompBase, factionLongformPartNumbers } from "@feelandnote/shared/lib/youtube-faction-meta";

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
            const base = factionCompBase(key)
            const ep = factionEpisodeNames[key]
            // Studio 사이드바 폴더 라벨 — 폴더명(영문)이 곧 라벨이다.
            const studioLabel = ep
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
              <Folder key={key} name={studioLabel}>
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
                      defaultProps={{ episodeKey: key, episodeName: ep, orientation: 'portrait' as const, shorts: true, part }}
                    />
                  )
                })}
                {/* KO-LV — 한국어 세로 롱폼 (1080x1920). 롱폼 배치의 편 경계(cut)가 있으면 KO-LV1·KO-LV2… 로 분리, 없으면 통짜 KO-LV. */}
                {(() => {
                  const lvParts = factionLongformPartNumbers(script.longformLayout)
                  const lvVariants: { suffix: string; lvPart: number | undefined }[] =
                    lvParts.length === 0
                      ? [{ suffix: 'LV', lvPart: undefined }]
                      : lvParts.map((p) => ({ suffix: `LV${p}`, lvPart: p }))
                  return lvVariants.map(({ suffix, lvPart }) => {
                    const durLv = calcFactionFrames(script, false, undefined, lvPart)
                    if (!Number.isFinite(durLv) || durLv <= 0) return null
                    return (
                      <Composition
                        key={`${base}-KO-${suffix}`}
                        id={`${base}-KO-${suffix}`}
                        component={Faction}
                        durationInFrames={durLv}
                        fps={FACTION_FPS}
                        width={1080}
                        height={1920}
                        defaultProps={{ episodeKey: key, episodeName: ep, orientation: 'portrait' as const, shorts: false, lvPart }}
                      />
                    )
                  })
                })()}
                {/* KO-LV-GEM — 한국어 세로 롱폼 썸네일 */}
                <Composition
                  id={`${base}-KO-LV-GEM`}
                  component={FactionLVThumbnail}
                  durationInFrames={1}
                  fps={1}
                  width={1080}
                  height={1920}
                  defaultProps={{ script, episodeName: ep }}
                />
                {/* KO-LV-TH — 한국어 세로 롱폼 썸네일 (채택안) */}
                <Composition
                  id={`${base}-KO-LV-TH`}
                  component={FactionLVThumbCandidate}
                  durationInFrames={1}
                  fps={1}
                  width={1080}
                  height={1920}
                  defaultProps={{ script, episodeName: ep }}
                />
                {/* KO-LH — 한국어 가로 롱폼 (1920x1080, 전체) */}
                <Composition
                  id={`${base}-KO-LH`}
                  component={Faction}
                  durationInFrames={durLong}
                  fps={FACTION_FPS}
                  width={1920}
                  height={1080}
                  defaultProps={{ episodeKey: key, episodeName: ep, orientation: 'landscape' as const, shorts: false }}
                />
                {/* EN(영문) — 지금 미사용. 영문 스크립트는 factionEpisodes[`${key}-en`]. 필요 시 주석 해제
                <Composition id={`${base}-EN-S`}  component={Faction} durationInFrames={durS}    fps={FACTION_FPS} width={1080} height={1920} defaultProps={{ script: factionEpisodes[`${key}-en`], episodeName: ep, orientation: 'portrait'  as const, shorts: true  }} />
                <Composition id={`${base}-EN-LV`} component={Faction} durationInFrames={durLong} fps={FACTION_FPS} width={1080} height={1920} defaultProps={{ script: factionEpisodes[`${key}-en`], episodeName: ep, orientation: 'portrait'  as const, shorts: false }} />
                <Composition id={`${base}-EN-LH`} component={Faction} durationInFrames={durLong} fps={FACTION_FPS} width={1920} height={1080} defaultProps={{ script: factionEpisodes[`${key}-en`], episodeName: ep, orientation: 'landscape' as const, shorts: false }} />
                */}
              </Folder>
            )
          })}
      </Folder>

      {/* === 세력도 카드뉴스 (still 추출) === */}
      <Folder name="FactionCard">
        {(() => {
          const ep = "Digital-Resistance";
          const script = factionEpisodes[ep];
          if (!script) return null;
          const gi = 0, pi = 3; // 사이퍼펑크 그룹 · 사토시 나카모토
          // 한 인물 캐러셀 4장: 표지(단체샷+위계) → 물음표 인물컷(소개글) → 인물샷+대사 → 연표
          const cards: { id: string; card: FactionCardSpec }[] = [
            { id: "Sat-1-cover", card: { type: "cover", groupIndex: gi } },
            {
              id: "Sat-2-mystery",
              card: {
                type: "mystery", groupIndex: gi, personIndex: pi,
                headline: "은행 없는 돈을 만들고\n사라진 사람",
                body: "2008년, 누군가 은행 없이 오가는 돈의 설계도를 인터넷에 올렸다. 비트코인이었다. 그는 코드와 글로만 존재하다 2011년 홀연히 사라졌고, 정체는 지금도 미궁이다.",
              },
            },
            {
              id: "Sat-3-quote",
              card: {
                type: "quote", groupIndex: gi, personIndex: pi, bg: "photo",
                quoteCard: "기존 화폐의 문제는 신뢰다. 돈이 돌려면 은행을 믿어야 한다. 그 믿음이 무너진 역사는 차고 넘친다. 그래서 나는 모든 것을 신뢰가 아니라 암호 증명 위에 세웠다.",
              },
            },
            {
              id: "Sat-4-timeline",
              card: {
                type: "timeline", groupIndex: gi, title: "그가 남긴 것",
                items: [
                  { year: "2008", text: "세계 금융위기, 은행이 무너지다" },
                  { year: "2009", text: "비트코인을 처음 가동하며 은행 구제금융 기사를 새기다" },
                  { year: "2011", text: "작별 한 줄을 남기고 사라지다" },
                  { year: "지금", text: "정체는 아무도 모른다" },
                ],
              },
            },
            {
              id: "Sat-5-outro",
              card: {
                type: "outro", groupIndex: gi,
                headline: "사토시 나카모토의\n진짜 얼굴은?",
                sub: "디지털 저항 연대기",
                cta: "유튜브 · 필앤노트 닷컴",
              },
            },
          ];
          // 내보내기용 범용 컴포지션 — BO 카드 내보내기가 still 렌더 시 --props 로 script·episodeName·card 를 주입한다.
          // 비율별 1개씩(4:5·3:4·1:1·9:16). defaultProps 는 스튜디오 표시용 샘플(09 사토시 표지).
          const exportComps: { id: string; width: number; height: number }[] = [
            { id: "FactionCard-4x5", width: 1080, height: 1350 },
            { id: "FactionCard-3x4", width: 1080, height: 1440 },
            { id: "FactionCard-1x1", width: 1080, height: 1080 },
            { id: "FactionCard-9x16", width: 1080, height: 1920 },
          ];
          return (
            <>
              {cards.map(({ id, card }) => (
                <Composition
                  key={id}
                  id={id}
                  component={FactionCard}
                  durationInFrames={1}
                  fps={1}
                  width={1080}
                  height={1350}
                  defaultProps={{ script, episodeName: ep, card }}
                />
              ))}
              {exportComps.map(({ id, width, height }) => (
                <Composition
                  key={id}
                  id={id}
                  component={FactionCard}
                  durationInFrames={1}
                  fps={1}
                  width={width}
                  height={height}
                  defaultProps={{ script, episodeName: ep, card: cards[0].card }}
                />
              ))}
            </>
          );
        })()}
      </Folder>

      {/* === 서재 탐방 카드뉴스 (still 추출) === */}
      <Folder name="BookCard">
        {(() => {
          const koWithBooks = Object.entries(episodes).filter(
            ([name, s]) => !parseEpMeta(name).isEn && (s?.books?.length ?? 0) > 0,
          );
          const entry =
            koWithBooks.find(([name]) => parseEpMeta(name).baseName === "peter-thiel") ??
            koWithBooks[0];
          if (!entry) return null;
          const [ep, script] = entry;
          const who = script.host.nickname;
          // 카드 5종 데모 등록. 비율은 4:5(인스타·쓰레드 기본)·1:1(X·정사각) 위주.
          // 실제 양산(전 인물·전 책·전 비율)은 별도 배치 스크립트에서 --props 로 조합한다.
          const items: { id: string; width: number; height: number; card: BookCardSpec }[] = [
            { id: "BookCard-intro-4x5", width: 1080, height: 1350, card: { type: "intro" } },
            { id: "BookCard-shelf-4x5", width: 1080, height: 1350, card: { type: "shelf" } },
            { id: "BookCard-cover-4x5", width: 1080, height: 1350, card: { type: "cover", bookIndex: 0 } },
            { id: "BookCard-context-4x5", width: 1080, height: 1350, card: { type: "context", bookIndex: 0, partIndex: 0 } },
            { id: "BookCard-quote-1x1", width: 1080, height: 1080, card: { type: "quote", bookIndex: 0 } },
            {
              id: "BookCard-number-4x5", width: 1080, height: 1350,
              card: { type: "number", value: String(script.books.length), unit: "권의 책", desc: `${who}${josa(who, "이", "가")} 책장에 둔`, tag: `${who}의 서재` },
            },
            { id: "BookCard-cta-4x5", width: 1080, height: 1350, card: { type: "cta" } },
          ];
          // 양산용 범용 컴포지션 — 비율별 1개씩(4:5·1:1·9:16).
          // scripts/render/render-cards.ts 가 still 렌더 시 --props 로 script·episodeName·card 를 주입한다.
          // defaultProps 는 스튜디오 표시용 샘플(첫 책 표지).
          const exportComps: { id: string; width: number; height: number }[] = [
            { id: "BookCard-4x5", width: 1080, height: 1350 },
            { id: "BookCard-1x1", width: 1080, height: 1080 },
            { id: "BookCard-9x16", width: 1080, height: 1920 },
          ];
          return (
            <>
              {items.map(({ id, width, height, card }) => (
                <Composition
                  key={id}
                  id={id}
                  component={BookCard}
                  durationInFrames={1}
                  fps={1}
                  width={width}
                  height={height}
                  defaultProps={{ script, episodeName: ep, card }}
                />
              ))}
              {exportComps.map(({ id, width, height }) => (
                <Composition
                  key={id}
                  id={id}
                  component={BookCard}
                  durationInFrames={1}
                  fps={1}
                  width={width}
                  height={height}
                  defaultProps={{ script, episodeName: ep, card: items[2].card }}
                />
              ))}
            </>
          );
        })()}
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

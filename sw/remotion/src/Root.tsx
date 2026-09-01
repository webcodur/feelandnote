import React from "react";
import { Composition, Folder, type CalculateMetadataFunction } from "remotion";
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
  episodeFolders as factionEpisodeFolders,
  variantsOf as factionVariantsOf,
  loadFactionScript,
  FPS as FACTION_FPS,
} from "./compositions/Faction";
import type { FactionScript, Orientation as FactionOrientation } from "./compositions/Faction/types";
import {
  Discourse,
  calcTotalFrames as calcDiscourseFrames,
  longformPartNumbers as discourseLongformPartNumbers,
  shortsPartNumbers as discourseShortsPartNumbers,
  episodes as discourseEpisodes,
  episodeNames as discourseEpisodeNames,
  FPS as DISCOURSE_FPS,
} from "./compositions/Discourse";
import { FactionCard, type FactionCardSpec } from "./compositions/FactionCard";
import { BookCard, type BookCardSpec, josa } from "./compositions/BookCard";
import { Thumbnail } from "./compositions/Thumbnail/Thumbnail";
import { FactionLVThumbnail } from "./compositions/Thumbnail/FactionLVThumbnail";
import { FactionLVThumbCandidate } from "./compositions/Thumbnail/FactionLVThumbCandidate";
import { BookRecommendLegacy } from "./compositions/BookRecommend/legacy/BookRecommendLongLegacy";
import { factionCompBase } from "@feelandnote/shared/lib/youtube-faction-meta";
// 가상 담화 컴포지션 ID 앞머리(`Discourse-<폴더명>`) — 26.07.26 packages/shared 로 승격해 단일원천화.
// 이 파일의 등록 규칙과 왕복 검증(scripts/discourse/verify.ts ③)이 같은 함수를 쓴다.
import { discourseCompBase } from "@feelandnote/shared/lib/youtube-discourse-meta";
import { BookPersonShort, calcBookPersonFrames, FPS as BOOK_PERSON_FPS } from "./compositions/BookPerson/BookPersonShort";
import { bookPersonCompId } from "./compositions/BookPerson/types";
import { episodes as bookPersonEpisodes } from "./compositions/BookPerson/script";
import { Ranking } from "./compositions/Ranking/Ranking";
import { episodes as rankingEpisodes, episodeNames as rankingEpisodeNames } from "./compositions/Ranking/script";
import { rankingCompId, rankingThumbId } from "./compositions/Ranking/types";
import { calcTotalFrames as calcRankingFrames, FPS as RANKING_FPS } from "./compositions/Ranking/timing";

/* ────────────────────────── 세력도감 — 편 파일은 컴포지션을 열 때 읽는다 ────────────────────────── */

/** Faction 컴포넌트 props 와 같은 모양 — orientation·shorts 기본값 해석도 컴포넌트와 같아야 길이가 어긋나지 않는다. */
type FactionCompProps = {
  script?: FactionScript
  episodeName: string
  orientation?: FactionOrientation
  shorts?: boolean
  part?: number
  lvPart?: number
}

/**
 * 세력도감 본편 — 컴포지션을 열거나 렌더할 때 그 편의 faction-data.json 만 읽어 길이를 정한다.
 * 편 본문이 번들에 없으므로 백오피스 저장이 webpack 재빌드를 부르지 않는다. 저장 뒤엔 Studio 새로고침이면 된다.
 * `--props` 로 script 를 직접 넘긴 렌더는 그 값을 그대로 쓴다.
 */
const factionMetadata: CalculateMetadataFunction<FactionCompProps> = async ({ props }) => {
  const script = props.script ?? await loadFactionScript(props.episodeName, false)
  // Faction.tsx 와 같은 해석 — shorts 미지정이면 세로가 곧 쇼츠다.
  const isShorts = props.shorts ?? (props.orientation ?? 'portrait') === 'portrait'
  const durationInFrames = calcFactionFrames(
    script,
    isShorts,
    isShorts ? props.part : undefined,
    isShorts ? undefined : props.lvPart,
  )
  if (!Number.isFinite(durationInFrames) || durationInFrames <= 0) {
    throw new Error(`${props.episodeName}: 이 변형에는 컷이 없다 (shorts=${isShorts} part=${props.part ?? '-'} lvPart=${props.lvPart ?? '-'})`)
  }
  return { durationInFrames, props: { ...props, script } }
}

type FactionStillProps = { script?: FactionScript; episodeName: string }
/** 썸네일 1프레임 — 길이는 고정, 편 파일만 읽어 넣는다. */
const factionStillMetadata: CalculateMetadataFunction<FactionStillProps> = async ({ props }) => ({
  props: { ...props, script: props.script ?? await loadFactionScript(props.episodeName, false) },
})

type FactionCardCompProps = { script?: FactionScript; episodeName: string; card: FactionCardSpec; assetBase?: string }
/** 카드뉴스 still — 백오피스 내보내기는 --props 로 script 를 함께 넘기고, Studio 표시용은 편 파일을 읽는다. */
const factionCardMetadata: CalculateMetadataFunction<FactionCardCompProps> = async ({ props }) => ({
  props: { ...props, script: props.script ?? await loadFactionScript(props.episodeName, false) },
})
const FactionCardComp: React.FC<FactionCardCompProps> = (p) => (
  p.script ? <FactionCard card={p.card} script={p.script} episodeName={p.episodeName} assetBase={p.assetBase} /> : null
)

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

      {/* === 세력도감 === */}
      <Folder name="Faction">
        {factionEpisodeFolders.map((ep) => {
          const base = factionCompBase(ep)
          // 편별 변형 목록(faction-variants.json)이 곧 컴포지션 목록이다 — 접미사 규칙(KO-S{n}·KO-LV{n})은
          // @feelandnote/shared 의 factionVariants 가 단일원천이라 렌더·유튜브 스크립트와 어긋나지 않는다.
          // 길이는 컴포지션을 열 때 factionMetadata 가 편 파일을 읽어 정한다.
          const variants = factionVariantsOf(ep)
          const ordered = [...variants.filter((v) => v.isShorts), ...variants.filter((v) => !v.isShorts)]
          return (
            <Folder key={ep} name={ep}>
              {/* KO-S{n} — 한국어 세로 쇼츠 · KO-LV{n} — 한국어 세로 롱폼 (1080x1920) */}
              {ordered.map((v) => (
                <Composition
                  key={`${base}-${v.fileSuffix}`}
                  id={`${base}-${v.fileSuffix}`}
                  component={Faction}
                  calculateMetadata={factionMetadata}
                  fps={FACTION_FPS}
                  width={1080}
                  height={1920}
                  defaultProps={{ episodeName: ep, orientation: 'portrait' as const, shorts: v.isShorts, part: v.part, lvPart: v.lvPart }}
                />
              ))}
              {/* KO-LV-GEM — 한국어 세로 롱폼 썸네일 */}
              <Composition
                id={`${base}-KO-LV-GEM`}
                component={FactionLVThumbnail}
                calculateMetadata={factionStillMetadata}
                durationInFrames={1}
                fps={1}
                width={1080}
                height={1920}
                defaultProps={{ episodeName: ep }}
              />
              {/* KO-LV-TH — 한국어 세로 롱폼 썸네일 (채택안) */}
              <Composition
                id={`${base}-KO-LV-TH`}
                component={FactionLVThumbCandidate}
                calculateMetadata={factionStillMetadata}
                durationInFrames={1}
                fps={1}
                width={1080}
                height={1920}
                defaultProps={{ episodeName: ep }}
              />
              {/* KO-LH — 한국어 가로 롱폼 (1920x1080, 전체) */}
              <Composition
                id={`${base}-KO-LH`}
                component={Faction}
                calculateMetadata={factionMetadata}
                fps={FACTION_FPS}
                width={1920}
                height={1080}
                defaultProps={{ episodeName: ep, orientation: 'landscape' as const, shorts: false }}
              />
              {/* EN(영문) — 지금 미사용. 필요하면 loadFactionScript(ep, true) 를 쓰는 metadata 를 하나 더 두고 아래처럼 등록한다.
              <Composition id={`${base}-EN-LV`} component={Faction} calculateMetadata={factionMetadataEn} fps={FACTION_FPS} width={1080} height={1920} defaultProps={{ episodeName: ep, orientation: 'portrait' as const, shorts: false }} />
              */}
            </Folder>
          )
        })}
      </Folder>

      {/* === 세력도감 카드뉴스 (still 추출) === */}
      <Folder name="FactionCard">
        {(() => {
          const ep = "Digital-Resistance";
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
                  component={FactionCardComp}
                  calculateMetadata={factionCardMetadata}
                  durationInFrames={1}
                  fps={1}
                  width={1080}
                  height={1350}
                  defaultProps={{ episodeName: ep, card }}
                />
              ))}
              {exportComps.map(({ id, width, height }) => (
                <Composition
                  key={id}
                  id={id}
                  component={FactionCardComp}
                  calculateMetadata={factionCardMetadata}
                  durationInFrames={1}
                  fps={1}
                  width={width}
                  height={height}
                  defaultProps={{ episodeName: ep, card: cards[0].card }}
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

      {/* === 책과 사람 === */}
      <Folder name="BookPerson">
        {Object.entries(bookPersonEpisodes).map(([name, script]) => {
          const dur = calcBookPersonFrames(script)
          if (!Number.isFinite(dur) || dur <= 0) return null
          return (
            <Composition
              key={name}
              id={bookPersonCompId(name)}
              component={BookPersonShort}
              durationInFrames={dur}
              fps={BOOK_PERSON_FPS}
              width={1080}
              height={1920}
              defaultProps={{ script, episodeName: name }}
            />
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

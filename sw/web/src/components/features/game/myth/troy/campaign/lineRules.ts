/*
  파일명: components/features/game/myth/troy/campaign/lineRules.ts
  기능: 인물 고유 대사가 지금 장면에 맞는지 가리기
  책임: DB 대사(celeb_dialogues)는 인물마다 『일리아스』의 특정 장면을 떠올리며 쓴 줄이 많다. 줄에 든 이름과 말(배·성문·밤·빌린 갑옷…)을
        보고, 지금 장의 배경·이야기에서 죽은 인물·곁의 우리 편·싸우는 상대와 맞는 줄만 남긴다. 순수 계산이라 시험할 수 있다.
*/ // ------------------------------
import type { MythLineSituation } from "../../shared/types";

// 지금 장면에 대해 아는 것
export interface LineScene {
  // 장 배경(ships·wall·gate·night·sack·oath…)과 판 상황(ajax·fallen-comrade)
  tags: string[];
  // 이야기에서 이미 죽은 인물(추모·복수 줄은 이 이름만 부른다)
  dead: string[];
  // 이 장에서 방금 있었던 일의 인물(이긴 뒤 한마디가 불러도 되는 이름)
  echo: string[];
  // 함께 나선 우리 편(부르는 줄은 곁에 있을 때만)
  allies: string[];
}

export interface CastName {
  slug: string;
  names: string[];
}

export interface LineAsk {
  speaker: string;
  situation: MythLineSituation;
  // 싸움 외침을 듣는 상대
  target?: string | null;
}

// 기도·맹세로 부르는 신 — 싸움 외침·대답에서는 상대가 아니다
const INVOKED = new Set(["zeus", "hera", "athena", "apollo", "aphrodite", "ares", "hermes", "poseidon", "artemis", "hephaestus", "thetis", "iris"]);
// 이 게임의 장면에 없는 일(돌론 습격의 레소스, 1권의 역병, 『오디세이아』의 괴수, 23권 장례 경기)
const NEVER = /레소스|역병|괴수|새를 꿰뚫|사과한다면|느린 말|Rhesus|plague|monster|the bird|apologizes|slower horse/i;
// 이 말이 들면 그 배경·상황이 있어야 한다
const NEEDS: [RegExp, string][] = [
  [/함선|\bships?\b/i, "ships"],
  [/성문|\bgates?\b/i, "gate"],
  [/성벽|\bwall\b/i, "wall"],
  [/밤의 습격|night raid/i, "night"],
  [/미르미돈|Myrmidon/i, "myrmidons"],
  [/다시 전장|field again/i, "returned"],
  [/갑옷|돌아갔어야|\barmor\b|turned back/i, "borrowed-armor"],
  [/맹세|\boath\b/i, "oath"],
  [/여신도|goddess bleeds/i, "goddess-wounded"],
  [/방패가 열릴|방패를 열어|shield parted|open the shield/i, "ajax"],
  [/동료의 몸|전우의 몸|comrade's body/i, "fallen-comrade"],
  [/가족의 길|트로이의 불|다시 세우|my family|Troy's fire|rebuild/i, "sack"],
];
// 떠난 사람을 두고 하는 말(복수·추모) — 든 이름이 이미 죽었어야 한다
const MEMORIAL = /복수|원수|값을 받|죽었|돌아오지 않|없소|avenge|owed|died|is dead|does not come back|left to defend/i;
// 「네스토르의 아들」「son of Nestor」 같은 부칭은 그 사람이 곁에 없어도 된다
const PATRONYMIC = /\S+의 아들|son of \S+/g;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// 영어 이름은 낱말 경계로만 찾는다(Hera ≠ Heracles). 한국어는 조사가 붙으므로 그대로 찾는다
const pattern = (token: string) => (/[A-Za-z]$/.test(token) ? new RegExp(`(?<![A-Za-z])${escape(token)}(?![A-Za-z])`, "g") : new RegExp(escape(token), "g"));

// 줄에 이름이 든 인물. 이름 하나에 여럿이 걸리면(두 아이아스의 「아이아스」) 한 묶음으로 돌려준다.
// 긴 이름부터 지워 「아가멤논」 안의 「멤논」을 따로 세지 않고, 제 이름·부칭은 뺀다
export function mentioned(text: string, speaker: string, cast: CastName[]): string[][] {
  const own = cast.find((c) => c.slug === speaker)?.names ?? [];
  const tokens = [...new Set(cast.flatMap((c) => c.names))].sort((a, b) => [...b].length - [...a].length);
  let rest = text.replace(PATRONYMIC, "\u0000");
  const groups: string[][] = [];
  for (const token of tokens) {
    const re = pattern(token);
    if (!re.test(rest)) continue;
    rest = rest.replace(pattern(token), "\u0000");
    if (own.includes(token)) continue;
    const who = cast.filter((c) => c.slug !== speaker && c.names.includes(token)).map((c) => c.slug);
    if (who.length > 0) groups.push(who);
  }
  return groups;
}

function mentionOk(slug: string, ask: LineAsk, scene: LineScene, memorial: boolean): boolean {
  if (memorial) return scene.dead.includes(slug);
  const alive = scene.allies.includes(slug) && !scene.dead.includes(slug);
  if (ask.situation === "clash_attack") return INVOKED.has(slug) || slug === ask.target || alive;
  if (ask.situation === "roll_call") return INVOKED.has(slug) || alive;
  // 이긴 뒤 한마디는 이 장에서 방금 있었던 일의 인물만 부른다
  return scene.echo.includes(slug);
}

export function lineFits(text: string, ask: LineAsk, scene: LineScene, cast: CastName[]): boolean {
  if (NEVER.test(text)) return false;
  if (NEEDS.some(([re, tag]) => re.test(text) && !scene.tags.includes(tag))) return false;
  const memorial = MEMORIAL.test(text);
  return mentioned(text, ask.speaker, cast).every((group) => group.some((slug) => mentionOk(slug, ask, scene, memorial)));
}

// 맞는 줄 가운데 상대 이름을 부르는 줄이 있으면 그 줄을 먼저 쓴다(「헥토르! 달아날 곳은 없다!」). roll은 0 이상 1 미만
export function pickFitting(lines: string[], ask: LineAsk, scene: LineScene, cast: CastName[], roll: number): string | null {
  const fits = lines.filter((text) => lineFits(text, ask, scene, cast));
  const target = ask.target;
  const aimed = target ? fits.filter((text) => mentioned(text, ask.speaker, cast).some((group) => group.includes(target))) : [];
  const choices = aimed.length > 0 ? aimed : fits;
  return choices.length > 0 ? choices[Math.min(choices.length - 1, Math.floor(roll * choices.length))] : null;
}

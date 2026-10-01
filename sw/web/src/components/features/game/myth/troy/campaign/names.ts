/*
  파일명: components/features/game/myth/troy/campaign/names.ts
  기능: 트로이 전쟁 인물·병사 이름 예비값
  책임: DB 연결이 없거나(표본 모드) 이름을 못 받았을 때 쓸 이름을 쥔다. 인물 이름은 DB 표기(celebs.nickname)를 그대로 옮겼다.
        화면은 DB 이름을 먼저 쓰고, 없을 때만 이 표를 본다. 병사 이름은 DB에 없으므로 이 표가 원천이다.
*/ // ------------------------------
import type { StoryLocale } from "../story/types";

type Names = Record<StoryLocale, string>;

export const FIGURE_NAMES: Record<string, Names> = {
  "achilles": { ko: "아킬레우스", en: "Achilles" },
  "aeneas": { ko: "아이네이아스", en: "Aeneas" },
  "agamemnon": { ko: "아가멤논", en: "Agamemnon" },
  "ajax-the-great": { ko: "대 아이아스", en: "Ajax the Great" },
  "ajax-the-lesser": { ko: "소 아이아스", en: "Ajax the Lesser" },
  "andromache": { ko: "안드로마케", en: "Andromache" },
  "antilochus": { ko: "안틸로코스", en: "Antilochus" },
  "aphrodite": { ko: "아프로디테", en: "Aphrodite" },
  "apollo": { ko: "아폴론", en: "Apollo" },
  "ares": { ko: "아레스", en: "Ares" },
  "artemis": { ko: "아르테미스", en: "Artemis" },
  "astyanax": { ko: "아스티아낙스", en: "Astyanax" },
  "athena": { ko: "아테나", en: "Athena" },
  "briseis": { ko: "브리세이스", en: "Briseis" },
  "calchas": { ko: "칼카스", en: "Calchas" },
  "cassandra": { ko: "카산드라", en: "Cassandra" },
  "chryseis": { ko: "크리세이스", en: "Chryseis" },
  "deiphobus": { ko: "데이포보스", en: "Deiphobus" },
  "diomedes": { ko: "디오메데스", en: "Diomedes" },
  "dolon": { ko: "돌론", en: "Dolon" },
  "glaucus": { ko: "글라우코스", en: "Glaucus" },
  "hector": { ko: "헥토르", en: "Hector" },
  "hecuba": { ko: "헤카베", en: "Hecuba" },
  "helen-of-troy": { ko: "트로이의 헬레네", en: "Helen of Troy" },
  "helenus": { ko: "헬레노스", en: "Helenus" },
  "hephaestus": { ko: "헤파이스토스", en: "Hephaestus" },
  "hera": { ko: "헤라", en: "Hera" },
  "hermes": { ko: "헤르메스", en: "Hermes" },
  "idomeneus": { ko: "이도메네우스", en: "Idomeneus" },
  "iris": { ko: "이리스", en: "Iris" },
  "machaon": { ko: "마카온", en: "Machaon" },
  "memnon": { ko: "멤논", en: "Memnon" },
  "menelaus": { ko: "메넬라오스", en: "Menelaus" },
  "meriones": { ko: "메리오네스", en: "Meriones" },
  "nestor": { ko: "네스토르", en: "Nestor" },
  "odysseus": { ko: "오디세우스", en: "Odysseus" },
  "pandarus": { ko: "판다로스", en: "Pandarus" },
  "paris": { ko: "파리스", en: "Paris" },
  "patroclus": { ko: "파트로클로스", en: "Patroclus" },
  "penthesilea": { ko: "펜테실레이아", en: "Penthesilea" },
  "phoenix": { ko: "포이닉스", en: "Phoenix" },
  "polydamas": { ko: "폴리다마스", en: "Polydamas" },
  "poseidon": { ko: "포세이돈", en: "Poseidon" },
  "priam": { ko: "프리아모스", en: "Priam" },
  "sarpedon-of-lycia": { ko: "리키아의 사르페돈", en: "Sarpedon of Lycia" },
  "scamander": { ko: "스카만드로스", en: "Scamander" },
  "teucer": { ko: "테우크로스", en: "Teucer" },
  "thetis": { ko: "테티스", en: "Thetis" },
  "zeus": { ko: "제우스", en: "Zeus" },
};

export const SOLDIER_NAMES: Record<string, Names> = {
  "trojan-soldier": { ko: "트로이 병사", en: "Trojan Soldier" },
  "trojan-archer": { ko: "트로이 궁수", en: "Trojan Archer" },
  "trojan-chariot": { ko: "트로이 전차", en: "Trojan Chariot" },
  "trojan-guard": { ko: "트로이 파수꾼", en: "Trojan Sentry" },
  lycian: { ko: "리키아 병사", en: "Lycian Soldier" },
  amazon: { ko: "아마존 전사", en: "Amazon Warrior" },
  aethiopian: { ko: "아이티오피아 병사", en: "Aethiopian Soldier" },
  myrmidon: { ko: "미르미돈 병사", en: "Myrmidon" },
  "achaean-soldier": { ko: "아카이아 병사", en: "Achaean Soldier" },
};

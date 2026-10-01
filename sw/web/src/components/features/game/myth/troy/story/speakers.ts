/*
  파일명: components/features/game/myth/troy/story/speakers.ts
  기능: 트로이 전쟁 이야기의 DB 밖 화자 이름표
  책임: 병사·전령·시논처럼 DB 인물이 아닌 말하는 사람의 이름을 언어별로 쥔다.
        장면 줄의 speaker가 DB 인물 slug가 아니면 이 표의 키다. 서술은 speaker: null이라 여기 없다.
*/ // ------------------------------

export const SPEAKERS: Record<string, { ko: string; en: string }> = {
  "trojan-soldier": { ko: "트로이 병사", en: "Trojan Soldier" },
  "achaean-soldier": { ko: "아카이아 병사", en: "Achaean Soldier" },
  // 아킬레우스의 부하
  myrmidon: { ko: "미르미돈 병사", en: "Myrmidon" },
  amazon: { ko: "아마존 전사", en: "Amazon Warrior" },
  aethiopian: { ko: "아이티오피아 병사", en: "Aethiopian Soldier" },
  herald: { ko: "전령", en: "Herald" },
  // 목마 곁에 남아 트로이 사람들을 속인 그리스 사람
  sinon: { ko: "시논", en: "Sinon" },
  // 아테나의 도움으로 목마를 지은 목수
  epeius: { ko: "에페이오스", en: "Epeius" },
};

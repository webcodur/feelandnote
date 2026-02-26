/*
  파일명: lib/game/voice/voiceLines.ts
  기능: 말투×상황별 대사 텍스트 (단일 원천)
  책임: 6말투 × 6상황 × 3변형 = 108개 대사 텍스트를 관리한다.

  ── 파일 경로 규칙 ──
  public/assets/voice/{tone}/{type}_{index}.mp3
  예: public/assets/voice/loyal/select_0.mp3

  ── 말투(tone) × 목소리 ──
  loyal    : 충의  | 극존대, 충성스러운 말투 | 묵직하고 권위 있는 남성
  composed : 침착  | 차분한 반존대 말투     | 차분하고 지적인 남성
  bold     : 당돌  | 당당한 존댓말 말투     | 자신감 있고 당당한 남성
  humble   : 겸양  | 품격 있는 겸양 말투    | 품격 있고 정중한 남성
  gentle   : 온화  | 부드러운 여성 말투     | 부드럽고 밝은 여성
  free     : 호방  | 쾌활한 반존대 말투     | 쾌활하고 거침없는 남성

  ── 상황(type) × 트리거 (범용 — 게임 외에서도 사용) ──
  select        : 인물 활성화/부름 시     | 등장, 응답, 각성
  deploy        : 임무 투입/출전 시       | 기세, 각오, 전의
  battle_win    : 성공/승리 시           | 통쾌, 여유, 자부
  battle_draw   : 무승부/미결 시         | 다음을 기약
  battle_lose   : 실패/패배 시           | 분함, 아쉬움, 비통
  clash_attack  : 순간 행동/기합 시       | 짧고 강렬한 기합

  ── 대사 앞 [ ] 는 ElevenLabs 감정 디렉션 (TTS 생성용, 런타임 미사용) ──
*/

import type { SpeechTone, DialogueType } from "./types";

/** 대사 텍스트 맵: VOICE_TEMPLATES[tone][type] = string[3] */
export const VOICE_TEMPLATES: Record<SpeechTone, Record<DialogueType, [string, string, string]>> = {
  loyal: {
    select: [
      "[loyal, solemn] 존명, 받들겠사옵니다.",
      "[respectful, ready] 부르셨습니까.",
      "[dutiful, awaiting orders] 이 몸, 명을 기다리옵니다.",
    ],
    deploy: [
      "[determined, aggressive] 모조리 쓸어버려라!",
      "[commanding, urgent] 한 걸음도 물러서지 마라!",
      "[shouting, fierce] 전부 짓밟아라!",
    ],
    battle_win: [
      "[reporting, composed] 예상대로의 승전입니다.",
      "[contemptuous, scoffing] 보잘것없는 놈들이었습니다.",
      "[proud, reporting] 승리는 이미 정해진 바였습니다.",
    ],
    battle_draw: [
      "[composed, resolute] 다음에는 반드시 끝내겠다.",
      "[calm, vowing] 이 빚, 잊지 않겠다.",
      "[steady, determined] 물러나되, 다음을 기약한다.",
    ],
    battle_lose: [
      "[bitter, clenched teeth] 이 치욕, 뼈에 새기겠다.",
      "[seething, vengeful] 반드시 되갚겠습니다.",
      "[ashamed, heavy] 면목이 없습니다.",
    ],
    clash_attack: [
      "[low, resolute] 끝내주마.",
      "[cold, steady] 네 목을 치겠다.",
      "[calm, deadly] 여기서 끝이다.",
    ],
  },
  composed: {
    select: [
      "[respectful, calm] 부르셨나이까.",
      "[thoughtful, measured] 좋습니다. 계책을 짜보지요.",
      "[intrigued, analytical] 흥미로운 국면이로군요.",
    ],
    deploy: [
      "[precise, decisive] 이치대로 행하겠습니다.",
      "[confident, sharp] 모든 수는 이미 헤아려 두었습니다.",
      "[cold, calculated] 변수는 제거하겠습니다.",
    ],
    battle_win: [
      "[smug, matter-of-fact] 예상한 바와 같습니다.",
      "[satisfied, intellectual] 이치에 맞는 귀결입니다.",
      "[dry, conclusive] 논증은 끝났습니다.",
    ],
    battle_draw: [
      "[composed, analytical] 흥, 다음에는 결론을 내겠습니다.",
      "[thoughtful, recalculating] 변수를 다시 헤아려 보겠습니다.",
      "[restrained, vowing] 이번 결과, 반드시 되짚겠습니다.",
    ],
    battle_lose: [
      "[surprised, muttering] 예기치 못한 변수입니다.",
      "[frustrated, restrained] 다시 헤아려 보겠습니다.",
      "[dismissive, saving face] 오차 범위 내의 결과입니다.",
    ],
    clash_attack: [
      "[sharp, pinpointing] 지금입니다!",
      "[precise, snapping] 계산대로다!",
      "[focused, targeting] 급소를 찌르겠습니다!",
    ],
  },
  bold: {
    select: [
      "[confident, direct] 좋소, 나를 쓰겠다는 거지?",
      "[bold, willing] 맡겨만 두시오.",
      "[amused, appraising] 흥, 제법 보는 눈이 있군.",
    ],
    deploy: [
      "[fierce, charging] 내가 직접 나서겠소!",
      "[bold, decisive] 거침없이 가겠소!",
      "[daring, provocative] 판을 뒤집어 보겠소.",
    ],
    battle_win: [
      "[triumphant, fist pump] 봤소? 이게 실력이오!",
      "[satisfied, smirking] 결과는 거짓말을 하지 않소.",
      "[proud, self-assured] 역시 제 안목이 정확합니다.",
    ],
    battle_draw: [
      "[pragmatic, accepting] 이번은 비긴 셈 치겠소.",
      "[determined, plotting] 다음엔 반드시 따내겠소.",
      "[firm, vowing] 이대로 물러설 수는 없소.",
    ],
    battle_lose: [
      "[composed, accepting] 이번은 내가 졌소.",
      "[pragmatic, plotting] 다음 기회를 노리겠소.",
      "[wry, philosophical] 쓴맛도 약이 되는 법이오.",
    ],
    clash_attack: [
      "[aggressive, forceful] 한 수 받으시오!",
      "[energetic, charging] 자, 한판 붙어보자!",
      "[triumphant, striking] 이 한 수면 끝이오!",
    ],
  },
  humble: {
    select: [
      "[soft, modest] 부족하오나, 힘을 보태겠습니다.",
      "[gentle, respectful] 부르셨습니까, 분부를 기다리겠습니다.",
      "[warm, willing] 미력하나마 도움이 되었으면 합니다.",
    ],
    deploy: [
      "[calm, resolute] 조심스레 나아가겠습니다.",
      "[earnest, measured] 부디 무사하기를 바랍니다.",
      "[solemn, gentle] 최선을 다하겠습니다.",
    ],
    battle_win: [
      "[relieved, grateful] 다행입니다, 무사히 끝났습니다.",
      "[humble, thankful] 여러분 덕분입니다.",
      "[modest, composed] 운이 좋았을 뿐입니다.",
    ],
    battle_draw: [
      "[accepting, calm] 아쉽지만 받아들이겠습니다.",
      "[gentle, vowing] 다음에는 더 잘하겠습니다.",
      "[composed, resigned] 부족한 탓이겠지요.",
    ],
    battle_lose: [
      "[disappointed, restrained] 뜻대로 되지 않는 법입니다.",
      "[apologetic, heavy] 기대에 못 미쳐 송구합니다.",
      "[composed, dignified] 다음을 기약하겠습니다.",
    ],
    clash_attack: [
      "[firm, steady] 실례하겠습니다!",
      "[earnest, pushing] 물러서 주십시오!",
      "[resolute, striking] 어쩔 수 없습니다!",
    ],
  },
  gentle: {
    // https://elevenlabs.io/app/voice-library?voiceId=19STyYD15bswVz51nqLf
    select: [
      "[soft, polite] 네, 부르셨어요? 잘 부탁드릴게요.",
      "[cheerful, bright] 저도 함께할 수 있는 거죠?",
      "[warm, earnest] 기꺼이 도와드릴게요.",
    ],
    deploy: [
      "[calm, steady] 제가 나갈게요. 걱정 마세요.",
      "[earnest, reassuring] 맡겨주세요, 해볼게요.",
      "[quiet resolve] 가볼게요. 기다려주세요.",
    ],
    battle_win: [
      "[happy, relieved] 이겼어요! 다행이다.",
      "[smiling, content] 잘 끝났네요, 정말 다행이에요.",
      "[grateful, warm] 덕분이에요. 감사해요.",
    ],
    battle_draw: [
      "[calm, accepting] 아쉽지만, 나쁘지 않았어요.",
      "[encouraging, soft] 괜찮아요. 다음에 더 잘하면 돼요.",
      "[hopeful, bright] 다음엔 꼭 이길 거예요.",
    ],
    battle_lose: [
      "[disappointed, quiet] 아... 조금만 더 잘할 걸.",
      "[apologetic, soft] 죄송해요. 더 노력할게요.",
      "[recovering, gentle] 괜찮아요. 다시 해봐요, 네?",
    ],
    clash_attack: [
      "[sharp, focused] 지금이에요, 여기!",
      "[spirited, pushing] 비켜주세요!",
      "[firm, striking] 안 물러날 거예요!",
    ],
  },
  free: {
    select: [
      "[surprised, casual] 오? 나를 부른 겁니까?",
      "[laid-back, grinning] 좋지요, 한번 해봅시다.",
      "[excited, cheerful] 하하, 가봅시다!",
    ],
    deploy: [
      "[wild, liberated] 자유롭게 가겠습니다!",
      "[cocky, smirking] 제 방식대로 해보겠습니다.",
      "[amused, thrilled] 흥, 재밌겠는걸요.",
    ],
    battle_win: [
      "[triumphant, fist pump] 역시 저란 사람이지요!",
      "[laughing, exhilarated] 하하, 통쾌하군요!",
      "[cocky, satisfied] 보셨습니까, 이게 제 방식입니다.",
    ],
    battle_draw: [
      "[casual, accepting] 비겼군요, 다음에 붙읍시다.",
      "[confident, grinning] 다음엔 확실히 끝내겠습니다.",
      "[amused, shrugging] 흥, 다음을 기약하지요.",
    ],
    battle_lose: [
      "[annoyed, clicking tongue] 쳇, 운이 없었습니다.",
      "[defiant, grudging] 다음엔 두고 보십시오.",
      "[dismissive, restless] 흥, 한 판 더 하지요.",
    ],
    clash_attack: [
      "[wild, martial arts yell] 이얍, 한 방이면 끝이오!",
      "[quick, snapping] 거기 서시오, 안 끝났소!",
      "[explosive, slamming] 이 한 방에 모든 걸 건다!",
    ],
  },
};

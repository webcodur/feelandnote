/*
  파일명: components/features/game/myth/troy/story/ch09.ts
  기능: 트로이 전쟁 9장 「스카이아이 문」 이야기(한국어·영어)
  책임: 『아이티오피스』·『소일리아스』(프로클로스 요약)·아폴로도로스 요약편 5.3~8·『오디세이아』 24권 36~94행을 따라 싸움 전·중·뒤 장면을 적는다.
        파트로클로스가 산 길과 죽은 길 모두에 쓰도록 파트로클로스는 말하지 않는다(뼈를 함께 묻은 대목도 뺐다).
*/ // ------------------------------
import type { ChapterStoryBook } from "./types";

export const CH09: ChapterStoryBook = {
  // #region 한국어
  ko: {
    title: "스카이아이 문",
    source: "『아이티오피스』, 아폴로도로스 요약편 5.3~8, 『오디세이아』 24권",
    summary: "아킬레우스가 트로이군을 쫓아 스카이아이 문에 이른다. 헥토르가 죽으며 남긴 말이 이루어질 때가 왔다.",
    objective: "대 아이아스가 아킬레우스의 주검을 메고 배에 닿는다.",
    loss: "대 아이아스가 쓰러진다.",
    // 프로클로스 요약(아킬레우스가 트로이군을 쫓아 성으로 들어가다 파리스와 아폴론에게 죽는다). 오디세우스·아이아스의 말은 이음 대사
    intro: { id: "intro", lines: [
      { speaker: null, text: "멤논이 쓰러지자 트로이군이 성으로 달아났다." },
      { speaker: null, text: "아킬레우스가 그 뒤를 쫓았다. 발 빠른 아킬레우스를 따라잡을 사람은 없었다." },
      { speaker: null, text: "앞에 스카이아이 문이 있었다. 헥토르가 죽으며 이름을 댄 바로 그 문이었다.", tone: "grief" },
      { speaker: "achilles", text: "문이 닫히기 전에 들어간다. 오늘 트로이를 끝내겠다!", tone: "fierce" },
      { speaker: "odysseus", text: "아킬레우스, 너무 앞서지 말게! 뒤가 끊기네!", tone: "cunning" },
      { speaker: "ajax-the-great", text: "내가 따라붙겠네. 오디세우스, 자네는 뒤를 맡게.", tone: "calm" },
      { speaker: null, text: "성벽 위에서 파리스가 활시위를 당겼다. 그 곁에 아폴론이 서 있었다.", tone: "awe" },
    ] },
    scenes: [
      // 요약편 5.3(발목에 맞은 화살), 프로클로스 요약(주검을 둘러싼 싸움, 아이아스가 주검을 메고 배로 간다)
      { id: "achilles-falls", lines: [
        { speaker: null, text: "화살이 날아가 아킬레우스의 발목에 꽂혔다. 아폴론이 이끈 화살이었다.", tone: "awe" },
        { speaker: null, text: "아킬레우스가 스카이아이 문 앞에 쓰러졌다. 헥토르가 말한 그대로였다.", tone: "grief" },
        { speaker: "ajax-the-great", text: "아킬레우스! 이 사람을 트로이 놈들 손에 넘길 수는 없다.", tone: "grief" },
        { speaker: null, text: "대 아이아스가 주검을 어깨에 메었다. 트로이군이 주검을 빼앗으려 몰려들었다." },
      ] },
      // 요약편 5.4(주검을 둘러싼 싸움에서 아이아스가 글라우코스를 죽였다)
      { id: "glaucus-falls", lines: [
        { speaker: null, text: "주검을 둘러싼 싸움 한가운데서 글라우코스가 쓰러졌다." },
        { speaker: null, text: "『일리아스』에서 디오메데스와 무구를 바꾸었던 리키아의 장수였다.", tone: "grief" },
      ] },
      // 프로클로스 요약(오디세우스가 트로이군을 막는다). 말은 이음 대사
      { id: "odysseus-rear", lines: [
        { speaker: "odysseus", text: "아이아스, 뒤는 내게 맡기고 배로만 가게!", tone: "fierce" },
        { speaker: "ajax-the-great", text: "고맙네. 배에서 보세.", tone: "calm" },
      ] },
    ],
    // 『오디세이아』 24.47~84(테티스와 바다 요정들, 아홉 무사, 열이레의 곡, 열여드레째의 화장, 황금 항아리, 헬레스폰토스 곶의 무덤),
    // 『소일리아스』(무구 겨루기, 아이아스의 죽음, 필록테테스가 파리스를 쏨, 헬레네와 데이포보스)
    outro: { id: "outro", lines: [
      { speaker: null, text: "대 아이아스가 주검을 배로 옮겼다. 오디세우스가 끝까지 뒤를 막았다." },
      { speaker: null, text: "바다에서 테티스가 요정들을 데리고 올라와 아들을 두고 곡했다. 그 울음에 아카이아 사람들이 떨었다.", tone: "grief" },
      { speaker: null, text: "무사 여신 아홉이 번갈아 만가를 불렀다. 아카이아 사람들은 열이레 밤낮을 울었다.", tone: "grief" },
      { speaker: null, text: "열여드레째 날 아킬레우스를 불에 태웠다. 뼈는 황금 항아리에 담아 헬레스폰토스 곶의 큰 무덤에 묻었다." },
      { speaker: null, text: "아킬레우스의 무구는 가장 뛰어난 사람에게 주기로 했다. 대 아이아스와 오디세우스가 겨루었고, 무구는 오디세우스에게 돌아갔다." },
      { speaker: null, text: "대 아이아스는 그 일로 제정신을 잃었고, 끝내 스스로 목숨을 끊었다.", tone: "grief" },
      { speaker: null, text: "예언을 따라 렘노스에서 필록테테스를 데려왔다. 필록테테스가 헤라클레스의 활로 파리스를 쏘아 죽였다." },
      { speaker: null, text: "헬레네는 파리스의 아우 데이포보스의 아내가 되었다." },
      { speaker: "odysseus", text: "힘으로는 저 성벽을 넘지 못하네. 이제는 꾀를 써야 하네.", tone: "cunning" },
    ] },
    defeat: { id: "defeat", lines: [
      { speaker: null, text: "대 아이아스가 쓰러졌다. 트로이군이 아킬레우스의 주검을 에워쌌다.", tone: "grief" },
      { speaker: "odysseus", text: "이대로 둘 수는 없다. 다시 가세!", tone: "fierce" },
    ] },
  },
  // #endregion

  // #region 영어
  en: {
    title: "The Scaean Gates",
    source: "The Aethiopis; Apollodorus, Epitome 5.3–8; The Odyssey, Book 24",
    summary: "Achilles chases the Trojans to the Scaean Gates. The words Hector spoke as he died are about to come true.",
    objective: "Ajax the Great carries Achilles' body back to the ships.",
    loss: "Ajax the Great falls.",
    intro: { id: "intro", lines: [
      { speaker: null, text: "With Memnon dead, the Trojans fled for their city." },
      { speaker: null, text: "Achilles ran them down. No one could outrun swift-footed Achilles." },
      { speaker: null, text: "Ahead stood the Scaean Gates, the very gates Hector had named as he died.", tone: "grief" },
      { speaker: "achilles", text: "In before they shut the gates. Today Troy ends!", tone: "fierce" },
      { speaker: "odysseus", text: "Achilles, don't get too far ahead! You'll be cut off!", tone: "cunning" },
      { speaker: "ajax-the-great", text: "I'll stay with him. Odysseus, you watch our backs.", tone: "calm" },
      { speaker: null, text: "On the wall, Paris drew back his bowstring. Apollo stood beside him.", tone: "awe" },
    ] },
    scenes: [
      { id: "achilles-falls", lines: [
        { speaker: null, text: "The arrow flew and struck Achilles in the ankle. Apollo guided it.", tone: "awe" },
        { speaker: null, text: "Achilles fell before the Scaean Gates, just as Hector had said.", tone: "grief" },
        { speaker: "ajax-the-great", text: "Achilles! I won't let the Trojans have him.", tone: "grief" },
        { speaker: null, text: "Ajax the Great lifted the body onto his shoulders. The Trojans surged forward to seize it." },
      ] },
      { id: "glaucus-falls", lines: [
        { speaker: null, text: "In the thick of the fight over the body, Glaucus fell." },
        { speaker: null, text: "He was the Lycian captain who once traded armor with Diomedes in the Iliad.", tone: "grief" },
      ] },
      { id: "odysseus-rear", lines: [
        { speaker: "odysseus", text: "Ajax, leave the rear to me. Just get to the ships!", tone: "fierce" },
        { speaker: "ajax-the-great", text: "Thank you. See you at the ships.", tone: "calm" },
      ] },
    ],
    outro: { id: "outro", lines: [
      { speaker: null, text: "Ajax the Great carried the body to the ships, and Odysseus held the rear to the end." },
      { speaker: null, text: "Thetis rose from the sea with her nymphs and wailed for her son. The Achaeans trembled at the sound.", tone: "grief" },
      { speaker: null, text: "The nine Muses sang the lament in turn, and the Achaeans wept for seventeen days and nights.", tone: "grief" },
      { speaker: null, text: "On the eighteenth day they burned Achilles. His bones went into a golden urn, buried in a great mound on a headland by the Hellespont." },
      { speaker: null, text: "His armor was to go to the best of the Achaeans. Ajax and Odysseus contended for it, and it went to Odysseus." },
      { speaker: null, text: "Ajax lost his mind over it, and in the end took his own life.", tone: "grief" },
      { speaker: null, text: "Following a prophecy, they brought Philoctetes from Lemnos. With the bow of Heracles he shot Paris dead." },
      { speaker: null, text: "Helen became the wife of Deiphobus, Paris's brother." },
      { speaker: "odysseus", text: "Strength won't get us over those walls. Now we need a trick.", tone: "cunning" },
    ] },
    defeat: { id: "defeat", lines: [
      { speaker: null, text: "Ajax the Great fell, and the Trojans closed around the body of Achilles.", tone: "grief" },
      { speaker: "odysseus", text: "We can't leave it like this. Again!", tone: "fierce" },
    ] },
  },
  // #endregion
};

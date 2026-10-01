/*
  파일명: components/features/game/myth/troy/story/ch08.ts
  기능: 트로이 전쟁 8장 「새벽의 아들」 이야기(한국어·영어)
  책임: 『아이티오피스』(프로클로스 요약)·핀다로스 『피티아 송가』 6·『오디세이아』 4권을 따라 싸움 전·중·뒤 장면을 적는다.
        장 자료의 사건이 장면 id로 부른다. 안틸로코스가 죽은 채 이기면 outro, 살아서 이기면 outroAlt(호메로스와 다른 길)를 쓴다.
        파트로클로스가 산 길과 죽은 길 모두에 쓰도록 파트로클로스는 말하지 않는다.
*/ // ------------------------------
import type { ChapterStoryBook } from "./types";

export const CH08: ChapterStoryBook = {
  // #region 한국어
  ko: {
    title: "새벽의 아들",
    source: "『아이티오피스』, 핀다로스 『피티아 송가』 6, 『오디세이아』 4권",
    summary: "새벽의 여신 에오스의 아들 멤논이 아이티오피아군을 이끌고 트로이를 도우러 온다. 여신이 낳은 두 영웅, 아킬레우스와 멤논이 맞수로 만난다.",
    objective: "아이티오피아의 왕 멤논을 쓰러뜨린다.",
    loss: "아킬레우스나 네스토르가 쓰러진다.",
    // 프로클로스 요약(테르시테스 일의 다툼, 레스보스의 정화, 멤논의 도착), 『일리아스』 20권 237행(티토노스), 『오디세이아』 4권 201~202행
    intro: { id: "intro", lines: [
      { speaker: null, text: "테르시테스를 죽인 일로 아카이아 진영에 다툼이 일었다." },
      { speaker: null, text: "아킬레우스는 레스보스로 건너가 아폴론과 아르테미스와 레토에게 제물을 바쳤다. 오디세우스가 그 죄를 씻어 주었다." },
      { speaker: null, text: "얼마 뒤 트로이에 원군이 닿았다. 새벽의 여신 에오스의 아들 멤논이 세상 끝 아이티오피아에서 군사를 이끌고 왔다." },
      { speaker: null, text: "멤논은 헤파이스토스가 만든 갑옷을 입고 있었다. 아버지 티토노스는 프리아모스와 형제였다." },
      { speaker: "memnon", text: "트로이는 내 아버지의 고향이다. 이 땅을 짓밟은 자들을 모두 바다로 몰아내겠다.", tone: "fierce" },
      { speaker: null, text: "아카이아 쪽에서는 늙은 네스토르가 전차를 몰고 나왔다. 아들 안틸로코스도 함께였다." },
      { speaker: null, text: "안틸로코스는 발 빠르고 싸움 잘하기로 이름난 젊은이였다." },
      { speaker: "nestor", text: "얘야, 멤논은 여느 장수와 다르다. 신이 만든 갑옷을 입었으니 섣불리 덤비지 마라.", tone: "calm" },
      { speaker: "antilochus", text: "염려 마십시오, 아버지. 제가 늘 곁을 지키겠습니다.", tone: "calm" },
      { speaker: null, text: "동이 트는 들판으로 여신의 아들 둘이 나섰다. 테티스의 아들 아킬레우스와 에오스의 아들 멤논이었다.", tone: "awe" },
    ] },
    // 테티스의 당부·에오스의 청은 프로클로스 요약, 네스토르의 말과 안틸로코스는 『피티아 송가』 6, 28~42행·『오디세이아』 4권 187~188행
    scenes: [
      { id: "thetis-warns", lines: [
        { speaker: null, text: "싸움에 앞서 테티스가 바다에서 올라와 아들을 찾았다." },
        { speaker: "thetis", text: "얘야, 멤논도 너처럼 여신의 아들이다. 부디 몸조심하거라.", tone: "calm" },
        { speaker: "achilles", text: "어머니, 제 목숨이 길지 않다는 건 저도 압니다. 그래도 물러서지 않겠습니다.", tone: "fierce" },
      ] },
      { id: "nestor-horse", lines: [
        { speaker: null, text: "파리스의 화살이 네스토르의 전차 말에 꽂혔다. 말이 버둥대며 쓰러지자 네스토르는 꼼짝없이 발이 묶였다." },
        { speaker: null, text: "그 틈에 멤논이 큰 창을 휘두르며 달려들었다.", tone: "fierce" },
        { speaker: null, text: "늙은 아버지는 가슴이 철렁해 아들을 소리쳐 불렀다." },
        { speaker: "nestor", text: "안틸로코스! 얘야, 어서 오너라!", tone: "fierce" },
        { speaker: "antilochus", text: "아버지, 지금 갑니다!", tone: "fierce" },
      ] },
      { id: "antilochus-falls", lines: [
        { speaker: null, text: "안틸로코스는 물러서지 않았다. 제 몸으로 아버지 앞을 막아섰다." },
        { speaker: null, text: "빛나는 새벽의 아들이 큰 창을 내질렀다. 나무랄 데 없는 안틸로코스가 쓰러졌다.", tone: "grief" },
        { speaker: null, text: "아들은 제 목숨과 맞바꿔 아버지를 살렸다.", tone: "grief" },
        { speaker: null, text: "그 시절 사람들은 부모를 섬기는 데 그만한 젊은이가 없다고 여겼다." },
        { speaker: "achilles", text: "멤논, 네 맞수는 나다!", tone: "fierce" },
      ] },
      { id: "memnon-falls", lines: [
        { speaker: "aethiopian", text: "왕께서 쓰러지셨다!", tone: "grief" },
        { speaker: null, text: "헤파이스토스가 만든 갑옷도 새벽의 아들을 지켜 주지 못했다.", tone: "grief" },
        { speaker: null, text: "에오스가 제우스에게 아들을 영원히 살게 해 달라고 빌었다.", tone: "grief" },
        { speaker: null, text: "제우스가 허락하자, 에오스는 아들에게 죽지 않는 삶을 주었다.", tone: "awe" },
      ] },
    ],
    // 안틸로코스가 죽은 길 — 프로클로스 요약(아킬레우스가 트로이군을 몰아냄), 헥토르의 예언은 『일리아스』 22권 359~360행
    outro: { id: "outro", lines: [
      { speaker: null, text: "왕을 잃은 아이티오피아군이 무너졌다. 트로이군도 등을 돌렸다." },
      { speaker: null, text: "네스토르는 아들의 주검 앞에서 울었다.", tone: "grief" },
      { speaker: "nestor", text: "발 빠르고 싸움 잘하던 내 아들아. 이 늙은 아비를 살리려고 네가 먼저 갔구나.", tone: "grief" },
      { speaker: null, text: "안틸로코스는 아킬레우스가 아끼던 벗이었다." },
      { speaker: "achilles", text: "안틸로코스, 자네 원수는 갚았네. 편히 쉬게.", tone: "grief" },
      { speaker: null, text: "달아나는 트로이군을 쫓아 아킬레우스가 성으로 내달렸다." },
      { speaker: null, text: "스카이아이 문이 점점 가까워졌다. 헥토르가 죽으며 말한 바로 그 문이었다.", tone: "grief" },
    ] },
    // 안틸로코스가 산 길 — 호메로스와 다른 길
    outroAlt: { id: "outro-alt", lines: [
      { speaker: null, text: "호메로스는 안틸로코스가 새벽의 아들 손에 죽었다고 노래했다. 이 싸움에서는 다른 길이 열렸다." },
      { speaker: null, text: "시인 핀다로스가 기린 죽음 대신, 안틸로코스는 살아서 아버지 곁에 섰다." },
      { speaker: "nestor", text: "얘야, 네가 와 준 덕에 이 늙은 아비가 살았다.", tone: "calm" },
      { speaker: "antilochus", text: "아버지께서 부르시는데 어찌 못 들은 척하겠습니까.", tone: "calm" },
      { speaker: null, text: "왕을 잃은 아이티오피아군이 무너졌다. 트로이군도 등을 돌렸다." },
      { speaker: null, text: "달아나는 트로이군을 쫓아 아킬레우스가 성으로 내달렸다." },
      { speaker: null, text: "스카이아이 문이 점점 가까워졌다. 헥토르가 죽으며 말한 바로 그 문이었다.", tone: "grief" },
    ] },
    defeat: { id: "defeat", lines: [
      { speaker: null, text: "아카이아군의 대열이 무너졌다. 아이티오피아 병사들이 함성을 지르며 들판을 휩쓸었다." },
      { speaker: "memnon", text: "보아라, 트로이는 끄떡없다! 놈들을 배까지 몰아붙여라!", tone: "fierce" },
      { speaker: null, text: "옛 노래 속 싸움은 이렇게 끝나지 않았다." },
    ] },
  },
  // #endregion

  // #region 영어
  en: {
    title: "Son of the Dawn",
    source: "The Aethiopis; Pindar, Pythian 6; The Odyssey, Book 4",
    summary: "Memnon, son of Eos the Dawn, leads his Aethiopians to the aid of Troy. Achilles and Memnon, both born of goddesses, meet as rivals.",
    objective: "Defeat Memnon, king of the Aethiopians.",
    loss: "Achilles or Nestor falls.",
    intro: { id: "intro", lines: [
      { speaker: null, text: "The killing of Thersites set the Achaeans quarreling among themselves." },
      { speaker: null, text: "Achilles sailed to Lesbos and sacrificed to Apollo, Artemis, and Leto. There Odysseus purified him of his blood-guilt." },
      { speaker: null, text: "Some time later, new allies reached Troy. Memnon, son of Eos the Dawn, had led his Aethiopians there from the ends of the earth." },
      { speaker: null, text: "Memnon wore armor forged by Hephaestus himself. His father, Tithonus, was Priam’s brother." },
      { speaker: "memnon", text: "Troy is my father’s home. I’ll drive every last one of its invaders into the sea.", tone: "fierce" },
      { speaker: null, text: "On the Achaean side, old Nestor drove out in his chariot, and his son Antilochus went with him." },
      { speaker: null, text: "Antilochus was famed as a swift runner and a fine fighter." },
      { speaker: "nestor", text: "Careful, son. Memnon is no ordinary warrior; a god made his armor, so don’t rush him.", tone: "calm" },
      { speaker: "antilochus", text: "Don’t worry, Father. I’ll stay by your side.", tone: "calm" },
      { speaker: null, text: "As dawn broke over the plain, two sons of goddesses took the field: Achilles, son of Thetis, and Memnon, son of Eos.", tone: "awe" },
    ] },
    scenes: [
      { id: "thetis-warns", lines: [
        { speaker: null, text: "Before the battle, Thetis rose from the sea and came to her son." },
        { speaker: "thetis", text: "My child, Memnon is a goddess’s son, just as you are. Guard yourself well.", tone: "calm" },
        { speaker: "achilles", text: "Mother, I know my life will be short. Even so, I won’t back down.", tone: "fierce" },
      ] },
      { id: "nestor-horse", lines: [
        { speaker: null, text: "Arrows loosed by Paris struck one of Nestor’s horses. It went down thrashing, and the chariot was stuck fast." },
        { speaker: null, text: "Memnon saw his chance and charged, brandishing his mighty spear.", tone: "fierce" },
        { speaker: null, text: "Shaken to the core, the old man shouted for his son." },
        { speaker: "nestor", text: "Antilochus! To me, boy, hurry!", tone: "fierce" },
        { speaker: "antilochus", text: "I’m coming, Father!", tone: "fierce" },
      ] },
      { id: "antilochus-falls", lines: [
        { speaker: null, text: "Antilochus would not give ground. He stood fast in front of his father." },
        { speaker: null, text: "The glorious son of the shining Dawn drove his great spear home, and flawless Antilochus fell.", tone: "grief" },
        { speaker: null, text: "The son traded his own life for his father’s.", tone: "grief" },
        { speaker: null, text: "Men of that age said no young man ever did more for his parents." },
        { speaker: "achilles", text: "Memnon! Your fight is with me now!", tone: "fierce" },
      ] },
      { id: "memnon-falls", lines: [
        { speaker: "aethiopian", text: "The king has fallen!", tone: "grief" },
        { speaker: null, text: "Not even armor forged by Hephaestus could save the son of the Dawn.", tone: "grief" },
        { speaker: null, text: "Eos went to Zeus and begged him to let her son live forever.", tone: "grief" },
        { speaker: null, text: "Zeus granted it, and Eos gave her son immortality.", tone: "awe" },
      ] },
    ],
    outro: { id: "outro", lines: [
      { speaker: null, text: "With their king gone, the Aethiopians broke, and the Trojans turned and ran." },
      { speaker: null, text: "Nestor wept over the body of his son.", tone: "grief" },
      { speaker: "nestor", text: "My boy, so swift and so brave. You went first, so that your old father could live.", tone: "grief" },
      { speaker: null, text: "Antilochus had been a dear friend to Achilles." },
      { speaker: "achilles", text: "You’re avenged, Antilochus. Rest now.", tone: "grief" },
      { speaker: null, text: "Achilles chased the fleeing Trojans toward the city." },
      { speaker: null, text: "The Scaean Gates drew near, the very gates Hector had named as he died.", tone: "grief" },
    ] },
    outroAlt: { id: "outro-alt", lines: [
      { speaker: null, text: "Homer sang that Antilochus died at the hands of the Dawn’s son. This battle took another road." },
      { speaker: null, text: "Instead of the death the poet Pindar praised, Antilochus stood alive at his father’s side." },
      { speaker: "nestor", text: "My boy, you came, and your old father is alive because of it.", tone: "calm" },
      { speaker: "antilochus", text: "You called for me, Father. How could I pretend not to hear?", tone: "calm" },
      { speaker: null, text: "With their king gone, the Aethiopians broke, and the Trojans turned and ran." },
      { speaker: null, text: "Achilles chased the fleeing Trojans toward the city." },
      { speaker: null, text: "The Scaean Gates drew near, the very gates Hector had named as he died.", tone: "grief" },
    ] },
    defeat: { id: "defeat", lines: [
      { speaker: null, text: "The Achaean line broke, and the Aethiopians swept across the plain with a roar." },
      { speaker: "memnon", text: "Troy still stands! Drive them back to their ships!", tone: "fierce" },
      { speaker: null, text: "That is not how the old songs end." },
    ] },
  },
  // #endregion
};

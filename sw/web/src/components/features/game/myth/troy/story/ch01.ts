/*
  파일명: components/features/game/myth/troy/story/ch01.ts
  기능: 트로이 전쟁 1장 「해변에 닿다」 이야기
  책임: 상륙전의 싸움 전·중·뒤 대화와 서술을 한국어·영어로 쥔다. 장면 id는 장 자료(campaign/ch01)가 부른다.
        출전: 『키프리아』(프로클로스 요약), 아폴로도로스 요약편 3.29~31, 『일리아스』 1·2·8·9권.
*/ // ------------------------------
import type { ChapterStory, ChapterStoryBook } from "./types";

// #region 한국어
const KO: ChapterStory = {
  title: "해변에 닿다",
  source: "『키프리아』, 아폴로도로스 요약편 3.29~31, 『일리아스』 1권",
  summary: "그리스 함대가 트로이 해안에 닿았다. 해변을 지키는 트로이군을 몰아내고 뭍에 발을 디딘다.",
  objective: "해변의 트로이군을 모두 물리친다.",
  loss: "아킬레우스가 쓰러진다.",
  // 요약편 3.29~31(테티스의 당부, 돌 세례, 프로테실라오스), 『일리아스』 2.700~702(아내와 짓다 만 집)
  intro: { id: "intro", lines: [
    { speaker: null, text: "트로이 왕자 파리스가 스파르타 왕 메넬라오스의 아내 헬레네를 데려갔다." },
    { speaker: null, text: "메넬라오스의 형 아가멤논이 그리스 왕들을 불러 모았다. 배들이 바다를 건너 트로이 해안에 닿았다." },
    { speaker: null, text: "트로이군이 무장하고 바닷가로 몰려나왔다. 배를 향해 돌이 빗발쳤다." },
    { speaker: null, text: "테티스는 아들 아킬레우스에게 먼저 뭍에 내리지 말라고 일러 두었다. 가장 먼저 내린 사람이 가장 먼저 죽는다고 했다." },
    { speaker: null, text: "프로테실라오스가 가장 먼저 배에서 뛰어내렸다. 트로이 병사를 여럿 쓰러뜨렸다." },
    { speaker: "achaean-soldier", text: "프로테실라오스가 쓰러졌다! 헥토르다!", tone: "grief" },
    { speaker: null, text: "고향 필라케에는 두 뺨을 할퀴며 우는 아내와 짓다 만 집이 남았다.", tone: "grief" },
    { speaker: "achilles", text: "이제 내가 내린다. 미르미돈, 나를 따르라!", tone: "fierce" },
    { speaker: "patroclus", text: "네 곁은 내가 지킨다. 앞만 보고 가.", tone: "calm" },
    { speaker: "ajax-the-great", text: "방패는 내가 앞에 세우겠네. 테우크로스, 내 뒤에 붙어라.", tone: "calm" },
    { speaker: "odysseus", text: "서두르지 말게. 배를 등지고 한 걸음씩 밀고 올라가세.", tone: "cunning" },
    { speaker: "diomedes", text: "저기 헥토르가 있군. 프로테실라오스의 원수부터 갚세.", tone: "fierce" },
  ] },
  scenes: [
    // 1차례 시작. 트로이군이 상륙을 막으려 했다(요약편 3.29) — 외침은 이음 대사
    { id: "hector-appears", lines: [
      { speaker: null, text: "투구를 번쩍이며 헥토르가 해변을 가로막고 섰다." },
      { speaker: "hector", text: "트로이 사람들아, 한 놈도 뭍에 올리지 마라! 모두 바다로 밀어 넣어라!", tone: "fierce" },
      { speaker: "achilles", text: "저자가 헥토르인가. 좋다, 어디 한번 겨뤄 보자.", tone: "fierce" },
    ] },
    // 테우크로스가 형 곁에 설 때. 『일리아스』 8.266~272의 방패 뒤 궁수
    { id: "ajax-teucer", lines: [
      { speaker: null, text: "테우크로스가 형 대 아이아스의 방패 뒤에 섰다. 아이아스가 방패를 살짝 비켜 주면 테우크로스가 활을 쏘았다." },
      { speaker: null, text: "쏘고 나면 아이가 어머니 품으로 숨듯 다시 방패 뒤로 돌아왔다." },
      { speaker: "ajax-the-great", text: "쏘아라, 아우야. 내 방패가 너를 가려 주마.", tone: "calm" },
      { speaker: "teucer", text: "형님이 막아 주시면 한 발도 허투루 쏘지 않겠습니다.", tone: "calm" },
    ] },
    // 헥토르가 물러날 때. 트로이군은 성으로 달아났다(요약편 3.31) — 대사는 이음 대사
    { id: "hector-retreat", lines: [
      { speaker: null, text: "헥토르가 창을 거두고 뒤로 물러났다." },
      { speaker: "hector", text: "물러나라! 성벽 밑에서 다시 싸운다.", tone: "fierce" },
      { speaker: "achilles", text: "달아나는구나, 헥토르. 해변에 남은 놈들부터 쓸어 내라!", tone: "fierce" },
    ] },
  ],
  // 요약편 3.31, 『일리아스』 9.328~329·352~355(아홉 해), 『키프리아』(전리품), 1권(역병·브리세이스·테티스의 청)
  outro: { id: "outro", lines: [
    { speaker: null, text: "트로이군이 성으로 달아났다. 그리스군은 배를 뭍으로 끌어올리고 진영을 세웠다." },
    { speaker: null, text: "트로이 사람들은 성문을 굳게 닫았다. 싸움은 아홉 해를 끌었다." },
    { speaker: null, text: "그동안 아킬레우스는 배로 열두 고을, 뭍으로 열한 고을을 무너뜨렸다." },
    { speaker: null, text: "아킬레우스가 싸우는 동안 헥토르는 성벽에서 멀리 나오려 하지 않았다." },
    { speaker: null, text: "전리품을 나눌 때 아킬레우스는 브리세이스를, 아가멤논은 크리세이스를 받았다." },
    { speaker: null, text: "열 번째 해, 아폴론이 진영에 역병을 내렸다. 아가멤논이 사제 크리세스에게 딸을 돌려주지 않은 탓이었다." },
    { speaker: null, text: "아가멤논은 크리세이스를 돌려보내는 대신 아킬레우스의 브리세이스를 빼앗았다." },
    { speaker: null, text: "파트로클로스가 브리세이스를 데려 나와 전령들에게 넘겼다. 브리세이스는 내키지 않는 걸음으로 따라갔다.", tone: "grief" },
    { speaker: "achilles", text: "언젠가 아카이아 사람들이 나를 그리워할 날이 온다. 헥토르 손에 떼로 쓰러질 때 말이다.", tone: "fierce" },
    { speaker: null, text: "아킬레우스는 막사로 돌아가 싸움에서 손을 뗐다." },
    { speaker: null, text: "테티스가 제우스의 무릎을 붙잡고 빌었다. 아들이 명예를 되찾을 때까지 트로이군에게 힘을 실어 달라고." },
    { speaker: null, text: "제우스가 고개를 끄덕이자 올림포스가 크게 흔들렸다.", tone: "awe" },
  ] },
  defeat: { id: "defeat", lines: [
    { speaker: null, text: "아킬레우스가 모래 위에 쓰러졌다. 그리스군은 배 쪽으로 밀려났다." },
    { speaker: "patroclus", text: "아킬레우스를 배로 옮겨! 해변은 다시 찾으면 돼.", tone: "grief" },
  ] },
};
// #endregion

// #region English
const EN: ChapterStory = {
  title: "Landfall",
  source: "Cypria; Apollodorus, Epitome 3.29–31; Iliad 1",
  summary: "The Greek fleet reaches the shore of Troy. Drive the defenders off the beach and win a foothold.",
  objective: "Defeat every Trojan on the beach.",
  loss: "Achilles falls.",
  intro: { id: "intro", lines: [
    { speaker: null, text: "Paris, a prince of Troy, had carried off Helen, wife of King Menelaus of Sparta." },
    { speaker: null, text: "Menelaus's brother Agamemnon called the kings of Greece to war. Their ships crossed the sea to the shores of Troy." },
    { speaker: null, text: "The Trojans marched down to the water in full armor. Stones rained down on the ships." },
    { speaker: null, text: "Thetis had warned her son Achilles not to be the first ashore. The first to land, she said, would be the first to die." },
    { speaker: null, text: "Protesilaus leapt from his ship before anyone else and cut down several Trojans." },
    { speaker: "achaean-soldier", text: "Protesilaus is down! It's Hector!", tone: "grief" },
    { speaker: null, text: "Back in Phylace he left a wife tearing her cheeks in grief, and a house half built.", tone: "grief" },
    { speaker: "achilles", text: "My turn. Myrmidons, follow me!", tone: "fierce" },
    { speaker: "patroclus", text: "I'll guard your side. Just keep going.", tone: "calm" },
    { speaker: "ajax-the-great", text: "I'll put the shields up front. Teucer, stay tight behind me.", tone: "calm" },
    { speaker: "odysseus", text: "Don't rush it. Keep the ships at our backs and push up the beach one step at a time.", tone: "cunning" },
    { speaker: "diomedes", text: "There's Hector. Let's settle the score for Protesilaus.", tone: "fierce" },
  ] },
  scenes: [
    { id: "hector-appears", lines: [
      { speaker: null, text: "Hector of the flashing helmet stood across the beach, barring the way." },
      { speaker: "hector", text: "Trojans, not one of them sets foot on our land! Drive them back into the sea!", tone: "fierce" },
      { speaker: "achilles", text: "So that's Hector. Let's see what he's worth.", tone: "fierce" },
    ] },
    { id: "ajax-teucer", lines: [
      { speaker: null, text: "Teucer took his place behind the shield of his brother Ajax. Whenever Ajax swung it aside, Teucer let fly." },
      { speaker: null, text: "Then he ducked back behind it, like a child running to its mother." },
      { speaker: "ajax-the-great", text: "Shoot, little brother. My shield has you.", tone: "calm" },
      { speaker: "teucer", text: "Keep it there, and I won't waste a single arrow.", tone: "calm" },
    ] },
    { id: "hector-retreat", lines: [
      { speaker: null, text: "Hector lowered his spear and drew back." },
      { speaker: "hector", text: "Fall back! We fight again beneath the walls.", tone: "fierce" },
      { speaker: "achilles", text: "Running already, Hector? Clear the rest of them off this beach!", tone: "fierce" },
    ] },
  ],
  outro: { id: "outro", lines: [
    { speaker: null, text: "The Trojans fled to their city. The Greeks hauled their ships up the sand and pitched camp." },
    { speaker: null, text: "Troy barred its gates, and the war dragged on for nine years." },
    { speaker: null, text: "In that time Achilles sacked twelve towns from the sea and eleven more by land." },
    { speaker: null, text: "As long as Achilles fought, Hector would not venture far from the walls." },
    { speaker: null, text: "When the spoils were shared out, Achilles received Briseis and Agamemnon received Chryseis." },
    { speaker: null, text: "In the tenth year Apollo struck the camp with plague. Agamemnon had refused to return Chryseis to her father, Apollo's priest." },
    { speaker: null, text: "Agamemnon returned Chryseis, then took Briseis from Achilles to make up for her." },
    { speaker: null, text: "Patroclus brought Briseis out and handed her to the heralds. She went with them unwillingly.", tone: "grief" },
    { speaker: "achilles", text: "A day will come when the Achaeans miss Achilles. When they fall in heaps before Hector.", tone: "fierce" },
    { speaker: null, text: "Achilles went back to his hut and would fight no more." },
    { speaker: null, text: "Thetis clasped the knees of Zeus and begged him to give the Trojans the upper hand until her son's honor was restored." },
    { speaker: null, text: "Zeus nodded, and great Olympus shook.", tone: "awe" },
  ] },
  defeat: { id: "defeat", lines: [
    { speaker: null, text: "Achilles fell on the sand, and the Greeks were driven back toward their ships." },
    { speaker: "patroclus", text: "Get him to the ships! We can take this beach again.", tone: "grief" },
  ] },
};
// #endregion

export const CH01: ChapterStoryBook = { ko: KO, en: EN };

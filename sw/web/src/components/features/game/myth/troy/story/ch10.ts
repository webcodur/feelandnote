/*
  파일명: components/features/game/myth/troy/story/ch10.ts
  기능: 트로이 전쟁 10장 「목마」 이야기(한국어·영어)
  책임: 『소일리아스』·『일리오스 함락』(프로클로스 요약), 『오디세이아』 4권 271~289행·8권 492~520행, 『아이네이스』 2권을 따라
        싸움 전·중·뒤 장면을 적는다. 카산드라 일은 신상에서 끌어낸 데까지만 담담하게 적는다.
*/ // ------------------------------
import type { ChapterStoryBook } from "./types";

export const CH10: ChapterStoryBook = {
  // #region 한국어
  ko: {
    title: "목마",
    source: "『소일리아스』·『일리오스 함락』, 『오디세이아』 4·8권, 『아이네이스』 2권",
    summary: "에페이오스가 지은 목마 안에 그리스 장수들이 숨었다. 트로이가 잠든 밤, 목마의 문이 열린다.",
    objective: "데이포보스를 쓰러뜨린다. 성문을 열면 아가멤논의 군대가 들어온다.",
    loss: "오디세우스나 메넬라오스가 쓰러지거나 14차례가 지난다.",
    // 『오디세이아』 8.492~495(아테나의 도움, 에페이오스, 오디세우스가 이끎), 프로클로스 요약(테네도스로 물러남), 『아이네이스』 2.40~56·199~249(라오콘, 성벽을 헐고 끌어들임, 카산드라), 2.254~264(시논이 빗장을 풂)
    intro: { id: "intro", lines: [
      { speaker: null, text: "아테나의 도움을 받아 에페이오스가 커다란 나무 말을 지었다." },
      { speaker: "epeius", text: "배 속은 비워 두었소. 가장 날랜 장수들이 들어갈 자리요.", tone: "calm" },
      { speaker: null, text: "오디세우스가 가려 뽑은 장수들이 말 배 속으로 들어갔다." },
      { speaker: null, text: "남은 그리스군은 진영을 불태우고 배를 띄워 테네도스섬 뒤로 숨었다." },
      { speaker: "sinon", text: "그리스 사람들은 달아났소. 저 말은 아테나 여신께 바친 것이오. 성안에 들이면 트로이는 무너지지 않소.", tone: "cunning" },
      { speaker: null, text: "사제 라오콘이 저 말을 믿지 말라고 외쳤다. 바다에서 큰 뱀 두 마리가 나와 라오콘과 두 아들을 휘감았다.", tone: "awe" },
      { speaker: null, text: "트로이 사람들은 성벽 한쪽을 헐고 목마를 끌어들였다." },
      { speaker: "cassandra", text: "저 말 안에 죽음이 들어 있어요! 제발 제 말을 들으세요!", tone: "grief" },
      { speaker: null, text: "아무도 카산드라의 말을 믿지 않았다. 트로이는 잔치를 벌이고 술에 취해 잠들었다." },
      { speaker: null, text: "한밤, 시논이 몰래 목마의 빗장을 풀었다.", tone: "cunning" },
    ] },
    scenes: [
      // 『아이네이스』 2.262(밧줄을 타고 내림), 『오디세이아』 4.271~289(헬레네가 아내들의 목소리를 흉내 냄, 오디세우스가 입을 막음)
      { id: "out-of-horse", lines: [
        { speaker: null, text: "목마의 문이 열리고 밧줄이 내려왔다." },
        { speaker: "menelaus", text: "헬레네가 우리 이름을 부르며 목마 곁을 돌던 밤이 생각나는군. 아내들 목소리 그대로였지.", tone: "calm" },
        { speaker: "odysseus", text: "그때 자네들 입을 막느라 혼났지. 이제는 소리 내도 되네. 가세.", tone: "cunning" },
      ] },
      // 프로클로스 요약(시논이 횃불로 신호, 함대가 돌아옴). 아가멤논의 말은 이음 대사
      { id: "gate-open", lines: [
        { speaker: null, text: "스카이아이 문이 열렸다. 시논이 높이 횃불을 들어 올렸다." },
        { speaker: null, text: "테네도스에서 돌아온 함대가 바닷가에 닿았다. 아가멤논이 군대를 이끌고 성문으로 들어왔다." },
        { speaker: "agamemnon", text: "열 해를 기다렸다. 트로이는 오늘 밤 끝난다!", tone: "fierce" },
      ] },
      // 프로클로스 요약(오일레우스의 아들 아이아스가 카산드라를 끌어내며 아테나 신상까지 끌려 넘어짐), 『오디세이아』 4.499~511·『일리오스 함락』(귀향길의 난파)
      { id: "cassandra", lines: [
        { speaker: null, text: "아테나 신전에서 카산드라가 신상을 붙잡고 있었다. 소 아이아스가 카산드라를 끌어내자 신상까지 함께 넘어졌다.", tone: "grief" },
        { speaker: null, text: "아테나의 노여움이 이날부터 그리스 함대를 따라다녔다. 귀향길이 험해진 까닭이었다.", tone: "awe" },
      ] },
      // 『오디세이아』 8.517~520(데이포보스의 집, 가장 무서운 싸움)
      { id: "deiphobus-falls", lines: [
        { speaker: null, text: "오디세우스와 메넬라오스가 데이포보스의 집으로 쳐들어갔다." },
        { speaker: null, text: "가장 무서운 싸움 끝에 데이포보스가 쓰러졌다.", tone: "fierce" },
        { speaker: "menelaus", text: "헬레네는 어디 있느냐!", tone: "fierce" },
      ] },
    ],
    // 『소일리아스』(칼을 떨군 메넬라오스), 『일리오스 함락』(프리아모스의 죽음, 여인들을 나눔), 『아이네이스』 2.707~729(안키세스를 업고 아스카니우스의 손을 잡음)
    outro: { id: "outro", lines: [
      { speaker: null, text: "메넬라오스가 칼을 뽑아 든 채 헬레네 앞에 섰다." },
      { speaker: null, text: "헬레네를 보자 칼을 쥔 손에 힘이 빠졌다. 칼이 땅에 떨어졌다.", tone: "calm" },
      { speaker: null, text: "그날 밤 트로이가 불탔다. 프리아모스 왕은 제우스의 제단 곁에서 목숨을 잃었다.", tone: "grief" },
      { speaker: null, text: "아이네이아스는 늙은 아버지 안키세스를 업고 어린 아들의 손을 잡은 채 불길을 빠져나갔다." },
      { speaker: "aeneas", text: "아버지, 제 등에 업히십시오. 무엇이 닥쳐도 함께 겪겠습니다.", tone: "grief" },
      { speaker: null, text: "트로이의 여인들은 그리스 장수들의 배에 나뉘어 실렸다. 안드로마케도, 카산드라도 떠났다.", tone: "grief" },
      { speaker: null, text: "그리스군의 귀향이 시작되었다. 바다는 그리 너그럽지 않았다." },
      { speaker: "odysseus", text: "이타카로 돌아가자. 바다만 건너면 된다.", tone: "calm" },
      { speaker: null, text: "오디세우스는 몰랐다. 집에 닿기까지 열 해가 더 걸린다는 것을." },
      { speaker: null, text: "트로이 전쟁이 끝났다.", tone: "awe" },
    ] },
    defeat: { id: "defeat", lines: [
      { speaker: null, text: "목마에서 내린 장수들이 트로이 파수꾼들에게 에워싸였다." },
      { speaker: "deiphobus", text: "속임수는 여기까지다! 모두 붙잡아라!", tone: "fierce" },
    ] },
  },
  // #endregion

  // #region 영어
  en: {
    title: "The Wooden Horse",
    source: "The Little Iliad and The Sack of Ilion; The Odyssey, Books 4 and 8; The Aeneid, Book 2",
    summary: "Greek captains hide inside the horse Epeius built. On the night Troy sleeps, its hatch opens.",
    objective: "Defeat Deiphobus. Open the gate and Agamemnon's army will pour in.",
    loss: "Odysseus or Menelaus falls, or 14 turns pass.",
    intro: { id: "intro", lines: [
      { speaker: null, text: "With Athena's help, Epeius built a great horse of wood." },
      { speaker: "epeius", text: "I've left the belly hollow. There's room for your best men.", tone: "calm" },
      { speaker: null, text: "The captains Odysseus chose climbed into its belly." },
      { speaker: null, text: "The rest of the Greeks burned their camp, put to sea, and hid behind the island of Tenedos." },
      { speaker: "sinon", text: "The Greeks have fled. That horse is an offering to Athena. Bring it inside and Troy will never fall.", tone: "cunning" },
      { speaker: null, text: "The priest Laocoon cried out not to trust it. Two great serpents rose from the sea and coiled around him and his two sons.", tone: "awe" },
      { speaker: null, text: "The Trojans broke open a stretch of their wall and hauled the horse inside." },
      { speaker: "cassandra", text: "There is death inside that horse! Please, listen to me!", tone: "grief" },
      { speaker: null, text: "No one believed Cassandra. Troy feasted, drank, and fell asleep." },
      { speaker: null, text: "At midnight Sinon quietly slid back the horse's bolts.", tone: "cunning" },
    ] },
    scenes: [
      { id: "out-of-horse", lines: [
        { speaker: null, text: "The hatch opened and ropes dropped down." },
        { speaker: "menelaus", text: "I keep thinking of the night Helen circled the horse calling our names, in our own wives' voices.", tone: "calm" },
        { speaker: "odysseus", text: "I had my hands full keeping your mouths shut. You can make noise now. Let's go.", tone: "cunning" },
      ] },
      { id: "gate-open", lines: [
        { speaker: null, text: "The Scaean Gates swung open. Sinon raised a torch high." },
        { speaker: null, text: "The fleet came back from Tenedos to the shore, and Agamemnon led the army in through the gates." },
        { speaker: "agamemnon", text: "Ten years we've waited. Tonight Troy ends!", tone: "fierce" },
      ] },
      { id: "cassandra", lines: [
        { speaker: null, text: "In Athena's temple, Cassandra clung to the goddess's statue. When Ajax the Lesser dragged her away, the statue toppled with her.", tone: "grief" },
        { speaker: null, text: "From that day Athena's anger followed the Greek fleet. It is why their voyages home went so badly.", tone: "awe" },
      ] },
      { id: "deiphobus-falls", lines: [
        { speaker: null, text: "Odysseus and Menelaus stormed the house of Deiphobus." },
        { speaker: null, text: "After the grimmest fight of the night, Deiphobus fell.", tone: "fierce" },
        { speaker: "menelaus", text: "Where is Helen?", tone: "fierce" },
      ] },
    ],
    outro: { id: "outro", lines: [
      { speaker: null, text: "Menelaus stood before Helen, sword drawn." },
      { speaker: null, text: "When he saw her, the strength went out of his hand. The sword fell to the ground.", tone: "calm" },
      { speaker: null, text: "That night Troy burned. King Priam died beside the altar of Zeus.", tone: "grief" },
      { speaker: null, text: "Aeneas carried his old father Anchises on his back and led his young son by the hand out through the flames." },
      { speaker: "aeneas", text: "Climb onto my back, Father. Whatever comes, we'll face it together.", tone: "grief" },
      { speaker: null, text: "The women of Troy were divided among the Greek captains' ships. Andromache went, and Cassandra too.", tone: "grief" },
      { speaker: null, text: "The Greeks set out for home. The sea was not kind to them." },
      { speaker: "odysseus", text: "Home to Ithaca. Just one sea to cross.", tone: "calm" },
      { speaker: null, text: "Odysseus did not know it would take him ten more years to reach home." },
      { speaker: null, text: "The Trojan War was over.", tone: "awe" },
    ] },
    defeat: { id: "defeat", lines: [
      { speaker: null, text: "The captains from the horse were surrounded by Trojan sentries." },
      { speaker: "deiphobus", text: "Your trick ends here! Take them all!", tone: "fierce" },
    ] },
  },
  // #endregion
};

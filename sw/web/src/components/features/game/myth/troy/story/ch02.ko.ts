/*
  파일명: components/features/game/myth/troy/story/ch02.ko.ts
  기능: 트로이 전쟁 2장 「깨진 휴전」 한국어 이야기
  책임: 휴전이 깨진 들판 싸움의 대화와 서술을 쥔다. ch02.ts가 영어와 묶는다. 장면 id는 장 자료(campaign/ch02)가 부른다.
        사건 순서는 판에서 바뀐다(아프로디테·아레스가 판다로스보다 먼저 나온다). 그래서 장면끼리 앞뒤를 가정하지 않는다.
*/ // ------------------------------
import type { ChapterStory } from "./types";

export const CH02_KO: ChapterStory = {
  title: "깨진 휴전",
  source: "『일리아스』 3~9권",
  summary: "판다로스의 화살이 휴전을 깨뜨렸다. 아테나의 힘을 입은 디오메데스가 앞장선다.",
  objective: "판다로스를 쓰러뜨린다.",
  loss: "디오메데스나 메넬라오스가 쓰러진다.",
  // 3권(결투·아프로디테), 4권(라오도코스로 꾸민 아테나, 판다로스의 화살, 마카온의 치료)
  intro: { id: "intro", lines: [
    { speaker: null, text: "두 군대가 들판에서 마주 섰다. 헬레네를 두고 맞수가 된 파리스와 메넬라오스가 결투하기로 했다." },
    { speaker: null, text: "양쪽이 제물을 바치고 맹세했다. 이긴 쪽이 헬레네와 재물을 차지하고, 두 나라는 싸움을 끝내기로 했다." },
    { speaker: "menelaus", text: "제우스시여, 먼저 제게 몹쓸 짓을 한 자를 이 손으로 벌하게 하소서.", tone: "fierce" },
    { speaker: null, text: "메넬라오스의 칼이 파리스의 투구에 부딪혀 서너 동강 났다. 메넬라오스는 투구 깃을 움켜쥐고 파리스를 끌고 갔다." },
    { speaker: null, text: "아프로디테가 투구 끈을 끊고 파리스를 짙은 안개로 감쌌다. 여신은 파리스를 성안 침실에 내려놓았다.", tone: "awe" },
    { speaker: "menelaus", text: "파리스! 어디로 숨었느냐!", tone: "fierce" },
    { speaker: "agamemnon", text: "이긴 쪽은 메넬라오스다. 헬레네와 재물을 돌려보내라!", tone: "fierce" },
    { speaker: null, text: "헤라는 트로이가 무너지기를 바랐다. 제우스의 허락을 얻은 아테나가 트로이 장수 라오도코스의 모습을 하고 궁수 판다로스를 찾아갔다." },
    { speaker: "athena", text: "메넬라오스를 쏘게. 파리스 왕자가 큰 선물로 갚을 걸세.", tone: "cunning" },
    { speaker: null, text: "판다로스의 화살이 날아가자 아테나가 잠든 아이에게서 파리를 쫓듯 살짝 밀어냈다. 화살은 허리띠를 뚫고 살갗만 스쳤다." },
    { speaker: "menelaus", text: "걱정 마시오, 형님. 허리띠가 막아서 급소는 비껴갔소.", tone: "calm" },
    { speaker: null, text: "마카온이 화살을 뽑고 피를 빨아낸 뒤 약을 발랐다. 아버지 아스클레피오스가 케이론에게서 받은 약이었다." },
    { speaker: null, text: "맹세가 깨졌다. 아킬레우스가 막사에 머무는 사이 두 군대가 다시 맞붙었다." },
  ] },
  scenes: [
    // 시작. 5.1~8(별 같은 불길), 5.121~132(안개를 걷고 아프로디테만은 찌르라 함). 마지막 줄은 「아테나의 가호」를 가리키는 이음 대사
    { id: "athena-diomedes", lines: [
      { speaker: null, text: "아테나가 디오메데스의 가슴에 아버지 티데우스의 힘을 불어넣었다. 투구와 방패에서 늦여름 별처럼 불길이 일었다.", tone: "awe" },
      { speaker: "athena", text: "네 눈을 덮던 안개를 걷었다. 이제 신과 사람을 알아볼 수 있다.", tone: "calm" },
      { speaker: "athena", text: "다른 신과는 겨루지 마라. 그러나 아프로디테가 싸움에 끼어들거든 날카로운 청동으로 찔러라.", tone: "fierce" },
      { speaker: "diomedes", text: "여신이시여, 신이 앞을 막아서면 그때 가호를 청하겠습니다.", tone: "calm" },
    ] },
    // 3차례. 5.311~318(흰 팔과 옷자락으로 아들을 감쌈)
    { id: "aphrodite-arrives", lines: [
      { speaker: null, text: "아프로디테가 싸움터로 내려왔다. 소 치던 안키세스에게 아이네이아스를 낳아 준 여신이었다.", tone: "awe" },
      { speaker: null, text: "여신은 흰 팔로 아들을 감싸고, 빛나는 옷자락을 펼쳐 날아드는 창을 막았다." },
      { speaker: "diomedes", text: "아프로디테다. 아테나 여신께서 저 여신만은 찔러도 된다고 하셨다.", tone: "fierce" },
    ] },
    // 5.330~351(손목의 상처, 이코르, 디오메데스의 조롱), 5.352~369(이리스의 부축)
    { id: "aphrodite-wounded", lines: [
      { speaker: null, text: "디오메데스의 창이 아프로디테의 손목을 찔렀다. 신의 피 이코르가 흐르자 여신이 비명을 질렀다.", tone: "awe" },
      { speaker: "diomedes", text: "제우스의 딸이여, 싸움터에서 물러나시오. 연약한 여인들을 홀리는 것으로는 모자라오?", tone: "fierce" },
      { speaker: null, text: "아프로디테는 이리스의 부축을 받으며 올림포스로 달아났다." },
    ] },
    // 5차례. 5.590~606(사람 모습의 아레스, 물러서라는 디오메데스), 5.826~834(아테나가 치라고 이름)
    { id: "ares-arrives", lines: [
      { speaker: null, text: "아레스가 사람의 모습을 하고 트로이군 앞에 섰다. 커다란 창을 휘두르며 대열 앞뒤를 오갔다.", tone: "awe" },
      { speaker: "diomedes", text: "트로이군을 마주 본 채 물러서라! 저건 사람이 아니라 아레스다.", tone: "awe" },
      { speaker: "athena", text: "아레스를 두려워 마라. 내가 곁에 있으니 저 미치광이를 곧장 찔러라.", tone: "fierce" },
    ] },
    // 5.855~867(아랫배를 찌른 창, 구천·만 명의 함성, 먹구름처럼 올림포스로)
    { id: "ares-wounded", lines: [
      { speaker: null, text: "디오메데스가 창을 내지르자 아테나가 그 창을 아레스의 아랫배로 이끌었다.", tone: "awe" },
      { speaker: null, text: "아레스가 구천 명, 만 명이 한꺼번에 지르는 함성처럼 울부짖었다. 그리스군도 트로이군도 몸을 떨었다.", tone: "awe" },
      { speaker: null, text: "아레스는 먹구름처럼 하늘로 솟아 올림포스로 달아났다." },
    ] },
    // 6.119~236(나뭇잎의 세대, 오이네우스와 벨레로폰, 금 무구와 청동 무구)
    { id: "glaucus-truce", lines: [
      { speaker: "diomedes", text: "자네는 누군가? 싸움터에서 처음 보는 얼굴이군.", tone: "calm" },
      { speaker: "glaucus", text: "내 핏줄은 왜 묻나? 사람의 세대는 지고 나면 봄에 다시 돋는 나뭇잎과 같다네.", tone: "calm" },
      { speaker: "glaucus", text: "나는 벨레로폰의 손자, 히폴로코스의 아들 글라우코스일세.", tone: "calm" },
      { speaker: "diomedes", text: "내 할아버지 오이네우스가 벨레로폰을 스무 날 대접했네. 대를 이은 손님 벗끼리 무구를 바꾸세.", tone: "calm" },
      { speaker: null, text: "둘은 손을 맞잡고 무구를 바꿨다. 글라우코스는 소 백 마리 값의 금 무구를 주고 소 아홉 마리 값의 청동 무구를 받았다." },
    ] },
    // 아이네이아스가 물러날 때. 5.344~346·431~448(아폴론의 구름과 경고, 페르가모스). 아프로디테가 먼저 다쳤든 아니든 맞도록 아폴론이 데려간다
    { id: "aeneas-rescued", lines: [
      { speaker: null, text: "아이네이아스가 무릎을 꿇자 아폴론이 검은 구름으로 감쌌다.", tone: "awe" },
      { speaker: "apollo", text: "물러서라. 죽을 인간이 신과 겨루려 들지 마라.", tone: "fierce" },
      { speaker: null, text: "아폴론은 아이네이아스를 페르가모스의 신전으로 데려갔다. 레토와 아르테미스가 상처를 돌봤다." },
    ] },
    // 5.290~296(갑옷이 울리며 쓰러짐). 누가 쓰러뜨려도 맞도록 무기를 적지 않는다. 메넬라오스의 말은 이음 대사(4.160~162의 뜻)
    { id: "pandarus-falls", lines: [
      { speaker: null, text: "판다로스가 쓰러졌다. 번쩍이는 갑옷이 땅에 부딪혀 요란하게 울렸다." },
      { speaker: null, text: "그 자리에서 숨이 끊어졌다. 휴전의 맹세를 깨뜨린 궁수의 끝이었다." },
      { speaker: "menelaus", text: "맹세를 깬 자는 끝내 값을 치른다.", tone: "fierce" },
    ] },
  ],
  // 6.390~502(헥토르와 안드로마케), 7.433~441(방벽과 도랑 — 3장의 무대), 8권(제우스의 천둥, 모닥불 천 개), 9권(사절, 리라, 모래알만큼의 선물, 배에 불이 붙기 전에는)
  outro: { id: "outro", lines: [
    { speaker: null, text: "헥토르가 잠시 성으로 들어갔다. 스카이아이 문 곁에서 아내 안드로마케와 어린 아들 아스티아낙스를 만났다." },
    { speaker: "andromache", text: "당신의 그 용기가 결국 당신을 죽일 거예요. 당신은 제게 아버지이자 어머니, 오라버니이자 남편이에요.", tone: "grief" },
    { speaker: "hector", text: "부인, 나도 그 걱정을 모르지 않소. 그러나 겁쟁이처럼 싸움을 피하면 트로이 사람들 앞에 낯을 들 수 없소.", tone: "calm" },
    { speaker: null, text: "아이가 번쩍이는 투구에 놀라 울자 헥토르와 안드로마케가 웃었다. 헥토르는 투구를 벗고 아들을 안아 올렸다." },
    { speaker: "hector", text: "제우스시여, 훗날 사람들이 이 아이를 두고 아비보다 훨씬 낫다고 말하게 하소서.", tone: "calm" },
    { speaker: null, text: "헥토르는 다시 투구를 쓰고 싸움터로 돌아갔다. 안드로마케는 몇 번이고 뒤돌아보며 울었다.", tone: "grief" },
    { speaker: null, text: "그리스군은 배 앞에 방벽을 쌓고 도랑을 팠다. 며칠 뒤 제우스가 이다산에서 천둥을 울리자 그리스군은 배 앞까지 밀렸다." },
    { speaker: null, text: "그날 밤 트로이군은 들판에 모닥불 천 개를 피우고 새벽을 기다렸다." },
    { speaker: null, text: "아가멤논이 오디세우스와 대 아이아스, 포이닉스를 아킬레우스에게 보냈다. 브리세이스를 돌려주고 큰 선물을 더하겠다고 했다." },
    { speaker: null, text: "아킬레우스는 리라를 뜯으며 영웅들의 이야기를 노래하고 있었다." },
    { speaker: "achilles", text: "모래알만큼 선물을 쌓아도 내 마음은 돌아서지 않네. 헥토르가 미르미돈의 배에 불을 지르기 전에는 싸우지 않겠네.", tone: "fierce" },
    { speaker: null, text: "사절은 빈손으로 돌아왔다." },
  ] },
  defeat: { id: "defeat", lines: [
    { speaker: null, text: "그리스군의 대열이 무너졌다. 트로이군이 함성을 지르며 배 쪽으로 밀려왔다." },
    { speaker: "agamemnon", text: "물러나라! 배 앞에서 다시 전열을 세운다!", tone: "fierce" },
  ] },
};

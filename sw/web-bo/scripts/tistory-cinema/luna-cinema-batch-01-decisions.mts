import fs from 'node:fs';
import path from 'node:path';

const inputPath = 'D:/blog-assets/tistory-cinema/luna-cinema-batch-01-input.json';
const outputPath = 'D:/blog-assets/tistory-cinema/luna-cinema-batch-01-review.json';
const input = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as {
  generatedAt: string;
  basis: string;
  previous: unknown;
  rawCount: number;
  dedupCount: number;
  unresolved: unknown[];
  rows: Array<Record<string, unknown>>;
};

type Patch = {
  decision: 'keep' | 'revise' | 'unresolved';
  after?: string;
  review_en_after?: string;
  reason: string;
  verified_sources: Array<{ url: string; note: string }>;
};

const patches: Record<string, Patch> = {
  '06fbc778-312a-484b-80de-8979c1022960': {
    decision: 'keep',
    reason: 'RUSSH와 No Film School에 인용과 21세기 목록의 4위가 같은 뜻으로 확인된다. 현재 한국어와 영문은 보존한다.',
    verified_sources: [
      { url: 'https://www.russh.com/quentin-tarantino-20-favourite-films-21st-century/', note: '덩케르크 4위와 재관람에 관한 인용을 확인했다.' },
      { url: 'https://nofilmschool.com/tarantinos-top-films-21st-century', note: '같은 21세기 선호 목록과 인용을 교차 확인했다.' },
    ],
  },
  '59ef4b29-1fe0-4e4a-a444-2a228dde37ba': {
    decision: 'keep',
    reason: 'RUSSH 원문에서 순위와 에드거 라이트·로메로·인용하기 좋은 영화에 관한 인용을 확인했다. 현재 문장은 보존한다.',
    verified_sources: [
      { url: 'https://www.russh.com/quentin-tarantino-20-favourite-films-21st-century/', note: '새벽의 황당한 저주에 관한 순위와 직접 인용을 확인했다.' },
    ],
  },
  'b3dd891b-196c-4819-aea2-45ffcb30e300': {
    decision: 'revise',
    after: '타란티노의 21세기 최고 영화 10위다. "오웬 윌슨을 정말 못 참겠다. 처음 볼 때 영화는 사랑하면서 그를 미워했다. 두 번째 볼 때 \'좀 덜 짜증내자, 그렇게 나쁘지 않네\'라고 생각했다. 세 번째 볼 때는 그에게만 시선이 갔다."',
    review_en_after: 'This is Tarantino\'s tenth greatest film of the twenty-first century. "I really couldn\'t stand Owen Wilson. The first time I watched it I loved the film and hated him. The second time I thought, \'Let me be a little less irritated — he\'s not that bad.\' The third time, I found myself watching only him."',
    reason: 'No Film School과 RUSSH의 원문은 세 번째 관람 때 윌슨만 보고 있었다는 뜻이다. 기존 한국어의 ‘그만 보게 됐다’와 영문의 ‘gotten over it’은 의미가 달라 해당 문장만 맞춘다.',
    verified_sources: [
      { url: 'https://nofilmschool.com/tarantinos-top-films-21st-century', note: '세 번째 관람에 관한 원문을 확인했다.' },
      { url: 'https://www.russh.com/quentin-tarantino-20-favourite-films-21st-century/', note: '같은 인용의 재현을 교차 확인했다.' },
    ],
  },
  '746f6e82-42fc-4469-acf0-e26435da3c26': {
    decision: 'keep',
    reason: 'No Film School의 원문에서 데이 루이스에 대한 칭찬과 폴 다노·오스틴 버틀러에 대한 인용을 확인했다. 직접 인용이므로 표현을 보존한다.',
    verified_sources: [
      { url: 'https://nofilmschool.com/tarantinos-top-films-21st-century', note: '순위와 두 배우에 관한 인용을 확인했다.' },
    ],
  },
  '0023a1c6-bff0-459b-af8e-3a3a86f83dcb': {
    decision: 'keep',
    reason: 'RUSSH와 No Film School에서 영화의 순위·재관람·지옥의 묵시록과의 비교·러닝타임 인용을 확인했다. 현재 문장은 보존한다.',
    verified_sources: [
      { url: 'https://www.russh.com/quentin-tarantino-20-favourite-films-21st-century/', note: '블랙 호크 다운에 관한 긴 인용을 확인했다.' },
      { url: 'https://nofilmschool.com/tarantinos-top-films-21st-century', note: '같은 인용을 교차 확인했다.' },
    ],
  },
  'fbe04cb4-e82b-4024-9674-2de4b59939dc': {
    decision: 'revise',
    after: '타란티노는 2012년 《Sight & Sound》 감독 투표에서 《캐리》를 자신이 고른 12편 가운데 하나로 포함했다. 그는 브라이언 드 팔마를 주요 영화적 영향으로 자주 언급했으며, 이 작품은 그의 선호 영화 목록에 반복해서 등장한다.',
    review_en_after: 'Tarantino included Carrie among the twelve films he chose for the 2012 Sight & Sound directors\' poll. He has frequently cited Brian De Palma as a major influence, and Carrie appears repeatedly on his favorite-film lists.',
    reason: 'BFI와 타란티노의 2012년 목록은 《캐리》의 선호와 포함 사실을 확인하지만, 현재 인용 URL에서 드 팔마 대화의 문장과 ‘유일한 호러 영화’라는 표현을 확인하지 못했다. 확인된 목록 정보와 반복된 선호만 남겨 부분 수정한다.',
    verified_sources: [
      { url: 'https://www.bfi.org.uk/lists/10-great-films-influenced-quentin-tarantino', note: '타란티노가 2002년과 2012년 Sight & Sound 투표에서 캐리를 골랐다는 사실을 확인했다.' },
      { url: 'https://www.tarantino.info/2012/08/quentin-tarantinos-all-time-top-12-favorite-movies/', note: '2012년 12편 목록과 캐리의 포함을 확인했다.' },
    ],
  },
  '9c4f184d-5daf-434d-b66f-ad3c365e3313': {
    decision: 'revise',
    after: '타란티노가 The Big Picture 팟캐스트에서 추천한 존 미나한의 소설화 작품이다. 그는 미나한을 자신이 가장 좋아하는 영화 소설화 작가라고 했다. 원작 영화 《September 30, 1955》는 제임스 딘이 세상을 떠난 뒤의 하루를 배경으로 하며, 미나한의 소설은 영화보다 앞선 주인공의 대학 시절부터 이야기를 확장한다.',
    review_en_after: 'It is a John Minahan novelization that Tarantino recommended on The Big Picture podcast. He called Minahan his favorite novelization writer. The film *September 30, 1955* takes place on the day after James Dean\'s death, while Minahan\'s novel expands the story back to the protagonist\'s first years at college, three years before the film.',
    reason: 'The Big Picture 대화는 미나한을 타란티노가 가장 좋아하는 소설화 작가라고 한 사실과 작품의 시간 배경·대학 시절부터 확장된 소설 구조를 확인한다. 출처에 없는 ‘원스 어폰 어 타임 인 할리우드 집필의 핵심 영감’ 주장은 제거한다.',
    verified_sources: [
      { url: 'https://podscripts.co/podcasts/the-big-picture/quentin-tarantino-on-once-upon-a-time-in-hollywood-the-book', note: '미나한에 대한 평가와 September 30, 1955 소설화의 배경·확장 구조를 확인했다.' },
    ],
  },
  'c0ba959f-f09a-48fa-b93b-921a4d150166': {
    decision: 'revise',
    after: '페드로 알모도바르는 여러 매체와 투표에서 고른 영화 목록에 알프레드 히치콕의 《현기증》을 포함시켰다.',
    review_en_after: 'Pedro Almodóvar included Alfred Hitchcock\'s *Vertigo* in a list of films compiled from his selections in interviews and polls.',
    reason: 'Film Stage 기사 자체가 목록은 상위 일부를 반복 언급 순으로 제시하고 나머지는 느슨한 순서라고 설명하므로, 33번째라는 숫자를 선호 순위처럼 쓰지 않는다. 기존의 인터뷰·색채·작품 변주에 관한 문장도 현재 출처에서 확인되지 않아 확인된 목록 정보만 남겨 부분 수정한다.',
    verified_sources: [
      { url: 'https://thefilmstage.com/pedro-almodovars-favorite-films-of-all-time/', note: 'MUBI가 여러 투표·선정에서 모은 43편 목록과 Vertigo 33위를 확인했다.' },
    ],
  },
  '37b28b1e-5325-456f-89b2-012bb44213dc': {
    decision: 'unresolved',
    reason: 'Social Media Examiner 원문은 잭 킹의 튜토리얼·제작 방식과 소셜미디어 활동을 다루지만 히치콕이나 《현기증》을 언급하지 않는다. 관계를 확정할 별도 원문을 찾기 전까지 현재 DB 문장을 보류하고 보존한다.',
    verified_sources: [
      { url: 'https://www.socialmediaexaminer.com/video-creator-to-traditional-media-star-the-zach-king-story/', note: '페이지 본문에 Hitchcock·Vertigo 관련 내용이 없는 것을 확인했다.' },
    ],
  },
  '81d4ae82-164f-4ae2-82ae-5085f2c911ea': {
    decision: 'revise',
    after: '《시네마》에서 들뢰즈는 히치콕을 ‘사유를 주는’ 감독으로 논했다. 그는 시간·사유·감정·삶처럼 프레임 안에 실제로 존재하지 않는 ‘더 불안한 현존’을 설명하며, 히치콕이 관계 자체를 이미지의 대상으로 만드는 정신-이미지를 도입했다고 분석했다.',
    review_en_after: 'In *Cinema*, Deleuze discusses Hitchcock as a director who “gives thought.” He describes the “more disturbing presence” of time, thought, emotion, and life that does not literally exist within the frame, and argues that Hitchcock introduces the mental image, in which relation itself becomes the object of the image.',
    reason: '현재 출처는 들뢰즈가 히치콕을 사유와 정신-이미지의 사례로 분석하고 관계 자체를 이미지의 대상으로 본다는 점을 확인한다. 출처에서 확인되지 않는 ‘카메라가 자신의 운동을 따르는 위대한 순간들’은 제거하고 핵심 해설은 유지한다.',
    verified_sources: [
      { url: 'https://en.wikipedia.org/wiki/Cinema_1:_The_Movement_Image', note: '히치콕의 ‘사유를 주는’ 감독, 더 불안한 현존, 정신-이미지와 관계 자체에 관한 설명을 확인했다.' },
    ],
  },
  '53a03043-116e-424c-b45d-bacdbdc3e439': {
    decision: 'keep',
    reason: 'Aaron Swartz의 원문에서 매밋·스타니슬랍스키의 구분, 젊은·늙은 케인의 대비, 딥 포커스와 긴 화면, 시간 배열에 대한 평가를 모두 확인했다. 현재 한국어와 영문은 보존한다.',
    verified_sources: [
      { url: 'http://www.aaronsw.com/weblog/kane', note: '원문 전체를 직접 확인했다.' },
    ],
  },
  '1b47f109-133b-40a4-a5b1-5f916893af8e': {
    decision: 'revise',
    after: '제임스 왓슨은 자서전에서 먼 친척 오슨 웰스의 대담함이 자신에게 호소했다고 썼다. 웰스의 할머니는 왓슨 가문 사람이었고, 왓슨의 아버지의 삼촌인 시카고 화가 더들리 크래프츠 왓슨이 어린 시절의 웰스를 일부 길렀다. 더들리는 웰스의 성공담을 조카 가족에게 들려주곤 했다. 왓슨이 가장 인상 깊게 본 것은 웰스의 대담함이었다. ‘우주 전쟁’ 라디오 방송 해프닝부터 획기적인 영화 《시민 케인》까지, 그가 보여 준 도전이 왓슨에게 깊은 인상을 남겼다. 왓슨은 “과학자의 영웅이 반드시 미생물학자일 필요도, 하물며 야구 선수일 필요도 없다”고 썼다.',
    review_en_after: 'In his memoir, James Watson wrote that the audacity of his distant cousin Orson Welles appealed to him. Welles\'s grandmother was a member of the Watson family, and Watson\'s father\'s uncle, Chicago artist Dudley Crafts Watson, partly raised Welles when he was young. Dudley delighted in telling his nephew\'s family about Orson\'s successes. What appealed to Watson most was Welles\'s audacity, from the War of the Worlds radio hoax to the groundbreaking film *Citizen Kane*. Watson wrote that a scientist\'s hero need not be a microbiologist, let alone a baseball player.',
    reason: '회고록 원문은 더들리가 웰스를 일부 길렀다고 하며 관계를 ‘아버지의 삼촌’으로 설명한다. 기존의 ‘대고모부’와 웰스 가족과 가까이 지냈다는 표현을 바로잡고, 왓슨이 웰스의 대담함에 끌렸다는 원문의 의미에 맞춰 한국어·영문을 함께 조정한다.',
    verified_sources: [
      { url: 'https://www.amazon.com/Avoid-Boring-People-Lessons-Science/dp/0375727140', note: 'Watson 회고록의 인용 출처로 등록된 원본 도서 페이지다.' },
      { url: 'https://media.public.gr/Books-PDF/9780192802736-0266458.pdf', note: '회고록 미리보기에서 Welles의 할머니, Dudley Crafts Watson의 관계와 ‘scientist\'s hero’ 문장을 직접 확인했다.' },
    ],
  },
  'e02ca4a4-a905-4e19-8290-a243432f9f8a': {
    decision: 'revise',
    after: '페드로 알모도바르는 여러 매체와 투표에서 고른 영화 목록에 오슨 웰스의 데뷔작 《시민 케인》을 포함시켰다.',
    review_en_after: 'Pedro Almodóvar included Orson Welles\'s feature debut, *Citizen Kane*, in a list of films compiled from his selections in interviews and polls.',
    reason: 'Film Stage 기사 자체가 목록은 상위 일부를 반복 언급 순으로 제시하고 나머지는 느슨한 순서라고 설명하므로, 36번째라는 숫자를 선호 순위처럼 쓰지 않는다. Fantastic Man 인터뷰·슈퍼 8·화면 깊이에 관한 기존 문장도 현재 출처에서 확인되지 않아 확인된 목록 정보만 남겨 부분 수정한다.',
    verified_sources: [
      { url: 'https://thefilmstage.com/pedro-almodovars-favorite-films-of-all-time/', note: 'MUBI가 여러 선정에서 모은 43편 목록과 Citizen Kane 36위를 확인했다.' },
    ],
  },
  '15de3251-e5cc-4cfa-8275-ebd6d8e3abc5': {
    decision: 'revise',
    after: '오즈 야스지로는 《시민 케인》을 자신이 가장 사랑한 외국 영화로 꼽았다. 1943년 싱가포르에 선전영화를 만들러 파견됐을 때 일본군이 압수한 미국 영화 프린트들 사이에서 이 작품을 발견했고, 여러 차례 돌려 봤다고 전해진다. 이 영화를 본 뒤 “이렇게 놀라운 영화를 만드는 나라와는 전쟁에서 이길 수 없다”고 탄식했다는 일화도 있다.',
    review_en_after: 'Yasujiro Ozu called *Citizen Kane* his favorite foreign film. In 1943, while stationed in Singapore as a propaganda filmmaker, he found it among American prints confiscated by the Japanese army and reportedly watched it repeatedly. One account says that after seeing it, he lamented, “We cannot possibly win a war against a country that produces movies as amazing as this.”',
    reason: 'Harvard Film Archive는 1943년 싱가포르 파견과 압수된 미국 영화 프린트·시민 케인의 반복 관람을 확인한다. Japan Foundation 자료는 영화 직후의 탄식 일화를 전하지만, 기존의 ‘귀국 후 동료들에게 영화의 정의를 바꾸었다’는 문장은 확인되지 않아 실제 일화로 교체한다.',
    verified_sources: [
      { url: 'https://harvardfilmarchive.org/programs/the-complete-yasujiro-ozu/2', note: '싱가포르 파견, 압수된 미국 프린트, Citizen Kane을 가장 좋아한 외국 영화로 본 사실을 확인했다.' },
      { url: 'https://www.bookmark.jpf.go.jp/media/2024/10/JBNPDF47.pdf', note: '점령지 싱가포르에서 Citizen Kane을 본 뒤의 전쟁 관련 탄식 일화를 확인했다.' },
    ],
  },
  '6dd247d6-e6a8-4be4-9d51-c5b980f79448': {
    decision: 'unresolved',
    reason: 'RealSound 원문은 《사카모토 도서》 연재가 오즈 야스지로를 다룬다는 점과 36회 연재라는 구조는 확인하지만, 《동경 이야기》·《12》·자서전의 해당 문장을 확인하지 못했다. 관계를 직접 지지하는 자료가 없으므로 현재 DB 문장은 보류하고 보존한다.',
    verified_sources: [
      { url: 'https://realsound.jp/book/2023/09/post-1442365.html', note: '사카모토 도서 연재와 오즈 언급은 확인했으나 Tokyo Story·12·자서전 주장은 확인하지 못했다.' },
    ],
  },
  '1c276836-2e97-4038-bb70-61867b46023a': {
    decision: 'unresolved',
    reason: 'Criterion의 이시구로 목록은 오즈의 《늦봄》을 8위로 고르며 《동경 이야기》와 기존 인용을 확인하지 않는다. 다른 직접 근거가 확보되기 전까지 현재 DB 문장을 보류하고 보존한다.',
    verified_sources: [
      { url: 'https://www.criterion.com/current/top-10-lists/518-kazuo-ishiguro-s-top-10', note: '목록에 Ozu의 Late Spring이 있고 Tokyo Story가 없는 것을 확인했다.' },
    ],
  },
  'e18b5d2f-43af-41c2-bce7-fb2fedbf8b36': {
    decision: 'keep',
    reason: '1ROW 영상의 자막에서 이명세가 《동경 이야기》를 보며 울었다는 말, 돌담길 이동 장면과 노부부에 대한 평가, 사람과 골목길의 영원성에 관한 발언을 확인했다. 현재 문장은 보존한다.',
    verified_sources: [
      { url: 'https://www.youtube.com/watch?v=Exsf2ShvVuw', note: '한국어 자막과 해당 발언 구간을 직접 확인했다.' },
    ],
  },
  'e49ee4ea-b110-4e02-8cb9-ac64533d9994': {
    decision: 'keep',
    reason: 'Interview Magazine 원문에서 마돈나의 계단 장면·반복 재생·춤에 관한 직접 인용을 확인했다. 현재 문장과 영문을 보존한다.',
    verified_sources: [
      { url: 'https://www.interviewmagazine.com/music/madonna-1', note: '2014년 인터뷰의 해당 직접 인용을 확인했다.' },
    ],
  },
  '771266cf-4121-4add-95d9-2a1d8a597196': {
    decision: 'unresolved',
    reason: 'Far Out 원문에서 안야 테일러조이의 네 편은 Hook, Almost Famous, Interview with the Vampire, Forrest Gump로 제시되며 《화양연화》와 Letterboxd 대화·인용은 확인되지 않는다. 현재 DB 문장은 보류하고 보존한다.',
    verified_sources: [
      { url: 'https://faroutmagazine.co.uk/anya-taylor-joy-four-favourite-movies/', note: '원문에 제시된 네 편과 In the Mood for Love 부재를 확인했다.' },
    ],
  },
  '60992df4-3e2f-46e8-9258-956c88feb449': {
    decision: 'revise',
    review_en_after: 'In Susan Sontag\'s 1977 list of films, *2001: A Space Odyssey* ranked second, immediately after Bresson\'s *Pickpocket*.',
    reason: 'Open Culture 원문은 한국어의 순위 정보만 확인한다. 영문에 추가된 손택의 SF 에세이·HAL·비평 틀에 관한 확장 해설은 해당 출처에서 확인되지 않아 한국어 의미에 맞게 영문만 축소한다.',
    verified_sources: [
      { url: 'https://www.openculture.com/2013/12/susan-sontags-50-favorite-films.html', note: '1977년 목록에서 Pickpocket 1위, 2001 2위를 확인했다.' },
    ],
  },
  '57e9a5ac-aee2-45fe-a229-8ca0c2adb591': {
    decision: 'unresolved',
    reason: '등록된 Berkeley 원문 URL은 현재 404로 응답했고, 검색 가능한 대체 원문에서 Russell이 Human Compatible에서 HAL을 인용했다는 관계를 직접 확인하지 못했다. 접근 실패를 날조 판정으로 삼지 않고 현재 DB 문장을 보류·보존한다.',
    verified_sources: [
      { url: 'https://people.eecs.berkeley.edu/~russell/hc.html', note: '현재 URL이 404로 응답해 원문 확인이 불가능했다.' },
    ],
  },
  '85c52692-cbbc-4072-b70d-7475b5359956': {
    decision: 'revise',
    after: '데니 빌뇌브는 《2001 스페이스 오디세이》를 가장 좋아하는 영화이자 꾸준한 영감의 원천으로 꼽았다. 그는 이 작품을 본 뒤 첫 “영화적 충격”을 받았다고 말했다. 이 작품은 그가 고른 17편의 영화 목록에서 1위에 올랐다.',
    review_en_after: 'Denis Villeneuve has described *2001: A Space Odyssey* as his favorite film and a continuing source of inspiration. He said that watching it gave him his first “cinematic shock.” The film ranked first on the list of 17 favorites attributed to him.',
    reason: 'Far Out 원문은 《2001》을 빌뇌브의 최애 영화·지속적인 영감·첫 영화적 충격·17편 목록 1위로 확인한다. 계단 난간, 2018년 칸 심사위원 인터뷰, 듄·블레이드 러너의 화면 분석은 해당 출처에서 확인되지 않아 삭제하고 확인된 핵심만 유지한다.',
    verified_sources: [
      { url: 'https://faroutmagazine.co.uk/denis-villeneuve-17-favourite-films/', note: '첫 영화적 충격과 17편 목록 1위를 포함한 원문을 확인했다.' },
    ],
  },
  '8ca9607a-ba81-44c9-afc5-bf5c5877be26': {
    decision: 'revise',
    after: '매즈 미켈슨은 《택시 드라이버》가 자신의 영화 제작 관점을 완전히 바꿨다고 말했다. 그는 이 영화를 가장 좋아하는 영화로 꼽으며, 본 뒤 맡은 캐릭터에 딜레마를 만들려고 했고 완전히 선하거나 악한 인물로 연기하지 않는다고 설명했다.',
    review_en_after: 'Mads Mikkelsen said that *Taxi Driver* completely changed his perspective on filmmaking. He called it his favorite film and explained that, ever since seeing it, he has tried to create a dilemma in the characters he plays rather than portraying them as completely good or completely bad.',
    reason: 'Far Out 원문은 영화 제작 관점의 변화와 캐릭터에 딜레마를 만들며 완전히 선하거나 악하게 연기하지 않는다는 발언을 확인한다. 원문에 없는 20대의 독백 암기와 스코세이지 앞 암송 일화는 제거한다.',
    verified_sources: [
      { url: 'https://faroutmagazine.co.uk/mads-mikkelsen-five-favourite-movies/', note: 'Taxi Driver를 가장 좋아하는 영화로 고른 대목과 직접 인용을 확인했다.' },
    ],
  },
  'b15dec07-cd1d-4a24-885c-b2d133059daa': {
    decision: 'revise',
    after: '페드로 알모도바르는 여러 매체와 투표에서 고른 영화 목록에 마틴 스코세이지의 《택시 드라이버》를 포함시켰다.',
    review_en_after: 'Pedro Almodóvar included Martin Scorsese\'s *Taxi Driver* in a list of films compiled from his selections in interviews and polls.',
    reason: 'Film Stage 기사 자체가 목록은 상위 일부를 반복 언급 순으로 제시하고 나머지는 느슨한 순서라고 설명하므로, 38번째라는 숫자를 선호 순위처럼 쓰지 않는다. 도시·마드리드·《신경쇠약 직전의 여자》에 관한 기존 인터뷰 문장도 현재 출처에서 확인되지 않아 확인된 목록 정보만 남겨 부분 수정한다.',
    verified_sources: [
      { url: 'https://thefilmstage.com/pedro-almodovars-favorite-films-of-all-time/', note: 'MUBI가 여러 선정에서 모은 43편 목록과 Taxi Driver 38위를 확인했다.' },
    ],
  },
  '73d588ab-bc53-43cb-a0f4-9ab6d7b7317a': {
    decision: 'keep',
    reason: 'W Korea 인터뷰 검색 원문에서 최승현이 어린 시절 본 뒤 재관람할 때마다 해석이 달라지고, 작은 손동작에 드러나는 드니로의 섬세한 연기를 좋아한다고 한 내용을 확인했다. 현재 문장은 보존한다.',
    verified_sources: [
      { url: 'https://www.wkorea.com/2013/11/25/%EB%B0%B0%EC%9A%B0%EB%8F%84-%EC%95%84%EC%9D%B4%EB%8F%8C%EB%8F%84-%EC%95%84%EB%8B%8C-27%EC%84%B8%EC%9D%98-%EC%B5%9C%EC%8A%B9%ED%98%842/', note: '택시 드라이버와 드니로 연기에 관한 인터뷰 원문을 확인했다.' },
    ],
  },
  '2b9bb315-acb8-4ec1-a1a0-a25e04aa7327': {
    decision: 'keep',
    reason: 'Lex Fridman의 탈 윌켄펠드 대담에서 프리드먼이 Taxi Driver를 사랑한다고 말하고 트래비스 비클의 깊은 외로움을 설명한 뒤 질문한 흐름을 확인했다. 현재 문장은 보존한다.',
    verified_sources: [
      { url: 'https://lexfridman.com/tal-wilkenfeld-transcript/', note: '34:40 부근의 Taxi Driver 대담 원문을 확인했다.' },
    ],
  },
  '329d2f1a-b749-47f7-8981-6bb35ab679f7': {
    decision: 'revise',
    after: '레오나르도 디카프리오는 열다섯 살 때 본 《택시 드라이버》에 크게 사로잡혔다고 말했다. 그는 트래비스 비클의 고립과 외로움에 깊이 이입했다고 회고했으며, 마틴 스코세이지와는 이후 여섯 편의 장편을 함께 만들었다.',
    review_en_after: 'Leonardo DiCaprio said that *Taxi Driver* had a serious impact on him. He recalled being especially struck by Robert De Niro\'s Travis Bickle and feeling deeply invested in the character\'s isolation and loneliness. He and Martin Scorsese have since made six feature films together.',
    reason: 'Far Out와 Los Angeles Times는 《택시 드라이버》가 디카프리오에게 큰 영향을 줬고, 열다섯 살 때 트래비스 비클의 고립과 외로움에 사로잡혔다는 회고를 확인한다. 기존 한국어의 ‘가장 인상 깊은 연기’는 원문보다 넓고, 현재 출처가 직접 확인하지 않는 협업 설명은 독립 근거로 여섯 편의 장편이라는 사실만 남겨 한영을 맞춘다.',
    verified_sources: [
      { url: 'https://faroutmagazine.co.uk/leonardo-dicaprio-favourite-films-list/', note: 'Taxi Driver가 디카프리오에게 큰 영향을 준 영화라는 대목을 확인했다.' },
      { url: 'https://www.latimes.com/archives/la-xpm-2010-feb-07-la-ca-scorsese7-story.html', note: '열다섯 살 때 본 영화와 트래비스 비클의 고립·외로움에 대한 회고를 확인했다.' },
      { url: 'https://en.wikipedia.org/wiki/Martin_Scorsese_and_Leonardo_DiCaprio', note: '두 사람이 여섯 편의 장편을 함께 만들었다는 협업 목록을 확인했다.' },
    ],
  },
  '676c9cb6-c8f3-4f6e-a527-8403963b3861': {
    decision: 'unresolved',
    reason: '현재 등록된 Far Out의 디카프리오 일곱 편 목록에는 《샤이닝》이 없고, 큐브릭과의 관계·2001과의 병렬 선호를 확인할 수 없다. 다른 직접 근거를 확보하기 전까지 현재 DB 문장을 보류하고 보존한다.',
    verified_sources: [
      { url: 'https://faroutmagazine.co.uk/leonardo-dicaprio-favourite-films-list/', note: '디카프리오의 일곱 편 목록에 2001·택시 드라이버·자전거 도둑·에덴의 동쪽 등이 있으나 The Shining은 없는 것을 확인했다.' },
    ],
  },
  '89240986-9d19-468b-a39d-96dd8069d75f': {
    decision: 'revise',
    after: '레오나르도 디카프리오는 레터박스드 대화에서 마틴 스코세이지에게 소개한 영화로 미야자키 하야오의 《센과 치히로의 행방불명》을 먼저 언급했고, 《모노노케 히메》도 가능성으로 덧붙였다. 스코세이지는 《센과 치히로의 행방불명》을 디카프리오가 보라고 말했던 영화라고 확인했다.',
    review_en_after: 'In a Letterboxd conversation, Leonardo DiCaprio first mentioned Hayao Miyazaki\'s *Spirited Away* as a film he had introduced to Martin Scorsese, adding *Princess Mononoke* as another possibility. Scorsese confirmed that *Spirited Away* was the film DiCaprio had told him to watch.',
    reason: 'Letterboxd 대화를 전한 GamesRadar와 CinemaCafe 원문은 《센과 치히로의 행방불명》을 디카프리오가 스코세이지에게 보라고 소개했고 《모노노케 히메》도 언급했다는 사실을 확인한다. 기존의 ‘유일한 영화’와 따옴표 문장은 대화의 실제 화자·범위와 달라 한영을 함께 바로잡는다.',
    verified_sources: [
      { url: 'https://www.gamesradar.com/entertainment/anime-movies/leonardo-dicaprio-introduced-martin-scorsese-to-studio-ghibli-movies-and-his-first-two-choices-were-solid/', note: 'Letterboxd 대화의 두 작품 언급과 Scorsese의 확인을 직접 인용으로 확인했다.' },
      { url: 'https://s.cinemacafe.net/article/2024/01/17/89545.html', note: '같은 대화의 일본어 보도와 발화자 구분을 교차 확인했다.' },
      { url: 'https://embed.letterboxd.com/journal/spirited-away-deep-impact-anniversary/', note: 'Letterboxd 편집 기사에서 DiCaprio가 Scorsese에게 이 영화를 소개했다는 사실을 확인했다.' },
    ],
  },
  '051b5b96-9011-48d1-aca6-ecd8edb9f392': {
    decision: 'revise',
    after: '레오나르도 디카프리오는 자신이 고른 일곱 편의 영화 목록에서 《2001: 스페이스 오디세이》를 첫머리에 올렸다. 그는 이 작품을 “영화를 넘어선, 영적인 경험”이라고 말하며, 볼수록 더 많은 질문을 던진다고 설명했다.',
    review_en_after: 'Leonardo DiCaprio placed *2001: A Space Odyssey* first on a list of seven films he selected as favorites. He called it “beyond a movie — a spiritual experience” and explained that the more you watch it, the more questions it asks.',
    reason: 'Far Out 원문은 디카프리오의 일곱 편 목록에서 《2001》이 1위이고, 영적인 경험·반복 관람과 질문에 관한 발언을 확인한다. VHS와 크리스토퍼 놀란의 시네라마 돔 상영 일화는 출처에서 확인되지 않아 제거한다.',
    verified_sources: [
      { url: 'https://faroutmagazine.co.uk/leonardo-dicaprio-favourite-films-list/', note: '일곱 편 목록의 2001 1위와 해당 직접 인용을 확인했다.' },
    ],
  },
};

function makeRecord(row: Record<string, unknown>, index: number, patch?: Patch) {
  const before = String(row.current_review ?? '');
  const reviewEnBefore = String(row.review_en ?? '');
  if (!patch) {
    return {
      index,
      ...row,
      decision: 'deferred',
      before,
      after: before,
      review_en_before: reviewEnBefore,
      review_en_after: reviewEnBefore,
      reason: '초기 30건 뒤의 대기 항목. 초기 표본 확인 후 이어서 판정한다.',
      verified_sources: [],
      db_action: 'not_in_initial_batch',
    };
  }
  return {
    index,
    ...row,
    decision: patch.decision,
    before,
    after: patch.after ?? before,
    review_en_before: reviewEnBefore,
    review_en_after: patch.review_en_after ?? reviewEnBefore,
    reason: patch.reason,
    source_url: row.source_url,
    verified_sources: patch.verified_sources,
    db_guard: {
      id: row.rid,
      celeb_id: row.celeb_id,
      content_id: row.content_id,
      expected_review: before,
    },
    db_action: patch.decision === 'unresolved' ? 'hold' : 'pending_parent_random_check',
  };
}

const initialRows = input.rows.slice(0, 30).map((row, index) => {
  const rid = String(row.rid);
  const patch = patches[rid];
  if (!patch) throw new Error(`Missing decision for initial row ${index + 1}: ${rid}`);
  return makeRecord(row, index + 1, patch);
});
const deferredRows = input.rows.slice(30).map((row, index) => makeRecord(row, index + 31));
const counts = initialRows.reduce(
  (acc, row) => {
    const decision = String(row.decision);
    if (decision === 'keep' || decision === 'revise' || decision === 'unresolved') acc[decision] += 1;
    return acc;
  },
  { keep: 0, revise: 0, unresolved: 0 },
);

const output = {
  generatedAt: new Date().toISOString(),
  status: 'awaiting_parent_random_check',
  dbWrites: 0,
  basis: '현재 DB celeb_contents 관계 ID 기준. 이전 통독 관계는 inventory에서 제외했고, 초기 30건은 연속 발행순으로 구성했다.',
  sourceInput: inputPath,
  summary: {
    rawCandidateCount: input.rawCount,
    currentDedupCount: input.dedupCount,
    previousSkippedCount: Array.isArray(input.previous) ? input.previous.length : 0,
    initialCount: initialRows.length,
    deferredCount: deferredRows.length,
    ...counts,
  },
  rows: initialRows,
  deferred: deferredRows,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ outputPath, initialCount: initialRows.length, deferredCount: deferredRows.length, counts }, null, 2));

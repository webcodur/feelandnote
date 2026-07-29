-- 활성 + 감상여정 비정형 작품명 추출군 61~80번의 조사 결과로 감상여정을 교정한다.
--
-- 결과:
--   - 20명 모두 작품 단위의 직접 감상과 서비스 메타데이터가 함께 통과한 후보가 없다.
--   - 경기·훈련 영상은 작품명과 정식 콘텐츠 식별자가 없고, 본인 경기·창작·연주는 소비에서 제외한다.
--   - 장르·저자·가수 선호, 교육·후원·문화적 영향은 특정 작품 소비로 확장하지 않는다.
--   - 이번 단계는 표적 검증이므로 전면 조사 완료를 뜻하지 않는다. 전원 light/open/0을 유지한다.

BEGIN;

DO $$
DECLARE
  affected integer;
  wrong_count integer;
BEGIN
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('129d506a-148f-439e-86df-794fb2a24a86'::uuid, '6a19f831310af6e89928ab4a093a99a8', 'ea268ae0463b090ba10394f2558bf44a'),
      ('1d9cc3b9-6c4c-4f3b-8f87-af14ff7921a0'::uuid, '32a6320465249aa18ca527b97ca8cbf5', 'c6e0a6c76a7a4ee03cd77601a4adb226'),
      ('28126d70-5831-4f94-91e3-954ffc39383f'::uuid, 'c613542440a07d0e763e66ecc2f660c7', '029cb1b5c81d31d5d7fc3acff01a96a8'),
      ('353f981d-2fe1-4bc4-a7fd-d38c15e32dfa'::uuid, '8d246b9c70fa8aa0f49912270bd95148', '898f2a98774277b7f9fe1c4a94507ac9'),
      ('3b7ce906-bf9a-444f-b29b-411a91007630'::uuid, 'd303443d6c6411e1e6c3fbf6eb02a7b9', 'da5bdeecfc5ee1388176c2bbca389cd3'),
      ('3f18a767-a7a5-4820-863a-aa2c3de116a5'::uuid, '622869c711c2dc68a6d6bda9f48aea81', 'a719ca66ad341a0c9c4f14d396ae1e8f'),
      ('3f8e9b2c-b257-461a-a041-1c24a5c8050a'::uuid, '8ca054a4d60b2a7c3f81fcc8a65931c4', '2d7dcd5929a885b4bb45229ab6ce73c2'),
      ('53c416ba-59e9-4c29-8011-003df939f6b3'::uuid, 'fe9528cd87ba314aa439f652a4a2a464', '299c76d9e428d73f8bde91725085238d'),
      ('68c50cee-6344-4ee1-9ae5-04f3dce4ffa5'::uuid, 'bc0eb480ddd81f7dc0ce5f27cfc6c189', 'e5ebd8588ea72757046389ff4d358295'),
      ('6b263ca0-0a65-4d8e-9789-6fc3839557f0'::uuid, 'd6dd4438a5a471c51a5210b1abe5aa92', 'f781acd9d51508187c0d3eb7a2389d94'),
      ('6ebeeefb-a074-4026-bc4c-5ad2974ab32c'::uuid, '0caa3c75b6e7e12130c4f51d1cf0f79c', '097a9e48eafbfa6afe3fbb9b82c6eb15'),
      ('796434ba-6750-46e3-82b7-99721d3f2d75'::uuid, '92b2c865890b4654e8c66e2a2d86dace', 'b7457f50e606eeade4961cd81b953ccf'),
      ('7a15201d-1bf9-4538-914c-bc25a2b05cf7'::uuid, '4d77257480b50e67bd23a893bbc750b9', '9efe6c28beb5dba575cd3e00c871c4dd'),
      ('7d064f46-b19c-45e8-ac07-4c6488b43aac'::uuid, 'fa73abfe1b649524204cf73ad6f53c6c', '697832c6bb011902b5d6892934b2bb6a'),
      ('7f106cb4-219f-4ed7-828b-b7776d50f5ec'::uuid, '369b925239323a787afb89df61625e50', '02192bef790b92d3c007068c8d3bcb92'),
      ('967bfd77-be30-4434-b627-05e20e00d8ab'::uuid, '9f1b76575f10e9d1e3cd4c746c456368', '4ff05950f4dfb2f68c5a66b8b300ccac'),
      ('aca86254-35c6-430e-bda6-3048cfe547c0'::uuid, '9741645d374f80792af2f0661d792472', '035fa94648dada23406ffa1f1c857b12'),
      ('c6bc6276-a16a-42b9-b771-33a972950079'::uuid, 'df6ae19a0f23f1c19ea67b87a2c99c7f', '042b25c9d45c8e899f7603d6f9ab87e4'),
      ('d131357a-a289-4006-9d89-dcd00db6e895'::uuid, '227afa218ca74ec6cd9bcd2ba1062adf', '29051e802c003a042e448fa2459f65d6'),
      ('daed2366-f165-43fe-adda-a554958afe3b'::uuid, '9253d03b689c1446f0f5f3e0e826d838', 'e2babe41f0f971b9ae4418802b3ad4e0')
  ) AS expected(id, ko_md5, en_md5)
  LEFT JOIN public.profiles p ON p.id = expected.id
  WHERE p.id IS NULL
     OR p.profile_type IS DISTINCT FROM 'CELEB'
     OR p.status IS DISTINCT FROM 'active'
     OR p.celeb_tier IS DISTINCT FROM 'light'
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR md5(p.cultural_journey) IS DISTINCT FROM expected.ko_md5
     OR md5(p.cultural_journey_en) IS DISTINCT FROM expected.en_md5
     OR EXISTS (
       SELECT 1
       FROM public.user_contents uc
       WHERE uc.user_id = expected.id
     );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '비정형 4차 20명의 본문·상태·0건 기준선이 달라졌습니다. 차이=%',
      wrong_count;
  END IF;

  WITH corrections(id, ko, en) AS (
    VALUES
      (
        '129d506a-148f-439e-86df-794fb2a24a86'::uuid,
        $ko$송종국이 2002년 월드컵을 준비하며 상대 경기 영상을 분석했다는 이야기는 선수의 전술 준비를 보여준다. 그러나 현재 감상여정에는 영상의 제목·제작 주체·공식 에피소드가 없고, 일반 경기 화면을 반복 시청한 일을 하나의 작품으로 식별할 수 없다.

히딩크의 훈련 방식과 페예노르트의 전술도 교육·훈련 경험이다. 작품 단위 콘텐츠가 확인되지 않아 light/open/0을 유지한다.$ko$,
        $en$Accounts of Song Chong-gug studying opponents on video before the 2002 World Cup describe tactical preparation. The profile does not identify a title, producer, or official episode, however, and repeated viewing of unnamed match footage cannot be resolved as one work.

Hiddink's training methods and Feyenoord tactics are also coaching experiences rather than content items. No work-level record is linked, so the profile remains light/open/0.$en$
      ),
      (
        '1d9cc3b9-6c4c-4f3b-8f87-af14ff7921a0'::uuid,
        $ko$거스 히딩크가 2024년 서울시립교향악단 명예 홍보대사를 맡고 축구 감독과 지휘자의 역할을 비교한 사실은 클래식 음악에 대한 관심과 공공 활동을 보여준다.

하지만 특정 작곡가의 작품·음반·공연을 직접 감상했다는 기록은 아니다. 기관 홍보와 장르 선호를 작품 콘텐츠로 바꾸지 않고 light/open/0을 유지한다.$ko$,
        $en$Guus Hiddink's 2024 honorary ambassadorship for the Seoul Philharmonic and his comparison between coaching and conducting show an interest in classical music and a public institutional role.

They do not identify a composition, recording, or performance that he personally experienced. Institutional promotion and genre interest are therefore not converted into a work record, leaving the profile light/open/0.$en$
      ),
      (
        '28126d70-5831-4f94-91e3-954ffc39383f'::uuid,
        $ko$김광현이 박찬호의 메이저리그 활약을 보며 꿈을 키웠다는 서술은 세대 간 스포츠 영향의 맥락이다. 어느 경기·방송·다큐멘터리를 보았는지 작품 단위로 특정되지 않는다.

박찬호의 모습과 김광현의 태도를 연결한 부분도 감상문적 해석이다. 식별 가능한 콘텐츠가 없어 light/open/0으로 둔다.$ko$,
        $en$The account of Kim Kwang-hyun drawing inspiration from Park Chan-ho's Major League career describes generational sporting influence. It does not identify a particular game, broadcast, or documentary as a work.

The comparison between Park's image and Kim's later attitude is also interpretive. With no identifiable content item, the profile remains light/open/0.$en$
      ),
      (
        '353f981d-2fe1-4bc4-a7fd-d38c15e32dfa'::uuid,
        $ko$디에고 시메오네는 카를로스 빌라르도와 마르셀로 비엘사에게서 선수·지도자로서 전술과 훈련법을 배웠다. ‘한 경기씩’이라는 원칙도 그의 감독 철학을 설명한다.

스승의 전술, 훈련장 비디오 분석, 본인의 구호는 외부 작품 감상이 아니다. 작품명과 식별자가 없으므로 light/open/0을 유지한다.$ko$,
        $en$Diego Simeone learned tactics and training methods as a player and coach under Carlos Bilardo and Marcelo Bielsa. His “match by match” principle describes his own managerial philosophy.

A mentor's tactics, video-analysis sessions at training, and Simeone's own maxim are not consumption of an external work. With no title or identifier, the profile remains light/open/0.$en$
      ),
      (
        '3b7ce906-bf9a-444f-b29b-411a91007630'::uuid,
        $ko$황진이의 생애는 후대 야담과 문집의 전승이 많이 섞여 있어 서경덕의 제자가 된 구체적 장면이나 사서육경 독서 범위를 확정하기 어렵다. 성리학·한시 교육이라는 넓은 배경만으로 개별 경전을 만들 수 없다.

현전 시조와 한시는 황진이 자신의 창작물이므로 소비 콘텐츠에서 제외한다. 정확한 외부 작품 감상이 확인되지 않아 light/open/0을 유지한다.$ko$,
        $en$Hwang Jini's biography is heavily mediated by later anecdotes and literary collections, making it difficult to establish the precise story of becoming Seo Gyeong-deok's disciple or the range of classics she read. Broad education in Neo-Confucian thought and classical poetry does not identify a particular scripture.

Her surviving sijo and classical Chinese poems are her own creations and are excluded from consumption content. No external work clears the evidence threshold, so the profile remains light/open/0.$en$
      ),
      (
        '3f18a767-a7a5-4820-863a-aa2c3de116a5'::uuid,
        $ko$최진철이 공격수 경험을 수비에 활용하고 히딩크의 체력 훈련을 통과했다는 내용은 선수 경력과 코칭 경험이다. 본인 경기와 인터뷰 발언도 외부 콘텐츠가 아니다.

‘그라운드를 교본으로 삼았다’는 비유를 실제 작품 소비로 읽지 않는다. 등록할 작품이 없어 light/open/0을 유지한다.$ko$,
        $en$Choi Jin-cheul's use of his experience as a forward in defense and his work under Hiddink's fitness program concern his playing career and coaching environment. His own matches and interview remarks are not external content.

The metaphor of treating the pitch as a textbook is not a work-consumption record. No item is linked, and the profile remains light/open/0.$en$
      ),
      (
        '3f8e9b2c-b257-461a-a041-1c24a5c8050a'::uuid,
        $ko$김우진이 메시와 호날두의 경쟁을 즐겨 봤다고 말한 것은 스포츠 시청 취향을 보여준다. 그러나 특정 경기·방송·다큐멘터리 제목은 확인되지 않는다.

본인의 파리 올림픽 경기와 메달에 관한 발언은 자기 행적이다. 식별 가능한 외부 콘텐츠가 없어 light/open/0을 유지한다.$ko$,
        $en$Kim Woo-jin's statement that he enjoyed watching the rivalry between Messi and Ronaldo shows a general sports-viewing preference. It does not identify a particular match, broadcast, or documentary.

His own Paris Olympic performances and remarks about medals are personal history. No identifiable external content is linked, so the profile remains light/open/0.$en$
      ),
      (
        '53c416ba-59e9-4c29-8011-003df939f6b3'::uuid,
        $ko$카스파르 다비트 프리드리히 연구는 오시안 시, 에다 전승, 독일 낭만주의 문학과 그의 회화 사이의 영향 관계를 논한다. 하지만 양식·주제의 영향은 화가가 특정 판본을 직접 읽었다는 생애 기록과 다르다.

코제가르텐·아른트·쾨르너·괴테 같은 인물과 사상적 환경은 확인되지만 개별 작품 소비로 좁혀지지 않는다. 본인 회화도 제외하므로 light/open/0을 유지한다.$ko$,
        $en$Scholarship on Caspar David Friedrich discusses relationships between his painting and Ossianic poetry, Eddic tradition, and German Romantic literature. Stylistic or thematic influence, however, is not biographical evidence that he personally read a particular edition.

Kosegarten, Arndt, Körner, Goethe, and the surrounding intellectual environment are relevant, but no individual work is securely tied to his consumption. His own paintings are also excluded, leaving the profile light/open/0.$en$
      ),
      (
        '68c50cee-6344-4ee1-9ae5-04f3dce4ffa5'::uuid,
        $ko$양용은이 닉 팔도와 타이거 우즈의 스윙·경기 영상을 학습에 활용했다는 서술은 훈련 자료 시청에 해당한다. 현재 자료에는 영상의 정식 제목이나 한 편의 콘텐츠로 묶을 식별자가 없다.

2009년 PGA 챔피언십은 양용은 본인의 경기이기도 하다. 이름 없는 훈련 영상과 자기 경기를 외부 작품으로 만들지 않고 light/open/0을 유지한다.$ko$,
        $en$The account of Yang Yong-eun using footage of Nick Faldo and Tiger Woods for study concerns training material. The profile does not supply an official title or an identifier that resolves the footage as one content item.

The 2009 PGA Championship is also Yang's own sporting performance. Unnamed training footage and his own event are not registered as external works, so the profile remains light/open/0.$en$
      ),
      (
        '6b263ca0-0a65-4d8e-9789-6fc3839557f0'::uuid,
        $ko$미하일 8세의 콘스탄티노폴리스 탈환과 학술 후원은 팔레올로고스 왕조 초기의 정치·문화 사업이다. 어린 시절 예언 자장가 이야기는 후대 전승이며 작품명도 남지 않는다.

학자들이 플라톤·아리스토텔레스 문헌을 편집했다고 해서 황제 본인의 개별 독서가 되는 것은 아니다. 제국의 후원과 개인 감상을 구분해 light/open/0을 유지한다.$ko$,
        $en$Michael VIII's recovery of Constantinople and patronage of learning were political and cultural projects of the early Palaiologan dynasty. The childhood prophetic-lullaby story is a later tradition and does not preserve a work title.

Scholars editing texts by Plato and Aristotle under imperial patronage does not establish the emperor's own reading of an individual work. Patronage is kept separate from personal consumption, leaving the profile light/open/0.$en$
      ),
      (
        '6ebeeefb-a074-4026-bc4c-5ad2974ab32c'::uuid,
        $ko$이세돌과 가족의 인터뷰는 그가 무협 소설 장르를 즐겼다는 취향을 전한다. 하지만 작가와 작품명이 확인되지 않아 한 권의 콘텐츠로 식별할 수 없다.

알파고 대국은 본인의 경기이고 25년 바둑을 정리한 책도 본인 저술이라 제외한다. 장르 선호만 남으므로 light/open/0을 유지한다.$ko$,
        $en$Interviews with Lee Sedol and his family describe his enjoyment of martial-arts fiction as a genre. No author or title is identified, so the preference cannot be resolved to one book.

The AlphaGo matches are his own games, and the book summarizing his Go career is his own work; both are excluded. With only a genre preference documented, the profile remains light/open/0.$en$
      ),
      (
        '796434ba-6750-46e3-82b7-99721d3f2d75'::uuid,
        $ko$미하엘 슈마허의 인터뷰성 프로필은 티나 터너, 필 콜린스, 마이클 잭슨을 좋아하는 음악가로 꼽는다. 이는 가수 선호를 확인할 뿐 특정 곡이나 음반을 지목하지 않는다.

카트 제작과 축구 활동은 본인의 취미·행적이다. 아티스트명을 임의의 대표곡으로 바꾸지 않고 light/open/0을 유지한다.$ko$,
        $en$Interview-based profiles name Tina Turner, Phil Collins, and Michael Jackson among Michael Schumacher's favorite artists. This establishes artist preference but does not identify a particular song or album.

Kart building and football were his own hobbies and activities. Artist names are not converted into arbitrary signature tracks, so the profile remains light/open/0.$en$
      ),
      (
        '7a15201d-1bf9-4538-914c-bc25a2b05cf7'::uuid,
        $ko$커티스 프림은 첼로와 트롬본을 배우고 학교 오케스트라에서 연주했으며, 뒤에는 실험예술센터를 후원했다. 이는 음악 교육·본인 연주·기관 후원이다.

클래식 음악을 좋아했다는 사실만으로 작곡가나 작품을 정할 수 없다. 제목이 확인되는 감상 기록이 없어 light/open/0을 유지한다.$ko$,
        $en$Curtis Priem studied cello and trombone, played in his school orchestra, and later funded an experimental performing-arts center. These are music education, his own performance, and institutional patronage.

A general love of classical music does not identify a composer or composition. With no titled consumption record, the profile remains light/open/0.$en$
      ),
      (
        '7d064f46-b19c-45e8-ac07-4c6488b43aac'::uuid,
        $ko$앤드류 펠드만의 험프티 덤프티 비유와 ‘두려움 없는 엔지니어’라는 표어는 반도체 설계와 조직 문화를 설명하기 위한 본인의 표현이다.

전기·인터넷·스마트폰도 기술 전환의 사례일 뿐 감상 작품이 아니다. 외부 콘텐츠가 없어 light/open/0을 유지한다.$ko$,
        $en$Andrew Feldman's Humpty Dumpty analogy and “fearless engineer” phrase are his own explanations of wafer-scale design and organizational culture.

Electricity, the internet, and smartphones are examples of technological shifts, not consumed works. No external content is identified, so the profile remains light/open/0.$en$
      ),
      (
        '7f106cb4-219f-4ed7-828b-b7776d50f5ec'::uuid,
        $ko$요한 크라위프는 리누스 미헬스의 지도 아래 토탈 풋볼을 익혔고 카탈루냐 문화에 정치적·사회적으로 연대했다. 이는 스승의 전술과 삶의 선택에 관한 기록이다.

특정 책·영화·음악을 감상한 사실은 확인되지 않는다. 본인의 경기와 축구 철학도 소비 콘텐츠가 아니므로 light/open/0을 유지한다.$ko$,
        $en$Johan Cruyff learned Total Football under Rinus Michels and expressed political and social solidarity with Catalan culture. These are records of coaching influence and personal choices.

No particular book, film, or piece of music is identified as something he consumed. His own matches and football philosophy are not consumption content, so the profile remains light/open/0.$en$
      ),
      (
        '967bfd77-be30-4434-b627-05e20e00d8ab'::uuid,
        $ko$유상철의 여러 포지션 경험, 인천 감독 시절의 약속과 투병은 그의 선수·지도자 생애를 설명한다.

기존 감상여정에는 외부 작품이나 식별 가능한 감상 대상이 없다. 삶의 태도를 콘텐츠로 바꾸지 않고 light/open/0을 유지한다.$ko$,
        $en$Yoo Sang-chul's experience across several positions, his promise as Incheon manager, and his illness belong to his playing and coaching biography.

The profile identifies no external work or resolvable object of consumption. A life attitude is not converted into content, so the profile remains light/open/0.$en$
      ),
      (
        'aca86254-35c6-430e-bda6-3048cfe547c0'::uuid,
        $ko$기성용은 스티븐 제라드의 경기를 보며 롱패스를 익혔다고 밝혔고 그를 롤 모델로 꼽았다. 하지만 어느 경기·방송을 보았는지 작품 단위 제목은 남지 않는다.

2012년 맞대결과 2025년 아이콘 매치는 기성용 본인의 경기다. 롤 모델과 자기 경기를 외부 콘텐츠로 만들지 않고 light/open/0을 유지한다.$ko$,
        $en$Ki Sung-yueng has said that he learned long passing by watching Steven Gerrard and named him as a role model. The record does not identify which match or broadcast he watched as a titled work.

Their 2012 meeting and the 2025 icon match were Ki's own games. A role model and one's own sporting performances are not registered as external content, leaving the profile light/open/0.$en$
      ),
      (
        'c6bc6276-a16a-42b9-b771-33a972950079'::uuid,
        $ko$박인비는 1998년 US여자오픈에서 박세리가 보여준 이른바 ‘맨발 샷’을 보고 골프의 꿈을 키웠다고 회고한다. 미키 라이트의 메이저 연승 기록도 목표로 삼았다.

두 사례는 스포츠 경기 장면과 기록이며, 현재 서비스가 식별할 수 있는 영화·방송 작품 메타데이터가 아니다. 박인비 자신의 대회 역시 제외하므로 light/open/0을 유지한다.$ko$,
        $en$Inbee Park recalls that Pak Se-ri's celebrated “barefoot shot” at the 1998 U.S. Women's Open helped inspire her golfing ambition. She also treated Mickey Wright's consecutive-major record as a target.

These are sporting moments and records, not film or television works with resolvable service metadata. Park's own tournaments are also excluded, so the profile remains light/open/0.$en$
      ),
      (
        'd131357a-a289-4006-9d89-dcd00db6e895'::uuid,
        $ko$황선홍이 마르코 판 바스턴과 최순호의 플레이를 본보기로 삼았다는 서술은 선수 관찰과 롤 모델의 관계다. 특정 경기·방송 제목은 확인되지 않는다.

2002년 폴란드전은 황선홍 본인의 경기다. 이름 없는 경기 영상과 자기 경기를 콘텐츠로 만들지 않고 light/open/0을 유지한다.$ko$,
        $en$The account of Hwang Sun-hong modeling aspects of his play on Marco van Basten and Choi Soon-ho describes observation of other athletes and sporting role models. No particular match or broadcast title is identified.

The 2002 match against Poland was Hwang's own performance. Unnamed match footage and one's own game are not registered as content, so the profile remains light/open/0.$en$
      ),
      (
        'daed2366-f165-43fe-adda-a554958afe3b'::uuid,
        $ko$집옥재는 고종의 서재이자 집무·접견 공간이었고 중국에서 들여온 서양 지식서와 『만국공보』 같은 간행물을 포함한 방대한 장서를 보관했다. 장서 연구는 고종대 근대 지식 수용을 살피는 중요한 단서다.

하지만 왕실 도서관 소장 목록은 고종이 각 책을 직접 완독했다는 기록과 다르다. 전통 경연도 사서삼경이라는 경전군만 제시한다. 소장·국가 도입·커피 일화를 개인 작품 감상으로 확장하지 않고 light/open/0을 유지한다.$ko$,
        $en$Jibokjae served as Gojong's library as well as a work and reception space, holding a large collection that included Chinese translations of Western knowledge and periodicals such as *The Globe Magazine*. The collection is important evidence for the reception of modern knowledge during his reign.

A royal-library catalog, however, is not a record that Gojong personally completed every volume. Traditional royal lectures likewise identify broad groups of Confucian classics rather than one securely documented work here. Holdings, state adoption, and the coffee anecdote are not expanded into personal content, so the profile remains light/open/0.$en$
      )
  )
  UPDATE public.profiles p
  SET consumption_philosophy = corrections.ko,
      consumption_philosophy_en = corrections.en
  FROM corrections
  WHERE p.id = corrections.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 20 THEN
    RAISE EXCEPTION
      '비정형 4차 감상여정 교정 행 수가 20이 아닙니다. 실제=%',
      affected;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('129d506a-148f-439e-86df-794fb2a24a86'::uuid),
      ('1d9cc3b9-6c4c-4f3b-8f87-af14ff7921a0'::uuid),
      ('28126d70-5831-4f94-91e3-954ffc39383f'::uuid),
      ('353f981d-2fe1-4bc4-a7fd-d38c15e32dfa'::uuid),
      ('3b7ce906-bf9a-444f-b29b-411a91007630'::uuid),
      ('3f18a767-a7a5-4820-863a-aa2c3de116a5'::uuid),
      ('3f8e9b2c-b257-461a-a041-1c24a5c8050a'::uuid),
      ('53c416ba-59e9-4c29-8011-003df939f6b3'::uuid),
      ('68c50cee-6344-4ee1-9ae5-04f3dce4ffa5'::uuid),
      ('6b263ca0-0a65-4d8e-9789-6fc3839557f0'::uuid),
      ('6ebeeefb-a074-4026-bc4c-5ad2974ab32c'::uuid),
      ('796434ba-6750-46e3-82b7-99721d3f2d75'::uuid),
      ('7a15201d-1bf9-4538-914c-bc25a2b05cf7'::uuid),
      ('7d064f46-b19c-45e8-ac07-4c6488b43aac'::uuid),
      ('7f106cb4-219f-4ed7-828b-b7776d50f5ec'::uuid),
      ('967bfd77-be30-4434-b627-05e20e00d8ab'::uuid),
      ('aca86254-35c6-430e-bda6-3048cfe547c0'::uuid),
      ('c6bc6276-a16a-42b9-b771-33a972950079'::uuid),
      ('d131357a-a289-4006-9d89-dcd00db6e895'::uuid),
      ('daed2366-f165-43fe-adda-a554958afe3b'::uuid)
  ) AS expected(id)
  JOIN public.profiles p ON p.id = expected.id
  WHERE p.celeb_tier IS DISTINCT FROM 'light'
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR NULLIF(btrim(p.cultural_journey), '') IS NULL
     OR NULLIF(btrim(p.cultural_journey_en), '') IS NULL
     OR EXISTS (
       SELECT 1
       FROM public.user_contents uc
       WHERE uc.user_id = expected.id
     );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '비정형 4차 교정 후 light/open/0·감상여정 검증 실패 인물=%',
      wrong_count;
  END IF;
END;
$$;

COMMIT;

-- 활성 + 감상여정 비정형 작품명 추출군 41~60번의 조사 결과로 감상여정 오류를 교정한다.
--
-- 원칙:
--   - 후원·교육·저술·작품 간 유사성을 개인의 실제 감상으로 바꾸지 않는다.
--   - 저자나 경전군만 확인되고 작품명이 특정되지 않으면 open/0을 유지한다.
--   - 후대 전기와 현대 연구의 추정은 증거 성격을 본문에 드러낸다.
--   - 근거가 통과한 네 명만 등록 결과를 명시한다.
--
-- 이 파일은 20260729_apply_active_extract_batch_03.sql 다음에 실행한다.

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
      ('74e8abc4-8d3b-4076-a8ee-30b87cdbfb98'::uuid, '7b50ec0177af0edbc16abaa2549e3944', 'f44d1b05fc29586941c9a6e0f16929ff', 'light', 0),
      ('50dbda6b-4151-4af0-9a14-f48fa451c593'::uuid, '7cfc7265b3959303861c907d3cf9727d', 'f9c377d3f5c5f2ab9d8c6fc4693e2e7d', 'full', 1),
      ('9ca52951-66f7-464d-8c83-7214f654542e'::uuid, '53913812e8298ff558ca49ce872fadf4', 'dc9a67b2cd55f03be3fd5eaabade73a3', 'light', 0),
      ('9b03742a-c69e-465f-a665-b473adb378dd'::uuid, 'd5b76a7d6d934d675a66bd88b2712c3e', '8f4edf8995d932f33d3124ed847367be', 'light', 0),
      ('0be8a183-a400-4cd9-b2a9-27487129e0bf'::uuid, 'cb902deea4ee119b7724f149306cd5bd', '2e94df1ba10c2f12babbc3de09d9a37d', 'light', 0),
      ('6f929bc6-4d67-4264-b02e-f1768149ed0a'::uuid, 'e450300e57dab5cb6e56e7e9445a2a4c', '0f77bdcbeb25c3c52b30b3b627d66de7', 'full', 1),
      ('2842f784-62df-41e9-952e-03c568014939'::uuid, '4223bf54131172af60526a910f814df0', '8d0e00e7f8c837914aab776112e95d96', 'light', 0),
      ('a17ef655-e744-4ebe-a904-f7b8757c2248'::uuid, '73ec15c83cbf0facbbf500082a8249df', '5099f3453ec66d5f6666a3e9bb23361c', 'light', 0),
      ('7298ae3c-f94f-4e92-9f63-17dddddce54d'::uuid, '86a9715a4cece2fdb538d2571e20bbba', '9056d0782da260d79953b0a80246646a', 'light', 0),
      ('617005a2-9292-4d77-af6f-30b0862203d9'::uuid, '2b1ba4fd7ddee2cc715a013a170c46ee', '200be5ecffc36f4c44150382b77bb4ff', 'light', 0),
      ('3a6d4622-92da-45aa-816e-f0a8dfea76fd'::uuid, '509c7a8bf735827d35984171ec48b2e8', 'd1881d4357b03f84e1818d890cfe41a7', 'light', 0),
      ('ae49f9f5-fd22-4cc0-902b-30db9edcc87c'::uuid, '3b7315fac863e21f2c13edb66b6e80e4', '341fd24c01e7e00e135f41d0dbed5514', 'full', 1),
      ('eb0aa2b6-89e2-484c-8648-4e7c71141ea0'::uuid, '397f8e0772bd22d811effbded61ddc24', 'ec142143abb47f7796dc8b03a39148f0', 'light', 0),
      ('5bcfbbf7-8c6e-4491-9b41-ffc85239b205'::uuid, 'aea6f6eaa76de225e62ed5d20d80fbe8', 'caa567046a4028d10741d3393475219d', 'light', 0),
      ('bd34ae9d-da6b-4896-942b-2b455bc05805'::uuid, 'e69916c7c39291bc717883c6c4eab313', '32213499ccbef5a83a7927c95cf98cb5', 'full', 1),
      ('751c1b6b-06c7-4153-8453-cf13d2700c6d'::uuid, 'de307c027444a658efe7befd5ec32a39', 'b8907a36c219b531af887711c525dd1b', 'light', 0),
      ('baaff2e6-0e31-49e2-9efe-27b3200d5cfd'::uuid, 'c5a7f7630323c8c65d47091ef71dca62', '4b786ff3138adf67a0fee5e2f863896d', 'light', 0)
  ) AS expected(id, ko_md5, en_md5, tier, content_count)
  LEFT JOIN public.profiles p ON p.id = expected.id
  WHERE p.id IS NULL
     OR p.status IS DISTINCT FROM 'active'
     OR p.celeb_tier IS DISTINCT FROM expected.tier
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR md5(p.cultural_journey) IS DISTINCT FROM expected.ko_md5
     OR md5(p.cultural_journey_en) IS DISTINCT FROM expected.en_md5
     OR (
       SELECT count(*)
       FROM public.user_contents uc
       WHERE uc.user_id = expected.id
     ) <> expected.content_count;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '비정형 3차 감상여정 교정 기준선이 달라졌습니다. 차이=%',
      wrong_count;
  END IF;

  WITH corrections(id, ko, en) AS (
    VALUES
      (
        '74e8abc4-8d3b-4076-a8ee-30b87cdbfb98'::uuid,
        $ko$위안스카이는 과거 시험을 준비하며 전통 경전 교육을 받았고, 군사 근대화를 추진하면서 일본과 독일의 군제·훈련 자료를 받아들였다. 그러나 현재 확인되는 자료는 사서오경 같은 경전군과 이름이 남지 않은 군사 교재를 말할 뿐, 그가 실제로 읽은 특정 판본이나 작품을 지목하지 않는다.

제도 도입과 교육 이력은 개인 콘텐츠 기록과 구분해야 한다. 작품 단위의 직접 독서 증거가 나올 때까지 콘텐츠는 open/0으로 둔다.$ko$,
        $en$Yuan Shikai received a conventional classics-based education while preparing for the examinations and later adopted Japanese and German military systems during army reform. The surviving accounts, however, point only to broad bodies of classics and unnamed military manuals, not to an identifiable work or edition that he personally read.

Institutional adoption and educational background are not personal content records. His profile therefore remains open with zero linked works until work-level evidence appears.$en$
      ),
      (
        '50dbda6b-4151-4af0-9a14-f48fa451c593'::uuid,
        $ko$동시대 교회사가 소크라테스 스콜라스티코스는 테오도시우스 2세가 성경을 부지런히 읽고 외웠으며 주교들과 내용을 논의했다고 기록했다. 특정 구절의 인용이 아니라 반복된 읽기와 암기가 확인되므로 성경을 연결했다.

425년 콘스탄티노폴리스의 고등교육 조직과 438년 테오도시우스 법전은 그의 치세를 보여주는 제도적 성과다. 다만 대학 설립과 법전 편찬 참여만으로 각 교과서나 법률 문헌을 개인 감상 콘텐츠로 늘리지는 않는다.$ko$,
        $en$The contemporary church historian Socrates Scholasticus records that Theodosius II diligently studied Scripture, learned it by heart, and discussed it with bishops. Because the evidence describes repeated reading and memorization rather than a passing quotation, the Bible is linked.

The higher-education organization founded at Constantinople in 425 and the Theodosian Code issued in 438 are institutional achievements of his reign. They do not by themselves justify turning every school text or legal source into a personal content record.$en$
      ),
      (
        '9ca52951-66f7-464d-8c83-7214f654542e'::uuid,
        $ko$아키텐의 엘레오노르는 남프랑스 궁정 문화와 트루바두르 후원의 중요한 인물이다. 그러나 궁정에 시인과 음악가가 모였다는 사실은 후원과 공연 환경을 입증할 뿐, 엘레오노르가 감상한 특정 작품명까지 남겨 주지는 않는다.

후대에 널리 퍼진 ‘사랑의 법정’ 이야기도 동시대 기록으로 확정하기 어렵다. 제목이 확인되는 시·노래와 그녀의 직접 감상을 잇는 자료가 나오기 전에는 콘텐츠를 만들지 않고 open/0을 유지한다.$ko$,
        $en$Eleanor of Aquitaine was an important patron within the troubadour culture of southern French courts. The presence of poets and musicians at court establishes patronage and a performance environment, but it does not preserve the title of a particular work she heard or read.

The celebrated story of her “court of love” is also difficult to establish from contemporary evidence. Until a titled poem or song can be tied to her direct engagement, the profile remains open with zero linked content.$en$
      ),
      (
        '9b03742a-c69e-465f-a665-b473adb378dd'::uuid,
        $ko$구처기의 이른 전기는 그가 도가 경전을 두루 읽었다고 전한다. 이는 폭넓은 경전 학습의 근거지만, 현재 감상여정이 특정한 『도덕경』 한 권을 직접 읽었다는 증거는 아니다. 칭기즈 칸과의 문답에서 드러난 절제와 무위의 태도를 곧바로 특정 책의 독서 효과로 환원할 수도 없다.

경전군은 확인되지만 작품명이 특정되지 않았으므로 콘텐츠는 open/0으로 둔다. 추후 원문 기록에서 서명이 확인될 때 작품 단위로 연결한다.$ko$,
        $en$An early biography of Qiu Chuji says that he read broadly across Daoist scriptures. This supports extensive scriptural study, but it does not establish the current profile's specific claim that he read the *Daodejing* as an identifiable work. Nor can the restraint and non-action visible in his exchanges with Chinggis Khan be reduced automatically to the effect of one book.

The body of scripture is documented but no work title is securely identified, so the profile remains open with zero linked content.$en$
      ),
      (
        '0be8a183-a400-4cd9-b2a9-27487129e0bf'::uuid,
        $ko$전봉준은 서당 교육을 받았고 재판 과정에서 동학이 수심과 충효를 근본으로 삼고 보국안민을 지향한다고 설명했다. 이는 유교 교육과 동학 교리의 영향을 보여준다.

하지만 현재 자료는 그가 읽은 유교 경전이나 동학 문헌의 정확한 제목을 특정하지 않는다. 영문 감상여정의 맹자 문구와 ‘인내천’ 적용도 전봉준 자신의 독서 기록으로 입증되지 않았다. 교리와 작품 소비를 구분해 콘텐츠는 open/0으로 유지한다.$ko$,
        $en$Jeon Bong-jun received village-school education and explained at trial that Donghak cultivated the mind, took loyalty and filial piety as its basis, and sought to protect the nation and secure the people's welfare. This shows the importance of Confucian education and Donghak doctrine.

The available evidence does not identify the title of a Confucian classic or Donghak text that he personally read. The former profile's Mencius quotation and application of *Innaecheon* were not documented as his own reading record. Doctrine is therefore kept separate from content consumption, and the profile remains open at zero.$en$
      ),
      (
        '6f929bc6-4d67-4264-b02e-f1768149ed0a'::uuid,
        $ko$테르툴리아누스는 그리스·로마 철학을 알지 못해 배척한 사람이 아니었다. 그의 『영혼론』은 플라톤의 『파이돈』을 작품명으로 직접 지목하고 영혼에 관한 논증을 요약한 뒤 반박한다. 특정 텍스트를 읽고 논쟁에 사용한 흔적이므로 『파이돈』을 연결했다.

다른 저술가들의 이름과 스토아적 개념도 곳곳에서 확인되지만, 저자명이나 학파만으로 개별 작품까지 만들지는 않는다. 현재는 작품 단위 근거가 통과한 『파이돈』 한 건만 등록한다.$ko$,
        $en$Tertullian did not reject Greco-Roman philosophy out of ignorance. In *A Treatise on the Soul* he explicitly names Plato's *Phaedo*, summarizes its argument about the soul, and contests it. That direct use of an identifiable text supports linking *Phaedo*.

Names of other authors and Stoic concepts also occur throughout his writing, but an author or school alone does not identify a particular consumed work. *Phaedo* is therefore the sole linked item at this stage.$en$
      ),
      (
        '2842f784-62df-41e9-952e-03c568014939'::uuid,
        $ko$폴리비오스는 로마에 억류된 뒤 스키피오 아이밀리아누스와 가까워졌고, 현장 조사와 정치 경험을 역사 서술의 핵심으로 삼았다. 그의 『역사』에는 호메로스 인용과 앞선 그리스 역사학의 흔적이 남아 있다.

그러나 기존 감상여정처럼 ‘호메로스와 투키디데스를 읽고 그 방법론을 실전에서 검증했다’고 단정하는 것은 자료보다 앞선다. 특히 투키디데스 수용은 현대 연구가 문체와 구조를 비교해 추론하는 영역이다. 정확한 작품 소비가 입증되지 않아 open/0을 유지한다.$ko$,
        $en$After being detained in Rome, Polybius became close to Scipio Aemilianus and made field inquiry and political experience central to historical writing. His *Histories* contain Homeric citations and traces of earlier Greek historiography.

The former claim that he read Homer and Thucydides and then tested their method in practice goes beyond the evidence. His reception of Thucydides in particular is largely reconstructed by modern scholars through structural and verbal comparison. No work-level consumption record is therefore linked, and the profile remains open at zero.$en$
      ),
      (
        'a17ef655-e744-4ebe-a904-f7b8757c2248'::uuid,
        $ko$아키텐 공작 빌헬름 9세의 오크어 시 11편이 남아 있어 그가 기록상 가장 이른 트루바두르 가운데 한 명이라는 사실은 분명하다. 하지만 본인이 만든 시는 이 조사에서 소비 콘텐츠가 아니다.

안달루시아 서정 전통의 영향은 양식 비교에서 나온 학설이며, 빌헬름이 들은 특정 노래나 읽은 텍스트를 알려 주지 않는다. 구전 문화와 창작 활동을 작품 감상으로 바꾸지 않고 open/0을 유지한다.$ko$,
        $en$Eleven Occitan poems by William IX of Aquitaine survive, establishing him as one of the earliest recorded troubadours. His own poetry, however, is not consumption content for this research.

Proposed Andalusian influence comes from stylistic comparison and does not identify a particular song he heard or text he read. Oral culture and authorship are not converted into a personal work record, so the profile remains open with zero linked content.$en$
      ),
      (
        '7298ae3c-f94f-4e92-9f63-17dddddce54d'::uuid,
        $ko$사포의 시편은 자신의 창작물이므로 감상 콘텐츠에서 제외한다. 그 안의 호메로스적 어휘와 서사 관습은 당대 구전·시적 전통과의 관계를 보여주지만, 사포가 『일리아스』나 『오디세이』의 특정 텍스트를 읽었다는 생애 기록은 아니다.

작품 사이의 상호텍스트성을 곧바로 개인 독서로 바꾸지 않는다. 정확한 감상 기록이 확인될 때까지 콘텐츠는 open/0이다.$ko$,
        $en$Sappho's surviving poems are her own creations and are excluded from consumption content. Homeric diction and narrative conventions in those fragments show a relationship with the poetic and oral tradition of her period, but they are not biographical evidence that she read a particular text of the *Iliad* or *Odyssey*.

Intertextual resemblance is not converted into a personal reading record. The profile remains open at zero until direct work-level evidence is found.$en$
      ),
      (
        '617005a2-9292-4d77-af6f-30b0862203d9'::uuid,
        $ko$샤 루흐 치세의 헤라트는 학자·서예가·세밀화가가 모인 필사본 제작 중심지였다. 왕실과 고하르 샤드의 후원은 티무르 제국의 문화적 권위를 세우는 데 큰 역할을 했다.

다만 도서관을 운영하고 제작을 후원했다는 사실만으로 군주가 직접 읽은 개별 작품을 만들 수는 없다. 기존 감상여정의 번역·수집 범위도 작품명과 개인 독서가 확인되지 않았다. 후원과 감상을 구분해 open/0을 유지한다.$ko$,
        $en$Under Shah Rukh, Herat became a center of manuscript production populated by scholars, calligraphers, and miniature painters. Patronage by the court and Goharshad played a major role in constructing Timurid cultural authority.

Operating libraries and sponsoring production do not identify individual works personally read by the ruler. The former profile's broad claims about collection and translation likewise lacked a titled work tied to his own engagement. Patronage is therefore kept separate from consumption, and the profile remains open at zero.$en$
      ),
      (
        '3a6d4622-92da-45aa-816e-f0a8dfea76fd'::uuid,
        $ko$수에토니우스는 티베리우스가 에우포리온, 리아노스, 파르테니오스를 특히 좋아했고 이들의 흉상을 도서관에 세웠다고 기록한다. 그가 그리스어 시를 썼다는 기록도 있다.

하지만 시인 이름만 남았을 뿐 읽은 시의 작품명은 특정되지 않는다. 취향을 카프리 은둔 통치와 연결한 기존 해석도 독서 사실이 아니라 비평적 비유다. 저자 선호는 보존하되 콘텐츠는 open/0으로 둔다.$ko$,
        $en$Suetonius records that Tiberius especially admired Euphorion, Rhianus, and Parthenius and placed their busts in libraries. He is also said to have composed poetry in Greek.

The poets are named, but no title of a poem he read is preserved. The former comparison between this taste and his secluded rule on Capri was an interpretive analogy, not a reading record. His author preferences are retained without creating a work-level item, leaving the profile open at zero.$en$
      ),
      (
        'ae49f9f5-fd22-4cc0-902b-30db9edcc87c'::uuid,
        $ko$량원펑은 저장대학교에서 전자정보공학을 공부하고 퀀트 투자사 하이플라이어를 거쳐 딥시크를 세운 인물이다. 기존 한국어 감상여정은 동명이 아닌 싼이중공업 창업자 량원겐의 생애를 잘못 붙였으므로 전부 제거했다.

량원펑 본인의 독서 기록으로 확인되는 것은 그레고리 주커만의 『시장을 풀어낸 수학자』다. 그는 2021년 중국어판 추천 서문을 썼고, 어려운 문제를 만날 때 짐 사이먼스의 가격 모델링에 대한 확신을 떠올린다고 설명했다. 확인되지 않은 알리바바 자료는 제외하고 이 한 권만 연결한다.$ko$,
        $en$Liang Wenfeng studied electronic information engineering at Zhejiang University, built the quantitative-investment firm High-Flyer, and founded DeepSeek. The former Korean profile mistakenly described Liang Wengen, the founder of SANY, and has therefore been replaced.

The documented reading record is Gregory Zuckerman's *The Man Who Solved the Market*. Liang wrote the recommendation preface for its 2021 Chinese edition and explained that, when facing hard problems, he recalls Jim Simons's conviction that prices must be modelable. Unrelated Alibaba material has been removed, and this is the sole linked work.$en$
      ),
      (
        'eb0aa2b6-89e2-484c-8648-4e7c71141ea0'::uuid,
        $ko$디오게네스에 관한 지팡이, 등불, 알렉산드로스 일화는 그의 실천 철학을 전하는 후대 전승이다. 안티스테네스의 제자였다는 전통도 사상적 계보를 보여주지만, 그가 읽은 특정 저작을 알려 주지는 않는다.

스승의 가르침과 삶의 태도를 곧바로 작품 소비로 만들 수 없다. 이름이 확인되는 텍스트가 없으므로 콘텐츠는 open/0을 유지한다.$ko$,
        $en$The staff, lamp, and Alexander anecdotes about Diogenes are later traditions conveying his philosophy in action. The tradition that he followed Antisthenes establishes an intellectual lineage but does not identify a particular written work that he read.

A teacher's influence and an embodied way of life cannot be converted automatically into content consumption. With no identifiable text, the profile remains open with zero linked works.$en$
      ),
      (
        '5bcfbbf7-8c6e-4491-9b41-ffc85239b205'::uuid,
        $ko$코넬리어스 밴더빌트가 모라비안 교회와 관계를 유지했고 스태튼아일랜드 묘지 부지를 기부했으며 그곳에 묻혔다는 사실은 확인된다. 그러나 기존 감상여정의 ‘성경과 찬송가를 끝까지 놓지 않았다’는 표현과 임종 때 가족이 함께 찬송했다는 장면은 신뢰할 만한 자료로 확인되지 않았다.

학교 교육을 두고 했다는 재치 있는 문구도 출처가 불분명하다. 종교 소속과 매장 기록만으로 성경이나 찬송가를 개인 콘텐츠로 등록하지 않고 open/0을 유지한다.$ko$,
        $en$Cornelius Vanderbilt's continuing connection to the Moravian Church, his donation of land for a Staten Island cemetery, and his burial there are documented. The former profile's claims that he never let go of a Bible and hymnal and that his family sang hymns with him at death were not confirmed by reliable evidence.

The witty line attributed to him about missing school is also poorly sourced. Religious affiliation and burial records alone do not establish personal reading of the Bible or a hymnal, so the profile remains open at zero.$en$
      ),
      (
        'bd34ae9d-da6b-4896-942b-2b455bc05805'::uuid,
        $ko$프랑수아조제프 페티스의 초기 파가니니 전기는 로카텔리의 『바이올린 예술』이 우연히 파가니니의 눈에 들어왔고, 그가 거기서 새로운 아이디어와 기법의 세계를 보았다고 기록한다. 페티스는 파가니니와 동시대 인물이지만 전기는 사후에 출간됐고, 현대 연구에는 직접 영향의 강도를 두고 논쟁이 남아 있다.

따라서 ‘파르마에서 발견했다’거나 파가니니의 직접 발언이라고 단정한 기존 문장은 제거했다. 다만 특정 작품을 접했다는 명시적 초기 전기 기록은 작품 연결 기준을 통과하므로 로카텔리의 작품 한 건을 등록했다.$ko$,
        $en$François-Joseph Fétis's early biography of Paganini says that Locatelli's *L'Arte del Violino* came to Paganini's notice by chance and opened a new world of ideas and devices to him. Fétis was Paganini's contemporary, but the biography appeared after Paganini's death, and modern scholarship still debates the exact strength of the direct influence.

The former claims that the discovery occurred in Parma and that the wording was Paganini's own direct quotation have therefore been removed. The explicit early biographical account still clears the threshold for one work-level link to Locatelli.$en$
      ),
      (
        '751c1b6b-06c7-4153-8453-cf13d2700c6d'::uuid,
        $ko$라비아 알아다위야의 생애와 발언은 대부분 사후 수세기가 지난 수피 전기와 성인전에서 전해진다. 연구자들은 동시대에 가까운 전기가 없고, 서로 다른 전승이 한 인물에게 합쳐졌을 가능성까지 지적한다.

그녀가 꾸란을 암송했다거나 특정 구절을 자신의 신비주의 언어로 전환했다는 기존 서술은 작품 단위의 확실한 소비 기록으로 사용할 수 없다. 종교적 맥락만으로 경전을 등록하지 않고 open/0을 유지한다.$ko$,
        $en$Most accounts of Rabi'a al-Adawiyya's life and sayings come from Sufi biographies and hagiographies written centuries after her death. Scholars emphasize the absence of a near-contemporary biography and the possibility that multiple traditions were combined around one figure.

The former claims about her reciting the Qur'an or transforming a particular verse into her mystical language cannot serve as secure work-level consumption evidence. Religious context alone is insufficient to register scripture, so the profile remains open at zero.$en$
      ),
      (
        'baaff2e6-0e31-49e2-9efe-27b3200d5cfd'::uuid,
        $ko$제노비아의 언어 능력과 학문적 궁정에 관한 이야기는 주로 후대 문헌에서 전한다. 롱기누스가 팔미라에서 정치 고문 역할을 했다는 전승은 있지만, 그가 제노비아에게 호메로스와 플라톤의 특정 작품을 가르쳤다는 동시대 기록은 확인되지 않는다.

‘호메로스에서 영웅 서사를, 플라톤에서 통치 철학을 배웠다’는 기존 문장은 현대적 해석이었다. 궁정 문화와 개인 독서를 구분해 콘텐츠는 open/0으로 둔다.$ko$,
        $en$Accounts of Zenobia's languages and learned court come primarily from later sources. Tradition places Longinus at Palmyra as a political adviser, but no contemporary record establishes that he taught Zenobia identifiable works by Homer and Plato.

The former statement that she drew heroic grammar from Homer and governing philosophy from Plato was a modern interpretation, not a documented reading record. Court culture is kept separate from personal consumption, leaving the profile open at zero.$en$
      )
  )
  UPDATE public.profiles p
  SET consumption_philosophy = corrections.ko,
      consumption_philosophy_en = corrections.en
  FROM corrections
  WHERE p.id = corrections.id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 17 THEN
    RAISE EXCEPTION
      '비정형 3차 감상여정 교정 행 수가 17이 아닙니다. 실제=%',
      affected;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('74e8abc4-8d3b-4076-a8ee-30b87cdbfb98'::uuid, 'light', 0),
      ('50dbda6b-4151-4af0-9a14-f48fa451c593'::uuid, 'full', 1),
      ('9ca52951-66f7-464d-8c83-7214f654542e'::uuid, 'light', 0),
      ('9b03742a-c69e-465f-a665-b473adb378dd'::uuid, 'light', 0),
      ('0be8a183-a400-4cd9-b2a9-27487129e0bf'::uuid, 'light', 0),
      ('6f929bc6-4d67-4264-b02e-f1768149ed0a'::uuid, 'full', 1),
      ('2842f784-62df-41e9-952e-03c568014939'::uuid, 'light', 0),
      ('a17ef655-e744-4ebe-a904-f7b8757c2248'::uuid, 'light', 0),
      ('7298ae3c-f94f-4e92-9f63-17dddddce54d'::uuid, 'light', 0),
      ('617005a2-9292-4d77-af6f-30b0862203d9'::uuid, 'light', 0),
      ('3a6d4622-92da-45aa-816e-f0a8dfea76fd'::uuid, 'light', 0),
      ('ae49f9f5-fd22-4cc0-902b-30db9edcc87c'::uuid, 'full', 1),
      ('eb0aa2b6-89e2-484c-8648-4e7c71141ea0'::uuid, 'light', 0),
      ('5bcfbbf7-8c6e-4491-9b41-ffc85239b205'::uuid, 'light', 0),
      ('bd34ae9d-da6b-4896-942b-2b455bc05805'::uuid, 'full', 1),
      ('751c1b6b-06c7-4153-8453-cf13d2700c6d'::uuid, 'light', 0),
      ('baaff2e6-0e31-49e2-9efe-27b3200d5cfd'::uuid, 'light', 0)
  ) AS expected(id, tier, content_count)
  JOIN public.profiles p ON p.id = expected.id
  WHERE NULLIF(btrim(p.cultural_journey), '') IS NULL
     OR NULLIF(btrim(p.cultural_journey_en), '') IS NULL
     OR p.celeb_tier IS DISTINCT FROM expected.tier
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR (
       SELECT count(*)
       FROM public.user_contents uc
       WHERE uc.user_id = expected.id
     ) <> expected.content_count;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '비정형 3차 교정 후 여정·등급·research·콘텐츠 수 검증 실패 인물=%',
      wrong_count;
  END IF;
END;
$$;

COMMIT;

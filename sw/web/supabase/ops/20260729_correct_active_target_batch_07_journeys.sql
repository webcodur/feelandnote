-- 활성 + 감상여정 명시 작품군 7차 조사에서 확인한 감상여정 오류 9명을 교정한다.
--
-- 콘텐츠 등록 SQL과 분리해서 실행한다. 대상 원문의 ko/en MD5가 2026-07-29
-- 조사 기준선과 정확히 일치할 때만 수정하며, 한 글자라도 달라졌으면 전부 롤백한다.
--
-- 주요 교정:
--   - 무리뉴의 Peaky Blinders 선호 외에 출처 없는 '중독'·장면 해석·성경 구절 제거
--   - 로댕은 Musée Rodin이 직접 확인하는 단테·위고 3종·보들레르 독서만 유지
--   - 을지문덕·김유신의 교육 배경을 특정 경전 개인 독서로 바꾼 추정 제거
--   - 네부카드네자르의 Enuma Elish 왕실 청중설과 개인 동일시 제거
--   - 히로시게의 본인 작품·후대 수용과 본인의 외부 작품 감상을 구분
--   - 최태원의 知難而行을 쑨원의 知難行易와 합친 오류 및 Meditations 추정 제거
--   - 마일스 데이비스는 직접 청취와 정확한 음원 판본 식별을 구분
--   - 윤봉길은 개벽·동아일보 직접 근거만 유지하고 조선농민 창간호 구독 추정 제거

BEGIN;

DO $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
조세 무리뉴는 2024년 TNT Sports의 즉답 인터뷰에서 가장 좋아하는 TV 프로그램을 묻자 「피키 블라인더스」라고 답했다. 작품명과 선호가 본인 발언으로 확인돼 이 드라마를 감상 콘텐츠로 연결한다.

무리뉴의 가톨릭 신앙과 기도 습관은 여러 인터뷰에 남아 있지만, 종교적 정체성만으로 특정 성경 판본의 독서를 등록할 수는 없다. 기존 글의 ‘피키 블라인더스 중독’, 토미 셸비의 특정 장면에 대한 해석, 자신의 코칭과 연결했다는 설명, 신약 구절을 반복 인용했다는 주장은 이번 표적 조사에서 근거를 확인하지 못해 제거했다.
$ko$),
      consumption_philosophy_en = btrim($en$
In a 2024 TNT Sports rapid-fire interview, José Mourinho was asked for his favourite television show and answered *Peaky Blinders*. The title and preference are direct first-person evidence, so the series is linked as consumed content.

Mourinho's Catholic faith and prayer practice are documented elsewhere, but a religious identity alone does not establish his reading of a specific Bible edition. The former journey's claims that he was addicted to the series, interpreted particular Tommy Shelby scenes through his own coaching, or repeatedly cited specific New Testament passages were not supported in this targeted audit and have been removed.
$en$)
  WHERE id = '86e86ceb-c73d-4849-8e99-b3540d784b6f'::uuid
    AND slug = 'jose-mourinho'
    AND md5(cultural_journey) = '2a41cc3903d89035644607c8f62b5d3d'
    AND md5(cultural_journey_en) = '0f9eae1041a53aa67e323950e411cd78';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '조세 무리뉴 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
로댕 미술관은 로댕이 젊은 시절부터 빅토르 위고를 흠모했고, 『노트르담 드 파리』·『명상시집』·특히 『동방시집』을 통해 그 경외를 키웠다고 설명한다. 미술관 소장품에는 로댕이 받거나 소장했던 위고의 시집도 남아 있다.

같은 미술관은 로댕을 단테의 열렬한 독자로 부르며 『신곡』의 「지옥편」이 「지옥의 문」의 중요한 원천이었다고 밝힌다. 로댕은 보들레르 『악의 꽃』의 열렬한 독자였고, 1887년에는 폴 갈리마르가 소장한 1857년 초판본에 직접 삽화를 그렸다. 이 다섯 작품은 작품명·독서·작업 관계가 공식 기록에서 함께 확인돼 연결한다.

기존 글의 『신곡』을 주머니에 넣고 다녔다는 설명, ‘단테와 단둘이 일 년을 살았다’는 인용, 『악의 꽃』이 작업대에 펼쳐져 있었다는 장면은 이번 조사에서 신뢰할 출처를 확인하지 못해 제거했다.
$ko$),
      consumption_philosophy_en = btrim($en$
The Musée Rodin states that Rodin admired Victor Hugo from his youth through *Notre-Dame de Paris*, *Les Contemplations*, and especially *Les Orientales*. The museum's collection also preserves volumes by Hugo that Rodin received or owned.

The museum also describes Rodin as a great reader of Dante and identifies the *Inferno* section of the *Divine Comedy* as a major source for *The Gates of Hell*. Rodin was a fervent reader of Baudelaire's *Les Fleurs du Mal*, and in 1887 he illustrated Paul Gallimard's copy of the 1857 first edition. These five works are linked because the titles, reading, and working relationships are explicit in the museum record.

The former journey's pocket-copy story, the quotation about living alone with Dante for a year, and the image of *Les Fleurs du Mal* lying open on Rodin's workbench were not supported by reliable sources found in this audit and have been removed.
$en$)
  WHERE id = 'a26f7451-aea0-4206-a899-b95f62a6d5fc'::uuid
    AND slug = 'auguste-rodin'
    AND md5(cultural_journey) = 'ac735a4af57e4a92183cc6e483dc16ba'
    AND md5(cultural_journey_en) = '01b919077a988962a352087d4447cd79';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '오귀스트 로댕 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
『삼국사기』는 을지문덕이 지략이 있고 문장에 능했다고 기록하며, 적장 우중문에게 보낸 한시 네 구절을 전한다. 시는 상대의 능력을 치켜세운 뒤 만족하고 돌아가라고 권하는 반어로 읽히며, 살수대첩의 외교·심리전과 함께 그의 문장 능력을 보여준다.

그러나 이 기록이 을지문덕이 어떤 유학 경전·중국 시문학·병법서를 직접 읽었는지는 말해 주지 않는다. 고구려 귀족 교육의 일반상과 완성된 시의 형식만으로 특정 작품의 개인 독서를 역산할 수 없으므로, 기존 글의 경전·병법서 체득 서술은 제거했다. 이번 표적 조사에서는 DB에 연결할 외부 작품을 확인하지 못했다.
$ko$),
      consumption_philosophy_en = btrim($en$
The *Samguk Sagi* describes Eulji Mundeok as a strategist skilled in writing and preserves the four-line poem he sent to the Sui general Yu Zhongwen. Its praise followed by advice to withdraw can be read as irony and as part of the diplomacy and psychological warfare surrounding the Battle of Salsu.

The record does not, however, identify any Confucian classic, Chinese poetic work, or military text that Eulji personally read. A general reconstruction of Goguryeo elite education and the form of a surviving poem cannot establish a specific reading history. Those inferred books have therefore been removed, and this targeted audit found no external work eligible for a database link.
$en$)
  WHERE id = 'b4e5ff19-1001-42c0-ae4e-c943cee2e65f'::uuid
    AND slug = 'eulji-mundeok'
    AND md5(cultural_journey) = '1b0acfe205c9942786dfec076b893230'
    AND md5(cultural_journey_en) = '6c51aa94d29a0ba256ea9964fb8bfbd4';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '을지문덕 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
네부카드네자르 2세의 바빌론 재건은 왕명과 신앙을 건축·비문·유약 벽돌에 새긴 대규모 시각 문화였다. 이슈타르 문과 에사길라 신전의 복원은 마르두크 숭배와 왕권을 도시 공간에 결합한 사업이었다.

바빌로니아 신년 의례에서 창세 서사시 『에누마 엘리시』가 낭송됐다는 전통은 확인되지만, 남은 자료는 네부카드네자르가 그 낭송의 ‘최고 청중’이었거나 마르두크의 승리를 자신의 정복과 포개어 읽었다는 개인 감상까지 증명하지 않는다. 오히려 알려진 독자·청자는 서기관과 학생으로 한정된다는 연구가 있다. 따라서 이 작품을 개인 감상 콘텐츠로 연결하지 않는다.

공중정원을 왕비 아미티스를 위해 지었다는 이야기도 후대 전승이며, 이를 왕의 자연 감상 설계로 단정하지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
Nebuchadnezzar II's rebuilding of Babylon embedded royal claims and cultic imagery in architecture, inscriptions, and glazed brick. The restoration of the Ishtar Gate and the Esagila temple joined the worship of Marduk to the city's royal landscape.

The recitation of the creation epic *Enuma Elish* in the Babylonian New Year festival is part of the ritual tradition, but the surviving evidence does not establish Nebuchadnezzar as its “supreme audience” or show him reading Marduk's victory as an image of his own conquests. Scholarship notes that the known readers and hearers are scribes and students. The epic is therefore not linked as his personal consumed content.

The story that the Hanging Gardens were built for Queen Amytis is also later tradition and is not treated here as a documented act of the king's aesthetic reception.
$en$)
  WHERE id = '9f31d439-5a33-456b-9817-760fb3ba590e'::uuid
    AND slug = 'nebuchadnezzar-ii'
    AND md5(cultural_journey) = '919c3c9e2ef35f85623447435fb1c6ee'
    AND md5(cultural_journey_en) = '64d19bf05689ae50e61e919081403ba3';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '네부카드네자르 2세 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
우타가와 히로시게는 우타가와 도요히로 문하에서 우키요에를 익힌 뒤 풍경 판화의 새로운 정점을 만들었다. 『도카이도 53차』와 『에도 명소 100경』은 계절·날씨·시간을 화면 구성에 담아낸 그의 대표 연작이며, 반 고흐를 비롯한 후대 서양 화가들이 이를 모사하고 수용했다.

그러나 두 연작은 히로시게 자신의 창작물이지 외부 감상 콘텐츠가 아니다. 가노파·남화·서양 원근법을 흡수했다는 미술사적 설명이나 호쿠사이의 영향도, 이번 표적 조사에서는 히로시게가 특정 작품을 직접 보았다는 개인 기록으로 좁혀지지 않았다. 후대의 영향 관계를 본인의 감상 이력으로 뒤집지 않고, 이번에는 콘텐츠를 연결하지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
Utagawa Hiroshige trained under Utagawa Toyohiro and went on to create a new peak in landscape printmaking. *The Fifty-three Stations of the Tokaido* and *One Hundred Famous Views of Edo* are his own major series, using season, weather, and time as compositional elements; later Western artists including Van Gogh copied and absorbed them.

Those series are Hiroshige's own works, not external content he consumed. Art-historical descriptions of Kano, Southern School, Western perspective, or Hokusai's influence were not narrowed in this targeted audit to a personal record of Hiroshige viewing a specific work. Later influence is not reversed into an undocumented viewing history, so no content is linked here.
$en$)
  WHERE id = 'de63016f-6f0b-4959-84bd-dfc05ad3097f'::uuid
    AND slug = 'utagawa-hiroshige'
    AND md5(cultural_journey) = '26cc0ea14bc40a728e1883e9f6e0f1dc'
    AND md5(cultural_journey_en) = 'febe91322082f8fa6d83a914cac947b8';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '우타가와 히로시게 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
최태원은 2025년 신년사에서 ‘어려움을 알면서도 행동한다’는 뜻으로 ‘지난이행(知難而行)’을 화두로 제시했다. 다만 쑨원이 『건국방략』에서 전개한 대표 명제는 ‘아는 것은 어렵고 행하는 것은 쉽다’는 ‘지난행이(知難行易)’다. 두 문구는 글자와 뜻이 다르므로 최태원의 발언을 곧바로 쑨원의 책에서 가져온 독서 인용으로 볼 수 없다.

수감 생활과 사회적 기업 활동, 감정을 다스리라는 경영 발언만으로 마르쿠스 아우렐리우스의 『명상록』을 읽었다고 단정할 수도 없다. 『새로운 모색, 사회적기업』은 최태원 자신의 저작이어서 감상 콘텐츠에서 제외한다. 이번 표적 조사에서는 『건국방략』이나 『명상록』의 직접 독서 근거를 확인하지 못해 연결하지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
In his 2025 New Year message, Chey Tae-won used the phrase 知難而行 to mean acting even while knowing the difficulty. Sun Yat-sen's well-known proposition in *Plans for National Reconstruction* is 知難行易, meaning that knowing is difficult and action is easy. The wording and argument are different, so Chey's phrase cannot be treated as evidence that he drew it from Sun's book.

Chey's imprisonment, social-enterprise work, and general advice about emotional steadiness also do not establish that he read Marcus Aurelius's *Meditations*. *A New Search: Social Enterprise* is Chey's own work and is excluded from consumed content. This targeted audit found no direct reading evidence for either external book, so neither is linked.
$en$)
  WHERE id = 'b2602d58-0fd5-4c4f-9804-c5739e44259b'::uuid
    AND slug = 'chey-tae-won'
    AND md5(cultural_journey) = 'ecce39b137358e63718b699a47c6af6d'
    AND md5(cultural_journey_en) = '9fc884784a76e93f857fa3f770c33cd3';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '최태원 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
마일스 데이비스는 자서전에서 슬라이 앤 더 패밀리 스톤을 처음 들었을 때 초기 음반들을 거의 닳도록 들었다고 회고하며 「Stand!」를 직접 열거했다. 반복 청취가 본인 발언으로 확인되고 정확한 Spotify 앨범도 식별돼 DB에 연결한다.

그는 친구 조 몬드라곤의 집에서 호아킨 로드리고의 「콘시에르토 데 아랑후에스」 음반을 들은 뒤 길 에번스와 『Sketches of Spain』 작업으로 나아갔다. 폴 벅마스터를 통해 슈톡하우젠의 『Hymnen』을 접하고 자동차에서 테이프로 반복해 들었다는 회고도 남아 있다. 두 작품은 직접 관계는 통과했지만, 첫 작품은 그가 들은 정확한 연주 음반을, 둘째는 정확한 Spotify 발매본을 식별하지 못해 등록을 보류했다. DB에 이미 있는 데이비스 본인의 「콘시에르토 데 아랑후에스」 녹음은 외부 감상 음원으로 대신 연결하지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
In his autobiography, Miles Davis recalled that when he first heard Sly and the Family Stone he almost wore out their early records, explicitly naming *Stand!*. The repeated listening is first-person evidence and the exact Spotify album is identifiable, so it is linked.

At Joe Mondragon's home, Davis also heard a recording of Joaquin Rodrigo's *Concierto de Aranjuez*, an encounter that led toward his work with Gil Evans on *Sketches of Spain*. He also recalled encountering Stockhausen's *Hymnen* through Paul Buckmaster and repeatedly playing it on tape in his car. Both relationships pass, but the exact performance recording of the first work and the exact Spotify release of the second could not be identified securely. Davis's own existing *Concierto de Aranjuez* recording is not substituted for the external recording he heard.
$en$)
  WHERE id = '400000f8-43be-4bda-9ed9-cfaea653bb91'::uuid
    AND slug = 'miles-davis'
    AND md5(cultural_journey) = 'd25f4f978dc22c4dcc956713e133e36b'
    AND md5(cultural_journey_en) = 'a64df60dee286997adeb8e2d85539066';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '마일스 데이비스 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
윤봉길은 서당에서 한학을 배우는 한편 새 지식에도 관심을 두고 책을 사 보았다. 국가사편찬위원회 우리역사넷은 그가 『동아일보』를 구독했고, 1920년대의 계몽잡지 『개벽』을 한 호도 빠지지 않고 구해 보며 민족 문제와 농촌 문제를 고민했다고 기록한다. 두 매체는 직접 구독·열독 관계가 확인된다.

다만 기존 글의 『조선농민』 창간호부터 구독했다는 설명은 이번 표적 조사에서 신뢰할 근거를 확인하지 못했다. 사서삼경의 특정 작품을 개인 독서 목록으로 확정할 자료도 부족하다. 윤봉길이 1927년 야학 교재 『농민독본』 세 권을 쓴 사실은 확인되지만 본인 저작이므로 감상 콘텐츠에서 제외한다.

『개벽』과 『동아일보』는 직접 관계를 통과했어도 현재 BOOK 등록 규격인 네이버·Open Library의 정확한 ISBN 판본이 아니어서 DB 연결은 보류한다.
$ko$),
      consumption_philosophy_en = btrim($en$
Yun Bong-gil studied classical Chinese in a village school while continuing to seek newer forms of knowledge and buying books when he could. The National Institute of Korean History records that he subscribed to *Dong-A Ilbo* and obtained every issue of the 1920s enlightenment magazine *Gaebyeok*, using them to think about national and rural problems. Both subscription and sustained reading are direct evidence.

The former journey's claim that he subscribed to *Joseon Nongmin* from its first issue was not supported by a reliable source found in this targeted audit. The evidence is also insufficient to turn his classical education into a work-by-work personal reading list. Yun did write the three-volume *Farmer's Primer* for a night school in 1927, but it is his own work and is excluded from consumed content.

Although *Gaebyeok* and *Dong-A Ilbo* pass the relationship check, neither can be matched to an exact ISBN edition in Naver or Open Library, so both remain unregistered.
$en$)
  WHERE id = '42eaf2e0-11be-4764-b103-3400098c796a'::uuid
    AND slug = 'yun-bong-gil'
    AND md5(cultural_journey) = '0b612f7447f036f4c549c527fa7aa65c'
    AND md5(cultural_journey_en) = 'f4744516fdc3d6bc315a241695cf8157';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '윤봉길 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
『삼국사기』는 김유신이 열다섯에 화랑이 되어 용화향도를 이끌고, 중악 석굴에서 나라의 위기를 두고 하늘에 맹세했으며, 난승에게 비법을 전수받았다는 일화를 전한다. 천관녀의 집으로 향한 말의 목을 벤 이야기도 그의 결단을 보여주는 후대의 대표 서사다.

그러나 임신서기석의 『시경』·『서경』·『예기』 학습 맹세는 이름이 전하지 않는 두 청년의 기록이지 김유신의 독서 기록이 아니다. 화랑 교육의 일반적 불교·유교 성격만으로 그가 특정 경전을 외웠거나 읽었다고 단정할 수도 없다. 세속오계 역시 원광이 귀산과 추항에게 준 계율로 전해지며, 김유신의 작품별 감상 목록은 아니다.

기존 글이 교육 제도와 후대 기록을 김유신 개인의 특정 독서로 바꾼 부분을 제거했으며, 이번 표적 조사에서는 연결할 외부 작품을 확인하지 못했다.
$ko$),
      consumption_philosophy_en = btrim($en$
The *Samguk Sagi* records that Kim Yu-sin became a Hwarang leader at fifteen, made a vow in the Jungak cave during a national crisis, and received a secret method from the old man Nanseung. The story of killing the horse that carried him toward a courtesan's house is also a prominent later narrative of his resolve.

The Imsinseogijeok inscription's pledge to study the *Book of Songs*, *Book of Documents*, and *Book of Rites* belongs to two unnamed youths, not to Kim Yu-sin. The general Buddhist and Confucian character of Hwarang education likewise cannot establish that Kim personally read or memorized particular classics. The Five Secular Precepts are traditionally addressed by Won Gwang to Gwisan and Chuhang, not preserved as Kim's work-by-work reading list.

The former journey's conversion of institutions and later records into Kim's personal reading history has been removed. This targeted audit found no external work eligible for a database link.
$en$)
  WHERE id = '84077a82-2e00-440b-8c0d-6cc86303abc9'::uuid
    AND slug = 'kim-yu-sin'
    AND md5(cultural_journey) = 'f130e32e15da00a2d3d4287f51b9b82f'
    AND md5(cultural_journey_en) = 'ee11187454bbe6b965b84aae652ac890';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '김유신 감상여정 기준선이 달라졌습니다.';
  END IF;
END;
$$;

COMMIT;

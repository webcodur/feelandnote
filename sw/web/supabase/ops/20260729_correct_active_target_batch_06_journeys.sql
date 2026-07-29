-- 활성 + 감상여정 명시 작품군 6차 조사에서 확인한 감상여정 오류 16명을 교정한다.
--
-- 콘텐츠 등록 SQL과 분리해서 실행한다. 대상 원문의 ko/en MD5가 2026-07-29
-- 실DB 기준선과 정확히 일치할 때만 수정하며, 한 글자라도 달라졌으면 전부 롤백한다.
--
-- 주요 교정:
--   - 직접 소비와 본인 저작·후대 저술·연구대상·단순 비교를 구분
--   - 법현·그레고리우스·류현진·발머·빌리 홀리데이는 확인된 작품만 남김
--   - 제시 오언스·차범근·바스와니·키루스·칭기즈 칸·유스티니아누스·안녹산·
--     붓다·루이 16세·마크 레이버트의 근거 없는 개인 독서·감상 장면 제거
--   - 혼다의 광고 성격과 발머의 퇴임 연도를 교정

BEGIN;

DO $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
법현은 불교 계율서를 구하기 위해 서역과 인도를 순례했다. 자신의 여행기 『불국기』는 다마리제국에서 『마하승기율』, 『대반열반경』, 『잡아비담심론』 등을 얻어 베꼈다고 작품명을 직접 기록한다.

이 가운데 『마하승기율』은 정확히 식별되는 현대 판본이 있어 DB에 연결했다. 『대반열반경』은 현존 판본의 번역 계통이 달랐고, 『잡아비담심론』은 네이버와 OpenLibrary에서 적격 ISBN 판본을 찾지 못해 보류했다. 『불국기』는 법현 자신의 저작이므로 감상 콘텐츠에서 제외한다.
$ko$),
      consumption_philosophy_en = btrim($en$
Faxian traveled through Central Asia and India in search of Buddhist books of discipline. His own travel record explicitly says that in Tamralipti he obtained and copied texts including the Mahasanghika Vinaya, the Mahaparinirvana Sutra, and a Mahasanghika Abhidharma work.

The Mahasanghika Vinaya is linked because an exact identifiable modern edition was secured. The available Mahaparinirvana editions belonged to a different translation lineage, and no eligible ISBN edition of the Abhidharma text was found in Naver or Open Library. Faxian's own travel record is excluded as his authored work.
$en$)
  WHERE id = 'f6753a3e-57bc-4ce4-bf3a-877142ca1a94'::uuid
    AND slug = 'faxian'
    AND md5(cultural_journey) = '5ac9c50cb1cef094893bc7eee459888e'
    AND md5(cultural_journey_en) = '06d3dd3303c80f05ace38672a343ecd1';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '법현 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
그레고리우스 1세의 저술 가운데 『욥기 주해』는 성경 욥기의 본문을 문자적·비유적·도덕적 차원에서 검토한 방대한 주석이다. 본문을 직접 읽고 해석한 관계가 분명하므로 DB에는 욥기를 포함한 성경을 연결한다.

『에제키엘 강해』, 『복음 강해』, 『사목 규칙서』는 그레고리우스 자신의 저작이어서 감상 콘텐츠가 아니다. 이른바 ‘그레고리오 성가’를 그가 직접 수집하고 편찬했다는 전통적 귀속도 오늘날 그대로 확정할 수 없으므로 개인 음악 감상 장면으로 바꾸지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
Gregory the Great's *Moralia in Job* is an extensive commentary that examines the biblical text of Job at literal, allegorical, and moral levels. The direct act of reading and interpreting the text is clear, so the database links the Bible containing Job.

His homilies on Ezekiel and the Gospels and the *Pastoral Rule* are Gregory's own works, not consumed content. The traditional attribution of the collection and organization of Gregorian chant cannot simply be treated as a settled record of his personal musical listening.
$en$)
  WHERE id = 'fd611565-b9a9-4176-9a74-8813127f62a1'::uuid
    AND slug = 'pope-gregory-i'
    AND md5(cultural_journey) = '28ffa7970f84ac1bf616c003eb79927b'
    AND md5(cultural_journey_en) = '42ae7c9b3daf651e6a444a5b8f840ee6';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '그레고리우스 1세 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
류현진은 2013년 자신의 별명에서 제목을 딴 제드의 응원가 「KOREAN MONSTER」를 직접 듣고 만족감을 표했다. 자신의 노래가 생긴 일이 특별한 경험이라고 말한 기록까지 확인돼 DB에 연결한다.

정용화의 「Ryu Can Do It」도 류현진이 차에서 듣고 따라 부른다는 직접 관계가 확인됐다. 다만 Spotify에서 원곡을 정확히 식별하지 못해 보류했다. 기존 감상여정에 있던 데모 청취 시점, 즉석 결정, 수년간의 반복 청취 같은 세부 장면은 확인된 기사보다 구체적이어서 제거한다.
$ko$),
      consumption_philosophy_en = btrim($en$
In 2013 Ryu Hyun-jin listened to JED's cheer song “KOREAN MONSTER,” titled after his nickname, and expressed satisfaction, calling the experience of having his own song special. That documented response supports the database link.

Ryu also said he listened and sang along to Jung Yong-hwa's “Ryu Can Do It” in his car, but the original track could not be matched securely in Spotify. The former journey's precise demo-listening scene, immediate decision, and years of repeated listening went beyond the verified reports and have been removed.
$en$)
  WHERE id = 'bd04ee3a-3965-4123-b4af-9fe99d8150f5'::uuid
    AND slug = 'hyun-jin-ryu'
    AND md5(cultural_journey) = '5aad6cabfea562fc5957e71e404a554a'
    AND md5(cultural_journey_en) = '1d11da37421006f946501161f49dbc48';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '류현진 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
제시 오언스가 어린 시절 코치 찰스 라일리와 체육 교사 찰스 패독의 영향을 받았다는 전기는 확인된다. 그러나 기존 감상여정은 오언스가 십 대였던 1920년대 중반에 패독이 막 펴낸 1932년 자서전을 읽었다고 서술해 연대가 맞지 않는다.

『노예의 굴레를 벗고』와 『영혼의 절규』를 오언스가 읽었다는 개인 기록도 이번 표적 조사에서 확보하지 못했다. 『나는 변했다』는 오언스 자신의 저작이다. 따라서 세 책을 경기 전략과 정치적 선택의 직접 원인으로 묶은 서술을 제거하고, 등록 콘텐츠는 두지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
Biographies support the influence of Jesse Owens's early coaches and his awareness of sprinter Charles Paddock. The former journey, however, placed Owens reading Paddock's 1932 autobiography in the mid-1920s when Owens was a teenager, which is chronologically impossible.

This targeted audit also found no personal record of Owens reading *Up from Slavery* or *Soul on Ice*. *I Have Changed* is Owens's own work. The three books are therefore no longer presented as direct causes of his racing strategy or political choices, and no content is registered.
$en$)
  WHERE id = 'ba34a1e5-dfba-4367-97f7-ada8a8b1d439'::uuid
    AND slug = 'jesse-owens'
    AND md5(cultural_journey) = '7ccec392cf8d76b084d3367efe9c8cd4'
    AND md5(cultural_journey_en) = 'ec4997d851186133320853819608c297';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '제시 오언스 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
혼다 소이치로는 1936년 잡지 『輪業の世界』에서 아트상회의 광고를 보고 도쿄로 가겠다고 결심했다. 혼다 공식 연혁에 따르면 채용 공고를 보고 지원한 것이 아니라, 광고를 본 뒤 일자리를 청하는 편지를 먼저 보냈다.

기존 감상여정의 ‘견습공 모집 광고’와 흑백 도판을 해부하듯 읽었다는 장면은 자료와 다르거나 확인되지 않아 제거한다. 잡지와의 직접 관계는 통과했지만 네이버와 OpenLibrary에서 정확히 대응하는 ISBN 판본을 찾지 못해 DB 등록은 보류한다.
$ko$),
      consumption_philosophy_en = btrim($en$
In 1936 Soichiro Honda saw an Art Shokai advertisement in the magazine *Ringyo no Sekai* and decided to go to Tokyo. Honda's official history says he wrote an unsolicited letter asking for work after seeing the advertisement; it was not a recruitment notice.

The former journey's apprentice-vacancy wording and scene of dissecting black-and-white plates were unsupported and have been removed. The magazine passed the relationship check, but no exact ISBN edition could be found in Naver or Open Library, so it remains unregistered.
$en$)
  WHERE id = 'ac561feb-db5c-4239-8065-5c743a0fcad8'::uuid
    AND slug = 'soichiro-honda'
    AND md5(cultural_journey) = '65cf1c2a70e01e54f5fb68d4eb3ca4cf'
    AND md5(cultural_journey_en) = '0ef6eec06a8f551acd44ac93e9fdb1fb';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '혼다 소이치로 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
스티브 발머는 2013년 9월 마이크로소프트의 마지막 전 직원 회의에서 「(I've Had) The Time of My Life」를 소개했다. 그는 자신의 재직 기간을 돌아보고 회사의 미래를 내다보는 노래라고 설명한 뒤 그 음악에 맞춰 무대를 떠났다.

기존 감상여정은 이 장면을 2014년으로 적었으나 실제 행사는 2013년이었다. 노래가 영화 「더티 댄싱」의 삽입곡이라는 사실만으로 발머가 영화 전체를 감상했다고 볼 수 없어, DB에는 공개적으로 선택하고 해석한 노래만 연결한다.
$ko$),
      consumption_philosophy_en = btrim($en$
At his final Microsoft employee meeting in September 2013, Steve Ballmer introduced “(I've Had) The Time of My Life.” He described it as a song for looking back on his years at Microsoft and forward to the company's future, then left the stage to it.

The former journey dated the scene to 2014, but the event occurred in 2013. The song's use in *Dirty Dancing* does not prove Ballmer watched the entire film, so only the song he publicly selected and interpreted is linked.
$en$)
  WHERE id = '33eb862e-c5c5-432b-82a1-906f47a9e7af'::uuid
    AND slug = 'steve-ballmer'
    AND md5(cultural_journey) = '20af6760903ff353ba2222099e809503'
    AND md5(cultural_journey_en) = 'f121637cd7aacefb4e36294621f823e0';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '스티브 발머 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
차범근의 선수 경력과 신앙은 여러 인터뷰와 기록에서 확인된다. 그러나 기존 감상여정이 묘사한 시편·잠언의 구체적인 반복 독서, 이를 경기 훈련법으로 바꾼 과정, 베켄바워가 특정 전기를 읽으라고 권했다는 장면은 이번 조사에서 신뢰할 만한 출처를 확보하지 못했다.

『차붐』은 차범근을 다룬 후대의 책이고, 성경과의 일반적 신앙 관계만으로 특정 판본의 독서를 등록할 수는 없다. 확인되지 않은 작품별 인과를 제거하며, 이번 표적 조사에서는 연결할 콘텐츠를 두지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
Cha Bum-kun's football career and Christian faith are documented in interviews and biographies. This audit, however, found no reliable source for the former journey's specific repeated reading of Psalms and Proverbs, its conversion into a training method, or a scene in which Beckenbauer recommended a particular biography.

*Cha Boom* is a later book about Cha, and a general religious identity is not enough to register a specific Bible edition. The unsupported work-by-work causal chain has been removed, and no content is linked in this audit.
$en$)
  WHERE id = '343535a8-17e0-40f7-b2b5-74d73338ecde'::uuid
    AND slug = 'cha-bum-kun'
    AND md5(cultural_journey) = '90aea6d2519b550c4fae348b5ae59d41'
    AND md5(cultural_journey_en) = '6f9989036293610f7d86920ffb882f48';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '차범근 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
아시시 바스와니는 2016년 구글 신경망 기계번역 논문과 2017년 「Attention Is All You Need」의 공동 저자다. 전자는 동료들의 외부 작품이 아니라 바스와니 본인이 함께 쓴 연구이며, 후자도 자신의 저작이므로 감상 콘텐츠에서 제외한다.

기존 감상여정의 LSTM 논문 정독 장면과 스티브 잡스의 발언을 개인적 설계 원칙으로 받아들였다는 서술은 이번 표적 조사에서 근거를 확보하지 못했다. 연구사의 기술적 선후 관계를 개인의 독서 일화로 바꾸지 않으며, 등록 콘텐츠는 두지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
Ashish Vaswani coauthored Google's 2016 neural machine translation paper and the 2017 paper *Attention Is All You Need*. The former is not an external work by colleagues that he merely consumed, and both are his own research, so neither belongs in consumed content.

This audit found no evidence for the former journey's private scene of studying a particular LSTM paper or adopting a Steve Jobs remark as a personal design principle. A technical sequence in research history is not converted into an undocumented reading anecdote, and no content is linked.
$en$)
  WHERE id = '2a1fc7e7-6776-40d2-88a2-eefb477e39f6'::uuid
    AND slug = 'ashish-vaswani'
    AND md5(cultural_journey) = '5bd400b4634313f91db5827f15bb1fab'
    AND md5(cultural_journey_en) = 'ee8b4aa61138c60606d048614b4d5408';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '아시시 바스와니 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
크세노폰의 『키루스의 교육』은 키루스 2세를 주인공으로 삼은 후대의 저술이고, 마키아벨리의 『군주론』도 약 2천 년 뒤에 쓰였다. 두 책은 키루스의 역사적 영향과 후대 수용을 보여주지만 그가 읽은 콘텐츠일 수는 없다.

기존 감상여정이 두 후대 저술의 문장을 키루스 자신의 독서와 통치 설계로 바꾼 부분을 제거한다. 키루스 시대의 직접적인 개인 감상 기록은 이번 조사에서 확인되지 않아 DB 콘텐츠를 등록하지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
Xenophon's *Cyropaedia* is a later work with Cyrus II as its subject, and Machiavelli's *The Prince* was written roughly two millennia afterward. The books illuminate Cyrus's later reception and influence, but they cannot be works he consumed.

The former journey turned statements in these later texts into Cyrus's own reading and political design. That reversal has been removed. This audit found no named external work directly consumed by the historical Cyrus, so no content is registered.
$en$)
  WHERE id = '1dcffe2e-3baf-4798-b21f-8ed3b403d843'::uuid
    AND slug = 'cyrus-the-great'
    AND md5(cultural_journey) = '38f130a23b454833d8944fa86bbffb08'
    AND md5(cultural_journey_en) = '2da5ffa74454dd9875bd9b6a0ba1495e';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '키루스 2세 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
빌리 홀리데이는 자서전에서 어린 시절 루이 암스트롱의 「West End Blues」 음반을 들었던 경험을 구체적으로 회고했다. 가사 없는 스캣에 매료되고 때로는 음반을 들으며 울었다는 반응까지 남아 있어 DB에 연결한다.

「Strange Fruit」는 아벨 미어로폴의 시를 바탕으로 만들어져 홀리데이에게 소개됐고, 이후 그녀의 대표적인 공연과 녹음이 됐다. 외부 텍스트를 접한 과정은 중요하지만 DB에서 정확히 식별되는 음원은 본인의 결과물이므로 외부 감상 콘텐츠로 중복 등록하지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
In her autobiography Billie Holiday specifically recalled hearing Louis Armstrong's “West End Blues” as a child. She described her fascination with its wordless scat passage and the tears the record could provoke, so it is linked in the database.

“Strange Fruit” grew from a poem by Abel Meeropol that was introduced to Holiday and became one of her defining performances and recordings. That encounter matters, but the database-identifiable audio is Holiday's own output and is not duplicated as externally consumed content.
$en$)
  WHERE id = '6a62be37-0d92-4cbf-93ad-72ae21f44a65'::uuid
    AND slug = 'billie-holiday'
    AND md5(cultural_journey) = '5a89f54c5e13891d32978120dc05c765'
    AND md5(cultural_journey_en) = 'c3d2b9f3e5692359601b9916bee8111c';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '빌리 홀리데이 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
칭기즈 칸의 궁정에서 야율초재 같은 고문들이 중국 고전과 역사 지식을 활용했다는 사실은 몽골 제국의 지적 환경을 보여준다. 그러나 고문이 『신어』나 『송서』의 구절을 인용했다는 기록만으로 칭기즈 칸이 그 책 전체를 직접 읽었다고 볼 수는 없다.

기존 감상여정은 번역·낭독·조언의 가능성을 칭기즈 칸 개인의 독서 장면과 정책 인과로 확정했다. 직접 소비가 확인되지 않은 두 책은 등록하지 않으며, 궁정의 지식 전달과 개인 독서를 구분한다.
$ko$),
      consumption_philosophy_en = btrim($en$
The use of Chinese classics and history by advisers such as Yelü Chucai illuminates the intellectual environment of Genghis Khan's court. An adviser quoting a passage from *Xinyu* or the *Book of Song*, however, does not establish that Genghis personally read the entire work.

The former journey converted possible translation, recitation, and counsel into a settled personal reading scene and policy cause. The two books are not registered because direct consumption was not verified; court knowledge transmission and individual reading remain distinct.
$en$)
  WHERE id = 'e94f8fc2-9010-4f39-9d32-2dad78a83cd2'::uuid
    AND slug = 'genghis-khan'
    AND md5(cultural_journey) = 'fac46d835bf3366e9cab2e3692588167'
    AND md5(cultural_journey_en) = 'c5134d006296848ac9fcd82b6741613c';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '칭기즈 칸 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
유스티니아누스 1세는 트리보니아누스가 이끄는 위원회에 로마법의 수집과 정리를 명해 『로마법대전』을 편찬하게 했다. 『칙법휘찬』, 『학설휘찬』, 『법학제요』는 그 통치 아래 만들어진 법전 사업의 구성물이다.

군주가 편찬을 명하고 공포했다는 사실은 자신의 정치·법률 활동이지, 네 책을 외부 콘텐츠로 감상했다는 개인 기록이 아니다. 기존 감상여정의 정독 장면과 내면 변화는 자료 없이 덧붙인 것이어서 제거하고, 본인 통치 사업의 산출물은 감상 콘텐츠로 등록하지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
Justinian I commissioned a committee led by Tribonian to collect and organize Roman law. The Codex, Digest, and Institutes are components of the legal corpus produced under his rule.

Commissioning and promulgating the compilation are acts of government, not personal evidence that Justinian consumed the four works as external content. The former journey's scenes of close reading and inner transformation were unsupported and have been removed. Products of his own imperial project are not registered as consumed content.
$en$)
  WHERE id = '525fd227-5f41-456c-a33a-2367fc02bb42'::uuid
    AND slug = 'justinian-i'
    AND md5(cultural_journey) = 'bbfeaeb6d6b548182ec366396bda71ad'
    AND md5(cultural_journey_en) = '436b3dc5ad3ccaf6154cb5e8276b6fcf';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '유스티니아누스 1세 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
『구당서』는 안녹산이 죽은 뒤 편찬된 역사서이며, 백거이의 「장한가」도 안사의 난을 배경으로 후대에 쓰인 시다. 두 작품은 안녹산의 행적과 난에 대한 후대 기억을 보여주지만 그가 읽거나 들은 콘텐츠일 수는 없다.

기존 감상여정이 후대 사료의 서술과 시적 재현을 안녹산 자신의 독서·감상으로 뒤집은 부분을 제거한다. 이번 조사에서는 그가 직접 소비한 이름 있는 외부 작품을 확인하지 못해 콘텐츠를 등록하지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
The *Old Book of Tang* was compiled after An Lushan's death, and Bai Juyi's “Song of Everlasting Sorrow” was a later poem shaped by the rebellion. These works show how An and the rebellion were remembered, but they cannot be content he read or heard.

The former journey reversed later historical and poetic representations into An Lushan's own consumption. That error has been removed. No named external work directly consumed by him was verified in this audit, so no content is registered.
$en$)
  WHERE id = '7c35e93e-b4fe-49c1-9cb6-f105f6a58f78'::uuid
    AND slug = 'an-lushan'
    AND md5(cultural_journey) = 'dab8f8d05709318200fce476be0ed71d'
    AND md5(cultural_journey_en) = 'e2ab738e745e461945cfff46639fca67';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '안녹산 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
고타마 붓다가 성장한 문화권에 베다 전통과 여러 사상가의 가르침이 존재했다는 점은 역사적 배경이다. 그러나 그가 『베다』, 『우파니샤드』, 『찬도갸 우파니샤드』라는 특정 텍스트를 어떤 판본으로 직접 읽었다는 개인 기록은 이번 조사에서 확인되지 않았다.

『칼라마 경』은 붓다에게 귀속되는 설법을 후대 경전이 전하는 것이지, 그가 외부에서 감상한 작품이 아니다. 기존 감상여정의 구체적인 독서 순서와 사상적 인과를 제거하고, 시대적 지적 환경과 검증 가능한 콘텐츠 소비를 구분한다.
$ko$),
      consumption_philosophy_en = btrim($en$
Vedic traditions and competing teachers formed part of the intellectual background in which Gautama Buddha lived. This audit, however, found no personal record that he directly read specific editions of the *Vedas*, the *Upanishads*, or the *Chandogya Upanishad*.

The *Kalama Sutta* transmits teaching attributed to the Buddha; it is not an external work he consumed. The former journey's precise reading sequence and causal account have been removed, separating a historical intellectual environment from verifiable content consumption.
$en$)
  WHERE id = 'd8b7bbec-0610-42bf-8970-8b0846f0b63e'::uuid
    AND slug = 'siddhartha-gautama'
    AND md5(cultural_journey) = '251cb21e9c4bcceafedc02d7fc292a1e'
    AND md5(cultural_journey_en) = '0b0fd0a6b53d2e57759ae6fa7d2b9f7b';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '고타마 붓다 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
루이 16세는 왕세자 시절 역사·지리·언어 교육을 받았고, 책과 지도에 관심을 보였으며 개인 도서관도 갖췄다. 이 일반적인 독서 환경은 베르사유 자료로 확인할 수 있다.

그러나 기존 감상여정의 『로빈슨 크루소』 정독 장면과 이를 항해 지원 정책의 직접 원인으로 묶은 설명은 이번 조사에서 신뢰할 만한 개인 기록을 찾지 못했다. 일반적 관심을 특정 작품 소비로 바꾸지 않으며, 이번에는 등록 콘텐츠를 두지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
As dauphin, Louis XVI was educated in history, geography, and languages, showed an interest in books and maps, and maintained a personal library. Versailles materials support this general reading environment.

This audit found no reliable personal record for the former journey's close-reading scene involving *Robinson Crusoe* or the claim that it directly caused his support for navigation. A general interest is not converted into consumption of a named work, and no content is registered.
$en$)
  WHERE id = '2bbb5d80-b0f5-4af0-8218-8c2ed13fb2be'::uuid
    AND slug = 'louis-xvi'
    AND md5(cultural_journey) = '262e9026f9c91477593753f9e2e328e5'
    AND md5(cultural_journey_en) = '504f2117019a0728144716d8864e3964';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '루이 16세 감상여정 기준선이 달라졌습니다.';
  END IF;

  UPDATE public.profiles
  SET consumption_philosophy = btrim($ko$
마크 레이버트의 연구는 동물의 움직임과 균형을 공학적으로 재현하는 데 초점을 맞췄다. 그러나 기존 감상여정이 묘사한 머이브리지의 『동물의 운동』 도판을 직접 연구 노트처럼 사용했다는 장면은 이번 조사에서 레이버트 개인의 출처를 확인하지 못했다.

「터미네이터」, 「웨스트월드」, 「어벤져스: 에이지 오브 울트론」은 보스턴 다이내믹스 로봇을 설명할 때 대중적으로 비교되는 작품이다. 그런 비교만으로 레이버트가 영화를 보고 설계 원칙을 얻었다고 볼 수 없어, 개인 감상과의 인과를 제거하고 콘텐츠를 등록하지 않는다.
$ko$),
      consumption_philosophy_en = btrim($en$
Marc Raibert's research focused on engineering animal-like movement and balance. This audit, however, found no personal source for the former journey's scene in which he directly used Muybridge's *Animal Locomotion* plates as a research notebook.

*The Terminator*, *Westworld*, and *Avengers: Age of Ultron* are popular comparisons used when discussing Boston Dynamics robots. Such comparisons do not establish that Raibert watched the films and derived design principles from them. The unsupported personal causal link has been removed, and no content is registered.
$en$)
  WHERE id = 'd22b46a0-e493-4e2c-8ed8-e37f4766ed3f'::uuid
    AND slug = 'marc-raibert'
    AND md5(cultural_journey) = 'b15fbb97a5b0f0b252305f4d5dc13910'
    AND md5(cultural_journey_en) = 'ef6dc553ef07bd257993ccaa1ad16e20';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '마크 레이버트 감상여정 기준선이 달라졌습니다.';
  END IF;
END;
$$;

COMMIT;

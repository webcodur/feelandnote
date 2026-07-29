-- 활성 + 감상여정 명시 작품군 36~55번의 근거 통과분을 원자적으로 반영한다.
--
-- 조사 결과:
--   - 20명, 추출 후보 31건 가운데 8명 12건만 통과
--   - 본인 저작, 본인을 다룬 작품, 단순 후원·도상·공연, 일반적인 영향 추정은 제외
--   - 소진이 읽었다는 문헌은 현존 『황제음부경』이 아니라 『사기』의
--     표기대로 소실 문헌 『주서 음부』로 별도 등록
--
-- 반영:
--   - 신규 도서 3종, 음악 6종과 ko/en locale 18행
--   - 기존 『수호전』·『변신 이야기』·영화 <스타워즈> 재사용
--   - 호쿠사이·음바페·소진·사이고·야오밍·티치아노·드보르자크·
--     호나우지뉴에게 콘텐츠 12건 연결
--   - 위 8명을 light에서 full로 승격
--
-- 이 파일은 20260729_correct_active_target_batch_03_journeys.sql보다 먼저 실행한다.

BEGIN;

DO $$
DECLARE
  controlla_id text := gen_random_uuid()::text;
  genshi_shiroku_id text := gen_random_uuid()::text;
  zhou_shu_yinfu_id text := gen_random_uuid()::text;
  hiawatha_id text := gen_random_uuid()::text;

  faixa_amarela_id text := gen_random_uuid()::text;
  um_lindo_sonho_id text := gen_random_uuid()::text;
  could_you_be_loved_id text := gen_random_uuid()::text;
  excuse_me_miss_id text := gen_random_uuid()::text;
  naughty_girl_id text := gen_random_uuid()::text;

  affected integer;
  wrong_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'content_research_status'
  ) THEN
    RAISE EXCEPTION
      'content_research_status가 없습니다. 스키마 마이그레이션을 먼저 적용하세요.';
  END IF;

  -- 잘못된 UUID가 다른 인물을 승격하지 못하도록 id·slug·닉네임을 함께 잠근다.
  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('66c69179-b3b9-4688-ba22-22fb547acdcf'::uuid, 'katsushika-hokusai', '가쓰시카 호쿠사이'),
      ('c03eae39-9a8d-4d79-9503-006415536379'::uuid, 'kylian-mbappe', '킬리안 음바페'),
      ('37d269ae-7c6e-438a-b0e3-fff93488b790'::uuid, 'su-qin', '소진'),
      ('5eb8782e-b0fa-47b4-bb8d-ba6da4e7bdac'::uuid, 'saigo-takamori', '사이고 다카모리'),
      ('3aff4f9a-286a-49e6-bfe3-5eca1930f059'::uuid, 'yao-ming', '야오밍'),
      ('e09c74d2-3289-44a3-b3f0-6334944f265f'::uuid, 'tiziano-vecellio', '티치아노 베첼리오'),
      ('03cce456-8367-4164-b026-07b777feb7b2'::uuid, 'antonin-dvorak', '안토닌 드보르자크'),
      ('44ee46f5-42aa-4729-a5b7-34d33b8f48b1'::uuid, 'ronaldinho', '호나우지뉴')
  ) AS expected(id, slug, nickname)
  LEFT JOIN public.profiles p
    ON p.id = expected.id
  WHERE p.id IS NULL
     OR p.slug IS DISTINCT FROM expected.slug
     OR p.nickname IS DISTINCT FROM expected.nickname
     OR p.profile_type IS DISTINCT FROM 'CELEB'
     OR p.status IS DISTINCT FROM 'active'
     OR p.celeb_tier IS DISTINCT FROM 'light'
     OR p.content_research_status IS DISTINCT FROM 'open';

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '3차 통과자 8명의 id/slug/tier/research 기준선이 달라졌습니다. 차이=%',
      wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.user_contents
  WHERE user_id IN (
    '66c69179-b3b9-4688-ba22-22fb547acdcf'::uuid,
    'c03eae39-9a8d-4d79-9503-006415536379'::uuid,
    '37d269ae-7c6e-438a-b0e3-fff93488b790'::uuid,
    '5eb8782e-b0fa-47b4-bb8d-ba6da4e7bdac'::uuid,
    '3aff4f9a-286a-49e6-bfe3-5eca1930f059'::uuid,
    'e09c74d2-3289-44a3-b3f0-6334944f265f'::uuid,
    '03cce456-8367-4164-b026-07b777feb7b2'::uuid,
    '44ee46f5-42aa-4729-a5b7-34d33b8f48b1'::uuid
  );

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '3차 통과자에게 이미 콘텐츠가 생겼습니다. 현재 연결 수=%',
      wrong_count;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM public.contents
  WHERE id IN (
    '104be5b3-84dd-4471-b03e-abcc3a3dc135',
    '13410b89-7c1f-4461-a1e2-b3f2975148e6',
    'dd2cf84b-e8e4-4669-b22b-d2cb56b8a676'
  );

  IF wrong_count <> 3 THEN
    RAISE EXCEPTION
      '재사용할 기존 콘텐츠 3종이 기준선과 다릅니다. 실제=%',
      wrong_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents
    WHERE external_id IN (
      'spotify-4CpKEkdGbOJV51cSvx7SoG',
      '9788997779895',
      'historical-zhou-shu-yinfu',
      '9791127279875',
      'spotify-131eE1wdPFIUAzxveZispD',
      'spotify-3edcczAZsUhCoJqIrbEIf1',
      'spotify-5O4erNlJ74PIF6kGol1ZrC',
      'spotify-0ZHu7jkSSrT0eK4OxuG4O5',
      'spotify-0YGQ3hZcRLC5YX7o0hdmHg'
    )
  ) THEN
    RAISE EXCEPTION
      '3차 신규 외부 ID 중 이미 등록된 값이 있습니다. 중복 후보를 먼저 병합하세요.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.content_locales
    WHERE isbn IN ('9788997779895', '9791127279875')
  ) THEN
    RAISE EXCEPTION
      '3차 신규 도서 ISBN이 이미 등록되어 있습니다. 중복 후보를 먼저 병합하세요.';
  END IF;

  INSERT INTO public.contents (
    id,
    type,
    release_date,
    external_source,
    external_id,
    metadata
  )
  VALUES
    (
      controlla_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-4CpKEkdGbOJV51cSvx7SoG',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/4CpKEkdGbOJV51cSvx7SoG',
        'artists', jsonb_build_array('Drake')
      )
    ),
    (
      genshi_shiroku_id,
      'BOOK',
      '2017-08-25',
      'naver_book',
      '9788997779895',
      '{}'::jsonb
    ),
    (
      zhou_shu_yinfu_id,
      'BOOK',
      NULL,
      NULL,
      'historical-zhou-shu-yinfu',
      jsonb_build_object(
        'workStatus', 'lost',
        'identityNote', 'Shiji names Zhou Shu Yinfu; it must not be merged with the extant Huangdi Yinfujing.'
      )
    ),
    (
      hiawatha_id,
      'BOOK',
      '2019-08-07',
      'naver_book',
      '9791127279875',
      jsonb_build_object(
        'openLibraryEdition', 'OL45012134M'
      )
    ),
    (
      faixa_amarela_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-131eE1wdPFIUAzxveZispD',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/131eE1wdPFIUAzxveZispD',
        'artists', jsonb_build_array('Zeca Pagodinho')
      )
    ),
    (
      um_lindo_sonho_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-3edcczAZsUhCoJqIrbEIf1',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/3edcczAZsUhCoJqIrbEIf1',
        'artists', jsonb_build_array('Grupo Fundo De Quintal')
      )
    ),
    (
      could_you_be_loved_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-5O4erNlJ74PIF6kGol1ZrC',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/5O4erNlJ74PIF6kGol1ZrC',
        'artists', jsonb_build_array('Bob Marley & The Wailers')
      )
    ),
    (
      excuse_me_miss_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-0ZHu7jkSSrT0eK4OxuG4O5',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/0ZHu7jkSSrT0eK4OxuG4O5',
        'artists', jsonb_build_array('JAY-Z')
      )
    ),
    (
      naughty_girl_id,
      'MUSIC',
      NULL,
      'spotify',
      'spotify-0YGQ3hZcRLC5YX7o0hdmHg',
      jsonb_build_object(
        'entityType', 'track',
        'spotifyUrl', 'https://open.spotify.com/track/0YGQ3hZcRLC5YX7o0hdmHg',
        'artists', jsonb_build_array('Beyoncé')
      )
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 9 THEN
    RAISE EXCEPTION
      '3차 신규 contents 등록 수가 9건이 아닙니다. 실제=%',
      affected;
  END IF;

  INSERT INTO public.content_locales (
    content_id,
    locale,
    title,
    creator,
    thumbnail_url,
    isbn,
    publisher,
    sources,
    verified
  )
  VALUES
    (
      controlla_id,
      'ko',
      'Controlla',
      '드레이크',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e029416ed64daf84936d89e671c',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      controlla_id,
      'en',
      'Controlla',
      'Drake',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e029416ed64daf84936d89e671c',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      genshi_shiroku_id,
      'ko',
      '언지록',
      '사토 잇사이',
      'https://shopping-phinf.pstatic.net/main_3244477/32444774678.20260401090650.jpg',
      '9788997779895',
      '알렙',
      '{"primary":"naver_book","thumbnail":"naver_book"}'::jsonb,
      true
    ),
    (
      genshi_shiroku_id,
      'en',
      'Genshi Shiroku: Four Records of Aspirations',
      'Sato Issai',
      'https://shopping-phinf.pstatic.net/main_3244477/32444774678.20260401090650.jpg',
      '9788997779895',
      'Aleph',
      '{"primary":"naver_book","thumbnail":"naver_book","note":"no_confirmed_english_edition"}'::jsonb,
      true
    ),
    (
      zhou_shu_yinfu_id,
      'ko',
      '주서 음부',
      '저자 미상',
      NULL,
      NULL,
      NULL,
      '{"primary":"chinese_text_project","thumbnail":"confirmed_unavailable","note":"lost_work_not_extant_huangdi_yinfujing"}'::jsonb,
      true
    ),
    (
      zhou_shu_yinfu_id,
      'en',
      'Zhou Shu Yinfu',
      'Anonymous',
      NULL,
      NULL,
      NULL,
      '{"primary":"chinese_text_project","thumbnail":"confirmed_unavailable","note":"lost_work_not_extant_huangdi_yinfujing"}'::jsonb,
      true
    ),
    (
      hiawatha_id,
      'ko',
      '하이아와사의 노래',
      '헨리 워즈워스 롱펠로',
      'https://shopping-phinf.pstatic.net/main_3244458/32444586142.20250626091440.jpg',
      '9791127279875',
      '부크크',
      '{"primary":"naver_book","thumbnail":"naver_book"}'::jsonb,
      true
    ),
    (
      hiawatha_id,
      'en',
      'The Song of Hiawatha',
      'Henry Wadsworth Longfellow',
      'https://covers.openlibrary.org/b/id/14542258-L.jpg',
      NULL,
      'Houghton Mifflin',
      '{"primary":"openlibrary","thumbnail":"openlibrary","edition":"OL45012134M"}'::jsonb,
      true
    ),
    (
      faixa_amarela_id,
      'ko',
      'Faixa Amarela',
      '제카 파고지뉴',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02d23a41aaa2dacd3146938bb0',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      faixa_amarela_id,
      'en',
      'Faixa Amarela',
      'Zeca Pagodinho',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02d23a41aaa2dacd3146938bb0',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      um_lindo_sonho_id,
      'ko',
      'Um Lindo Sonho',
      '그루포 푼두 지 킨타우',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02340186aed39cc39274361e6c',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      um_lindo_sonho_id,
      'en',
      'Um Lindo Sonho',
      'Grupo Fundo De Quintal',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02340186aed39cc39274361e6c',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      could_you_be_loved_id,
      'ko',
      'Could You Be Loved',
      '밥 말리 앤 더 웨일러스',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e027dbf92462bb542e9521489ff',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      could_you_be_loved_id,
      'en',
      'Could You Be Loved',
      'Bob Marley & The Wailers',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e027dbf92462bb542e9521489ff',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      excuse_me_miss_id,
      'ko',
      'Excuse Me Miss',
      '제이지',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02b7c45af95aaf599cee3acf08',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      excuse_me_miss_id,
      'en',
      'Excuse Me Miss',
      'JAY-Z',
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02b7c45af95aaf599cee3acf08',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      naughty_girl_id,
      'ko',
      'Naughty Girl',
      '비욘세',
      'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02a9fd4a0405945cd51e8de130',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    ),
    (
      naughty_girl_id,
      'en',
      'Naughty Girl',
      'Beyoncé',
      'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02a9fd4a0405945cd51e8de130',
      NULL,
      NULL,
      '{"primary":"spotify","thumbnail":"spotify"}'::jsonb,
      true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 18 THEN
    RAISE EXCEPTION
      '3차 신규 content_locales 등록 수가 18건이 아닙니다. 실제=%',
      affected;
  END IF;

  INSERT INTO public.user_contents (
    user_id,
    content_id,
    status,
    review,
    review_en,
    source_url,
    is_recommended
  )
  VALUES
    (
      '66c69179-b3b9-4688-ba22-22fb547acdcf'::uuid,
      '104be5b3-84dd-4471-b03e-abcc3a3dc135',
      'FINISHED',
      '프린스턴대학교 미술관은 1820년대 후반의 소묘를 호쿠사이가 『신편 수호화전』 삽화를 준비하며 그린 습작으로 분류한다. 미술관은 완성 인쇄본과 이 소묘를 비교해 호쿠사이가 인물 배치를 여러 차례 고쳤다고 설명한다. 특정 중국어 판본을 완독했다는 기록은 아니지만, 『수호전』을 일본식으로 각색한 서사를 삽화로 옮기기 위해 직접 검토한 자료이므로 등록한다.',
      'The Princeton University Art Museum identifies a late-1820s drawing as Hokusai''s preparatory study for an illustration in *Shinpen suiko gaden*, a Japanese adaptation of *Water Margin*. The museum compares the drawing with the final printed scene and describes Hokusai''s repeated revisions to the figures. This does not prove that he read a specific Chinese edition cover to cover, but it documents direct creative engagement with the narrative.',
      'https://artmuseum.princeton.edu/art/collections/objects/129899',
      false
    ),
    (
      'c03eae39-9a8d-4d79-9503-006415536379'::uuid,
      controlla_id,
      'FINISHED',
      'ESPN의 「Now or Never」 영상에서 진행자는 1분 29초 무렵 음바페에게 가장 좋아하는 노래를 묻는다. 음바페는 드레이크의 「Controlla」라고 바로 답했다. 짧은 문답이지만 인물 본인이 곡명과 선호를 직접 밝혔다.',
      'At about 1:29 in ESPN''s *Now or Never* video, the interviewer asks Mbappé for his favorite song. Mbappé immediately answers Drake''s “Controlla.” The exchange is brief, but it is a direct statement from Mbappé naming both the track and his preference.',
      'https://www.youtube.com/watch?v=kQgYHTGD6hE&t=89s',
      false
    ),
    (
      '37d269ae-7c6e-438a-b0e3-fff93488b790'::uuid,
      zhou_shu_yinfu_id,
      'FINISHED',
      '『사기』 「소진열전」은 소진이 『주서 음부』를 얻어 엎드려 읽었다고 기록한다. 이어 책의 내용을 거듭 헤아리며 설득법을 익혔다고 서술한다. 이 문헌의 실체는 분명하지 않으며, 현존 『황제음부경』과 같은 책으로 볼 근거가 없으므로 사료에 적힌 제목으로만 등록한다.',
      'The *Shiji* biography of Su Qin states that he obtained the *Zhou Shu Yinfu* and bent over it to read. It then describes him repeatedly pondering the text as he developed his methods of persuasion. The work''s identity is uncertain, and there is no sound basis for merging it with the extant *Huangdi Yinfujing*, so this entry preserves only the historical title.',
      'https://ctext.org/wiki.pl?chapter=859560&if=en&remap=gb',
      false
    ),
    (
      '5eb8782e-b0fa-47b4-bb8d-ba6da4e7bdac'::uuid,
      genshi_shiroku_id,
      'FINISHED',
      '도쿄도립도서관은 사토 잇사이의 네 저술을 『언지사록』이라고 설명한다. 도서관 자료에 따르면 사이고 다카모리는 네 책에서 101조를 뽑아 곁에 두었고 이를 정신적 버팀목으로 삼았다. 특정 한 권의 막연한 영향이 아니라 직접 발췌하고 보관한 기록이 확인된다.',
      'The Tokyo Metropolitan Library explains that Sato Issai''s four records are collectively known as the *Genshi Shiroku*. Its collection note states that Saigō Takamori selected 101 passages from the four works, kept them close at hand, and used them as spiritual support. This documents direct excerpting and continued use rather than a general claim of influence.',
      'https://www.library.metro.tokyo.lg.jp/collection/features/digital_showcase/038/02/',
      false
    ),
    (
      '3aff4f9a-286a-49e6-bfe3-5eca1930f059'::uuid,
      'dd2cf84b-e8e4-4669-b22b-d2cb56b8a676',
      'FINISHED',
      '2002년 AP 인터뷰는 야오밍이 가장 좋아하는 미국 영화로 「Star Wars」를 꼽았다고 전한다. 기사는 부제나 시리즈 전체를 따로 구분하지 않으므로 DB에서는 원제 「Star Wars」로 개봉한 1977년 영화를 연결한다. 작품이 자신의 삶과 닮았다는 기존 감상여정의 해석은 출처에서 확인되지 않는다.',
      'A 2002 Associated Press interview reports that Yao Ming named “Star Wars” as his favorite American movie. The article does not specify a subtitle or distinguish the wider series, so the database links the 1977 film originally released under that exact title. The source does not support the former cultural-journey claim that Yao saw his own life reflected in the story.',
      'https://www.mrt.com/news/article/China-s-Yao-Sets-His-Sights-on-NBA-7883056.php',
      false
    ),
    (
      'e09c74d2-3289-44a3-b3f0-6334944f265f'::uuid,
      '13410b89-7c1f-4461-a1e2-b3f2975148e6',
      'FINISHED',
      '영국 내셔널 갤러리는 티치아노가 오비디우스의 『변신 이야기』에 나오는 장면을 여러 작품으로 옮겼다고 설명한다. 「디아나와 칼리스토」와 「디아나와 악타이온」처럼 책의 구체적인 이야기를 재구성한 작품이 남아 있다. 특정 판본의 완독 기록은 아니지만, 문학 작품을 시각 서사로 바꾼 직접적인 창작 접촉으로 등록한다.',
      'The National Gallery explains that Titian drew multiple paintings from specific stories in Ovid''s *Metamorphoses*, including *Diana and Callisto* and *Diana and Actaeon*. This is not evidence that he completed a particular printed edition, but the surviving works document direct creative engagement with the literary source as he translated its narratives into painting.',
      'https://www.nationalgallery.org.uk/paintings/learn-about-art/ovid-s-metamorphoses',
      false
    ),
    (
      '03cce456-8367-4164-b026-07b777feb7b2'::uuid,
      hiawatha_id,
      'FINISHED',
      '안토닌 드보르자크 아카이브는 드보르자크가 미국에 가기 전부터 친구 요세프 바츨라프 슬라데크의 체코어 번역으로 『하이아와사의 노래』를 알았고, 미국에서는 영어 원문도 접했다고 설명한다. 그는 이 서사시를 오페라로 만들기 위해 스케치와 메모를 남겼으며, 작품의 소재는 「신세계로부터」의 두 중간 악장에도 영향을 주었다.',
      'The Antonín Dvořák archive states that Dvořák knew *The Song of Hiawatha* through Josef Václav Sládek''s Czech translation before traveling to the United States and later acquainted himself with the English original. He left sketches and notes for a planned opera, and the archive also identifies the poem as an inspiration for the two middle movements of the *New World Symphony*.',
      'https://www.antonin-dvorak.cz/en/work/hiawatha-b430/',
      false
    ),
    (
      '44ee46f5-42aa-4729-a5b7-34d33b8f48b1'::uuid,
      faixa_amarela_id,
      'FINISHED',
      'FC 바르셀로나와 스포티파이는 2023년 호나우지뉴가 바르셀로나 시절 자신에게 영감과 동기를 준 곡을 고른 공식 플레이리스트를 공개했다. 「Faixa Amarela」는 연결된 스포티파이 목록에 포함돼 있다. 구단은 이 목록을 호나우지뉴 본인의 선곡으로 소개했다.',
      'FC Barcelona and Spotify released an official 2023 playlist of songs Ronaldinho selected as music that inspired and motivated him during his years at the club. “Faixa Amarela” appears in the linked Spotify playlist, which the club explicitly presents as Ronaldinho''s own choices.',
      'https://www.fcbarcelona.com/en/news/3380202/this-is-ronaldinhos-spotify-playlist',
      false
    ),
    (
      '44ee46f5-42aa-4729-a5b7-34d33b8f48b1'::uuid,
      um_lindo_sonho_id,
      'FINISHED',
      'FC 바르셀로나와 스포티파이는 2023년 호나우지뉴가 바르셀로나 시절 자신에게 영감과 동기를 준 곡을 고른 공식 플레이리스트를 공개했다. 「Um Lindo Sonho」는 연결된 스포티파이 목록에 포함돼 있다. 구단은 이 목록을 호나우지뉴 본인의 선곡으로 소개했다.',
      'FC Barcelona and Spotify released an official 2023 playlist of songs Ronaldinho selected as music that inspired and motivated him during his years at the club. “Um Lindo Sonho” appears in the linked Spotify playlist, which the club explicitly presents as Ronaldinho''s own choices.',
      'https://www.fcbarcelona.com/en/news/3380202/this-is-ronaldinhos-spotify-playlist',
      false
    ),
    (
      '44ee46f5-42aa-4729-a5b7-34d33b8f48b1'::uuid,
      could_you_be_loved_id,
      'FINISHED',
      'FC 바르셀로나와 스포티파이는 2023년 호나우지뉴가 바르셀로나 시절 자신에게 영감과 동기를 준 곡을 고른 공식 플레이리스트를 공개했다. 「Could You Be Loved」는 연결된 스포티파이 목록에 포함돼 있다. 구단은 이 목록을 호나우지뉴 본인의 선곡으로 소개했다.',
      'FC Barcelona and Spotify released an official 2023 playlist of songs Ronaldinho selected as music that inspired and motivated him during his years at the club. “Could You Be Loved” appears in the linked Spotify playlist, which the club explicitly presents as Ronaldinho''s own choices.',
      'https://www.fcbarcelona.com/en/news/3380202/this-is-ronaldinhos-spotify-playlist',
      false
    ),
    (
      '44ee46f5-42aa-4729-a5b7-34d33b8f48b1'::uuid,
      excuse_me_miss_id,
      'FINISHED',
      'FC 바르셀로나와 스포티파이는 2023년 호나우지뉴가 바르셀로나 시절 자신에게 영감과 동기를 준 곡을 고른 공식 플레이리스트를 공개했다. 「Excuse Me Miss」는 연결된 스포티파이 목록에 포함돼 있다. 구단은 이 목록을 호나우지뉴 본인의 선곡으로 소개했다.',
      'FC Barcelona and Spotify released an official 2023 playlist of songs Ronaldinho selected as music that inspired and motivated him during his years at the club. “Excuse Me Miss” appears in the linked Spotify playlist, which the club explicitly presents as Ronaldinho''s own choices.',
      'https://www.fcbarcelona.com/en/news/3380202/this-is-ronaldinhos-spotify-playlist',
      false
    ),
    (
      '44ee46f5-42aa-4729-a5b7-34d33b8f48b1'::uuid,
      naughty_girl_id,
      'FINISHED',
      'FC 바르셀로나와 스포티파이는 2023년 호나우지뉴가 바르셀로나 시절 자신에게 영감과 동기를 준 곡을 고른 공식 플레이리스트를 공개했다. 「Naughty Girl」은 연결된 스포티파이 목록에 포함돼 있다. 구단은 이 목록을 호나우지뉴 본인의 선곡으로 소개했다.',
      'FC Barcelona and Spotify released an official 2023 playlist of songs Ronaldinho selected as music that inspired and motivated him during his years at the club. “Naughty Girl” appears in the linked Spotify playlist, which the club explicitly presents as Ronaldinho''s own choices.',
      'https://www.fcbarcelona.com/en/news/3380202/this-is-ronaldinhos-spotify-playlist',
      false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 12 THEN
    RAISE EXCEPTION
      '3차 user_contents 등록 수가 12건이 아닙니다. 실제=%',
      affected;
  END IF;

  UPDATE public.profiles
  SET celeb_tier = 'full'
  WHERE id IN (
    '66c69179-b3b9-4688-ba22-22fb547acdcf'::uuid,
    'c03eae39-9a8d-4d79-9503-006415536379'::uuid,
    '37d269ae-7c6e-438a-b0e3-fff93488b790'::uuid,
    '5eb8782e-b0fa-47b4-bb8d-ba6da4e7bdac'::uuid,
    '3aff4f9a-286a-49e6-bfe3-5eca1930f059'::uuid,
    'e09c74d2-3289-44a3-b3f0-6334944f265f'::uuid,
    '03cce456-8367-4164-b026-07b777feb7b2'::uuid,
    '44ee46f5-42aa-4729-a5b7-34d33b8f48b1'::uuid
  )
    AND profile_type = 'CELEB'
    AND status = 'active'
    AND celeb_tier = 'light';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 8 THEN
    RAISE EXCEPTION
      '3차 full 승격 수가 8명이 아닙니다. 실제=%',
      affected;
  END IF;

  SELECT count(*)
  INTO wrong_count
  FROM (
    VALUES
      ('katsushika-hokusai', 1),
      ('kylian-mbappe', 1),
      ('su-qin', 1),
      ('saigo-takamori', 1),
      ('yao-ming', 1),
      ('tiziano-vecellio', 1),
      ('antonin-dvorak', 1),
      ('ronaldinho', 5)
  ) AS expected(slug, content_count)
  LEFT JOIN public.profiles p
    ON p.slug = expected.slug
  LEFT JOIN LATERAL (
    SELECT count(*)::integer AS content_count
    FROM public.user_contents uc
    WHERE uc.user_id = p.id
  ) actual ON true
  WHERE p.id IS NULL
     OR p.celeb_tier IS DISTINCT FROM 'full'
     OR p.content_research_status IS DISTINCT FROM 'open'
     OR actual.content_count IS DISTINCT FROM expected.content_count;

  IF wrong_count <> 0 THEN
    RAISE EXCEPTION
      '3차 반영 후 tier/count/research 검증 실패. 차이=%',
      wrong_count;
  END IF;

  -- 이번 작업이 건드린 작품은 실제 user_contents 행 수로 누적값을 다시 맞춘다.
  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer
    FROM public.user_contents uc
    WHERE uc.content_id = c.id
  )
  WHERE c.id = ANY (
    ARRAY[
      controlla_id,
      genshi_shiroku_id,
      zhou_shu_yinfu_id,
      hiawatha_id,
      faixa_amarela_id,
      um_lindo_sonho_id,
      could_you_be_loved_id,
      excuse_me_miss_id,
      naughty_girl_id,
      '104be5b3-84dd-4471-b03e-abcc3a3dc135',
      '13410b89-7c1f-4461-a1e2-b3f2975148e6',
      'dd2cf84b-e8e4-4669-b22b-d2cb56b8a676'
    ]::text[]
  )
    AND c.user_count IS DISTINCT FROM (
      SELECT count(*)::integer
      FROM public.user_contents uc
      WHERE uc.content_id = c.id
    );

  IF EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id = ANY (
      ARRAY[
        controlla_id,
        genshi_shiroku_id,
        zhou_shu_yinfu_id,
        hiawatha_id,
        faixa_amarela_id,
        um_lindo_sonho_id,
        could_you_be_loved_id,
        excuse_me_miss_id,
        naughty_girl_id,
        '104be5b3-84dd-4471-b03e-abcc3a3dc135',
        '13410b89-7c1f-4461-a1e2-b3f2975148e6',
        'dd2cf84b-e8e4-4669-b22b-d2cb56b8a676'
      ]::text[]
    )
      AND c.user_count IS DISTINCT FROM (
        SELECT count(*)::integer
        FROM public.user_contents uc
        WHERE uc.content_id = c.id
      )
  ) THEN
    RAISE EXCEPTION '3차 작품의 contents.user_count 정합성 검증 실패';
  END IF;

  IF (
    SELECT count(*)
    FROM public.content_locales
    WHERE content_id IN (
      controlla_id,
      genshi_shiroku_id,
      zhou_shu_yinfu_id,
      hiawatha_id,
      faixa_amarela_id,
      um_lindo_sonho_id,
      could_you_be_loved_id,
      excuse_me_miss_id,
      naughty_girl_id
    )
  ) <> 18 THEN
    RAISE EXCEPTION '3차 신규 콘텐츠 9종의 ko/en locale 18행 검증 실패';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_contents uc
    WHERE uc.user_id IN (
      '66c69179-b3b9-4688-ba22-22fb547acdcf'::uuid,
      'c03eae39-9a8d-4d79-9503-006415536379'::uuid,
      '37d269ae-7c6e-438a-b0e3-fff93488b790'::uuid,
      '5eb8782e-b0fa-47b4-bb8d-ba6da4e7bdac'::uuid,
      '3aff4f9a-286a-49e6-bfe3-5eca1930f059'::uuid,
      'e09c74d2-3289-44a3-b3f0-6334944f265f'::uuid,
      '03cce456-8367-4164-b026-07b777feb7b2'::uuid,
      '44ee46f5-42aa-4729-a5b7-34d33b8f48b1'::uuid
    )
      AND (
        NULLIF(btrim(uc.review), '') IS NULL
        OR NULLIF(btrim(uc.review_en), '') IS NULL
        OR NULLIF(btrim(uc.source_url), '') IS NULL
      )
  ) THEN
    RAISE EXCEPTION '3차 user_contents에 review/review_en/source_url 누락이 있습니다.';
  END IF;
END;
$$;

COMMIT;

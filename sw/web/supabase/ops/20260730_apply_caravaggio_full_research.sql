-- 카라바조의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과를 반영한다.
-- 채택: 그림 속에서 악보가 식별된 르네상스 성악곡 7곡.
-- 성서·고전 도상은 독서로, 공놀이·테니스 일화는 디지털 GAME으로 추정하지 않는다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '003d0658-ff31-4b68-b624-4bd41c9f5853'::uuid;
  target_run_id constant uuid := 'b1ec6e01-8180-44c3-80cf-fb0659b61209'::uuid;

  quam_content_id constant text := '923a7f3d-3c2b-451c-9535-5431b95fc7c3';
  lasciar_content_id constant text := 'f0b8ee38-5ed9-4053-bc7e-30e0b9b2d3cb';
  perche_content_id constant text := '81dc7840-aee2-4093-85be-8a4d6a7327ad';
  chi_content_id constant text := '4457e108-aa7b-447e-9646-092266a5eea7';
  dura_content_id constant text := '5c29b685-4372-4b0c-ba25-a5ad28f3edf0';
  voi_content_id constant text := '812fc09b-13f1-45b7-bb89-6daf95a828e9';
  vostra_content_id constant text := '8fd39d48-8834-44e7-882b-67c4fde0a9da';

  quam_uc_id constant uuid := 'a0dbe543-74c7-483b-92e2-8643bd41dde3'::uuid;
  lasciar_uc_id constant uuid := '5fc89d57-2dd0-4a30-97f0-572108d68057'::uuid;
  perche_uc_id constant uuid := '256a8a99-e101-488e-ac96-089fb837f5eb'::uuid;
  chi_uc_id constant uuid := '71ce3a89-d4dc-4858-ba79-689f4be20634'::uuid;
  dura_uc_id constant uuid := 'd1f63f95-d4c8-4fe8-8173-6b498d976a64'::uuid;
  voi_uc_id constant uuid := '44bd239c-d448-4c47-89a6-0ac904a0b92b'::uuid;
  vostra_uc_id constant uuid := 'f9c70673-1e5b-48e1-9bff-a353e0e787d3'::uuid;

  quam_finding_id constant uuid := '1b67bb8f-a8c4-429f-93e9-9612d425765f'::uuid;
  lasciar_finding_id constant uuid := '14f98303-b960-402b-827e-87fb13d09601'::uuid;
  perche_finding_id constant uuid := '82c7581b-bdae-4fcb-abf1-9d91a3ca5b43'::uuid;
  chi_finding_id constant uuid := '01150751-a944-49f0-8be3-522c48cc0955'::uuid;
  dura_finding_id constant uuid := 'a5acd996-cae8-4d13-801e-6a09727c31a0'::uuid;
  voi_finding_id constant uuid := 'd310805d-13e7-4faa-af4c-8add8f01f5e6'::uuid;
  vostra_finding_id constant uuid := 'a6ff1e2f-93a5-401e-8d22-f9ed59e1d61c'::uuid;
  book_finding_id constant uuid := '4791bbee-82cb-4284-a221-6e6b8498897b'::uuid;
  video_finding_id constant uuid := '4669bc1f-7f4a-4632-a0f1-4c4a8d08b685'::uuid;
  game_finding_id constant uuid := '36b07b06-6648-447b-9533-e0107bcb2643'::uuid;

  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'caravaggio'
      AND p.nickname = '카라바조'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '카라바조 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_contents uc
    WHERE uc.id IN (
      quam_uc_id, lasciar_uc_id, perche_uc_id, chi_uc_id, dura_uc_id, voi_uc_id, vostra_uc_id
    )
  ) OR EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id IN (
      quam_content_id, lasciar_content_id, perche_content_id, chi_content_id,
      dura_content_id, voi_content_id, vostra_content_id
    )
       OR c.external_id IN (
         'spotify-0pPoWSVkfuuT3jX7o3ijIQ',
         'spotify-1mtthIbY9s904Q6179jY3W',
         'spotify-3HRYo2S4E2xwaS14B86BQB',
         'spotify-07yZmASqFjiKobmOoSTHzT',
         'spotify-4vJnGb9hxsjEquTQIPiZhy',
         'spotify-0Sw65001ksXHFJ2iG2Wu1K',
         'spotify-1ZF8a5klzr41ut9Jv5t3H5'
       )
  ) THEN
    RAISE EXCEPTION '카라바조 조사 실행·콘텐츠·연결 ID가 이미 존재합니다.';
  END IF;

  INSERT INTO public.contents (
    id, type, metadata, release_date, external_source, external_id, user_count
  ) VALUES
    (
      quam_content_id, 'MUSIC',
      jsonb_build_object(
        'entityType', 'track', 'releaseDate', '2012',
        'spotifyUrl', 'https://open.spotify.com/track/0pPoWSVkfuuT3jX7o3ijIQ',
        'albumName', 'Nicolas Gombert: Missa Quam Pulchras Es',
        'artists', jsonb_build_array('Noel Bauldeweyn', 'Vox Lucens'),
        'composer', 'Noel Bauldeweyn'
      ),
      '2012-01-01', 'spotify', 'spotify-0pPoWSVkfuuT3jX7o3ijIQ', 0
    ),
    (
      lasciar_content_id, 'MUSIC',
      jsonb_build_object(
        'entityType', 'track', 'releaseDate', '2015',
        'spotifyUrl', 'https://open.spotify.com/track/1mtthIbY9s904Q6179jY3W',
        'albumName', 'Tu es musique',
        'artists', jsonb_build_array('Ensemble Kô', 'Ziya Tabassian'),
        'composer', 'Francesco de Layolle'
      ),
      '2015-01-01', 'spotify', 'spotify-1mtthIbY9s904Q6179jY3W', 0
    ),
    (
      perche_content_id, 'MUSIC',
      jsonb_build_object(
        'entityType', 'track', 'releaseDate', '2015',
        'spotifyUrl', 'https://open.spotify.com/track/3HRYo2S4E2xwaS14B86BQB',
        'albumName', 'Tu es musique',
        'artists', jsonb_build_array('Ensemble Kô', 'Ziya Tabassian'),
        'composer', 'Jacquet de Berchem'
      ),
      '2015-01-01', 'spotify', 'spotify-3HRYo2S4E2xwaS14B86BQB', 0
    ),
    (
      chi_content_id, 'MUSIC',
      jsonb_build_object(
        'entityType', 'track', 'releaseDate', '2015',
        'spotifyUrl', 'https://open.spotify.com/track/07yZmASqFjiKobmOoSTHzT',
        'albumName', 'Tu es musique',
        'artists', jsonb_build_array('Jacques Arcadelt', 'Ensemble Kô', 'Ziya Tabassian'),
        'composer', 'Jacques Arcadelt'
      ),
      '2015-01-01', 'spotify', 'spotify-07yZmASqFjiKobmOoSTHzT', 0
    ),
    (
      dura_content_id, 'MUSIC',
      jsonb_build_object(
        'entityType', 'track', 'releaseDate', '2015',
        'spotifyUrl', 'https://open.spotify.com/track/4vJnGb9hxsjEquTQIPiZhy',
        'albumName', 'Tu es musique',
        'artists', jsonb_build_array('Jacques Arcadelt', 'Ensemble Kô', 'Ziya Tabassian'),
        'composer', 'Jacques Arcadelt'
      ),
      '2015-01-01', 'spotify', 'spotify-4vJnGb9hxsjEquTQIPiZhy', 0
    ),
    (
      voi_content_id, 'MUSIC',
      jsonb_build_object(
        'entityType', 'track', 'releaseDate', '2015',
        'spotifyUrl', 'https://open.spotify.com/track/0Sw65001ksXHFJ2iG2Wu1K',
        'albumName', 'Tu es musique',
        'artists', jsonb_build_array('Jacques Arcadelt', 'Ensemble Kô', 'Ziya Tabassian'),
        'composer', 'Jacques Arcadelt'
      ),
      '2015-01-01', 'spotify', 'spotify-0Sw65001ksXHFJ2iG2Wu1K', 0
    ),
    (
      vostra_content_id, 'MUSIC',
      jsonb_build_object(
        'entityType', 'track', 'releaseDate', '2018',
        'spotifyUrl', 'https://open.spotify.com/track/1ZF8a5klzr41ut9Jv5t3H5',
        'albumName', 'Arcadelt: Motetti - Madrigali - Chansons',
        'artists', jsonb_build_array('Jacques Arcadelt', 'Cappella Mediterranea', 'Leonardo García-Alarcón'),
        'composer', 'Jacques Arcadelt'
      ),
      '2018-01-01', 'spotify', 'spotify-1ZF8a5klzr41ut9Jv5t3H5', 0
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '카라바조 MUSIC contents 생성 수가 7건이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.content_locales (
    content_id, locale, title, creator, thumbnail_url, description,
    isbn, publisher, sources, verified
  ) VALUES
    (
      quam_content_id, 'ko', 'Quam Pulchra Es', '노엘 볼드베인 · 복스 루센스',
      'https://i.scdn.co/image/ab67616d0000b273e111f33e667676e0440b56bb',
      '노엘 볼드베인의 모테트. 카라바조의 《이집트로 피신하는 길의 휴식》에 악보가 정밀하게 그려져 있다.',
      NULL, NULL,
      jsonb_build_object('primary', 'spotify', 'url', 'https://open.spotify.com/track/0pPoWSVkfuuT3jX7o3ijIQ'), true
    ),
    (
      quam_content_id, 'en', 'Quam Pulchra Es', 'Noel Bauldeweyn · Vox Lucens',
      'https://i.scdn.co/image/ab67616d0000b273e111f33e667676e0440b56bb',
      'A motet by Noel Bauldeweyn whose score is carefully rendered in Caravaggio''s Rest on the Flight into Egypt.',
      NULL, NULL,
      jsonb_build_object('primary', 'spotify', 'url', 'https://open.spotify.com/track/0pPoWSVkfuuT3jX7o3ijIQ'), true
    ),
    (
      lasciar_content_id, 'ko', 'Lasciar il velo', '프란체스코 데 라이올레 · 앙상블 코 · 지야 타바시안',
      'https://i.scdn.co/image/ab67616d0000b2730eeff3f73e7f6a4e3a53f954',
      '프란체스코 데 라이올레의 마드리갈. 델 몬테 추기경 주문본 《류트 연주자》에 악보가 등장한다.',
      NULL, NULL,
      jsonb_build_object(
        'primary', 'spotify', 'url', 'https://open.spotify.com/track/1mtthIbY9s904Q6179jY3W',
        'titlePolicy', 'historical_score_title'
      ), true
    ),
    (
      lasciar_content_id, 'en', 'Lasciar il velo', 'Francesco de Layolle · Ensemble Kô · Ziya Tabassian',
      'https://i.scdn.co/image/ab67616d0000b2730eeff3f73e7f6a4e3a53f954',
      'A madrigal by Francesco de Layolle whose score appears in the Del Monte version of The Lute Player.',
      NULL, NULL,
      jsonb_build_object(
        'primary', 'spotify', 'url', 'https://open.spotify.com/track/1mtthIbY9s904Q6179jY3W',
        'titlePolicy', 'historical_score_title'
      ), true
    ),
    (
      perche_content_id, 'ko', 'Perché non date voi', '자케 드 베르켐 · 앙상블 코 · 지야 타바시안',
      'https://i.scdn.co/image/ab67616d0000b2730eeff3f73e7f6a4e3a53f954',
      '자케 드 베르켐의 마드리갈. 델 몬테 추기경 주문본 《류트 연주자》에서 식별된다.',
      NULL, NULL,
      jsonb_build_object('primary', 'spotify', 'url', 'https://open.spotify.com/track/3HRYo2S4E2xwaS14B86BQB'), true
    ),
    (
      perche_content_id, 'en', 'Perché non date voi', 'Jacquet de Berchem · Ensemble Kô · Ziya Tabassian',
      'https://i.scdn.co/image/ab67616d0000b2730eeff3f73e7f6a4e3a53f954',
      'A madrigal by Jacquet de Berchem identified in the Del Monte version of The Lute Player.',
      NULL, NULL,
      jsonb_build_object('primary', 'spotify', 'url', 'https://open.spotify.com/track/3HRYo2S4E2xwaS14B86BQB'), true
    ),
    (
      chi_content_id, 'ko', 'Chi potrà dir quanta dolcezza prova', '자크 아르카델트 · 앙상블 코 · 지야 타바시안',
      'https://i.scdn.co/image/ab67616d0000b2730eeff3f73e7f6a4e3a53f954',
      '자크 아르카델트의 마드리갈. 빈첸초 주스티니아니 주문본 《류트 연주자》의 악보에서 식별된다.',
      NULL, NULL,
      jsonb_build_object(
        'primary', 'spotify', 'url', 'https://open.spotify.com/track/07yZmASqFjiKobmOoSTHzT',
        'spotifyTitle', 'Chi potrà dir'
      ), true
    ),
    (
      chi_content_id, 'en', 'Chi potrà dir quanta dolcezza prova', 'Jacques Arcadelt · Ensemble Kô · Ziya Tabassian',
      'https://i.scdn.co/image/ab67616d0000b2730eeff3f73e7f6a4e3a53f954',
      'An Arcadelt madrigal identified in the Vincenzo Giustiniani version of The Lute Player.',
      NULL, NULL,
      jsonb_build_object(
        'primary', 'spotify', 'url', 'https://open.spotify.com/track/07yZmASqFjiKobmOoSTHzT',
        'spotifyTitle', 'Chi potrà dir'
      ), true
    ),
    (
      dura_content_id, 'ko', 'Se la dura durezza in la mia donna dura', '자크 아르카델트 · 앙상블 코 · 지야 타바시안',
      'https://i.scdn.co/image/ab67616d0000b2730eeff3f73e7f6a4e3a53f954',
      '자크 아르카델트의 마드리갈. 빈첸초 주스티니아니 주문본 《류트 연주자》에 악보가 그려져 있다.',
      NULL, NULL,
      jsonb_build_object(
        'primary', 'spotify', 'url', 'https://open.spotify.com/track/4vJnGb9hxsjEquTQIPiZhy',
        'spotifyTitle', 'Se la dura durezza'
      ), true
    ),
    (
      dura_content_id, 'en', 'Se la dura durezza in la mia donna dura', 'Jacques Arcadelt · Ensemble Kô · Ziya Tabassian',
      'https://i.scdn.co/image/ab67616d0000b2730eeff3f73e7f6a4e3a53f954',
      'An Arcadelt madrigal whose score is painted in the Vincenzo Giustiniani version of The Lute Player.',
      NULL, NULL,
      jsonb_build_object(
        'primary', 'spotify', 'url', 'https://open.spotify.com/track/4vJnGb9hxsjEquTQIPiZhy',
        'spotifyTitle', 'Se la dura durezza'
      ), true
    ),
    (
      voi_content_id, 'ko', 'Voi sapete ch’io v’amo', '자크 아르카델트 · 앙상블 코 · 지야 타바시안',
      'https://i.scdn.co/image/ab67616d0000b2730eeff3f73e7f6a4e3a53f954',
      '자크 아르카델트의 마드리갈. 빈첸초 주스티니아니 주문본 《류트 연주자》의 악보에서 식별된다.',
      NULL, NULL,
      jsonb_build_object(
        'primary', 'spotify', 'url', 'https://open.spotify.com/track/0Sw65001ksXHFJ2iG2Wu1K',
        'spotifyTitle', 'Voi sapete ch''io v''amo anzi'
      ), true
    ),
    (
      voi_content_id, 'en', 'Voi sapete ch’io v’amo', 'Jacques Arcadelt · Ensemble Kô · Ziya Tabassian',
      'https://i.scdn.co/image/ab67616d0000b2730eeff3f73e7f6a4e3a53f954',
      'An Arcadelt madrigal identified in the Vincenzo Giustiniani version of The Lute Player.',
      NULL, NULL,
      jsonb_build_object(
        'primary', 'spotify', 'url', 'https://open.spotify.com/track/0Sw65001ksXHFJ2iG2Wu1K',
        'spotifyTitle', 'Voi sapete ch''io v''amo anzi'
      ), true
    ),
    (
      vostra_content_id, 'ko', 'Vostra fui e sarò mentre ch’io viva', '자크 아르카델트 · 카펠라 메디테라네아 · 레오나르도 가르시아 알라르콘',
      'https://i.scdn.co/image/ab67616d0000b273896c5f794136e7eded35f839',
      '자크 아르카델트의 마드리갈. 빈첸초 주스티니아니 주문본 《류트 연주자》에 악보가 등장한다.',
      NULL, NULL,
      jsonb_build_object('primary', 'spotify', 'url', 'https://open.spotify.com/track/1ZF8a5klzr41ut9Jv5t3H5'), true
    ),
    (
      vostra_content_id, 'en', 'Vostra fui e sarò mentre ch’io viva', 'Jacques Arcadelt · Cappella Mediterranea · Leonardo García-Alarcón',
      'https://i.scdn.co/image/ab67616d0000b273896c5f794136e7eded35f839',
      'An Arcadelt madrigal whose score appears in the Vincenzo Giustiniani version of The Lute Player.',
      NULL, NULL,
      jsonb_build_object('primary', 'spotify', 'url', 'https://open.spotify.com/track/1ZF8a5klzr41ut9Jv5t3H5'), true
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 14 THEN
    RAISE EXCEPTION '카라바조 MUSIC content_locales 생성 수가 14건이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.user_contents (
    id, user_id, content_id, status, review, review_en, source_url, is_recommended
  ) VALUES
    (
      quam_uc_id, target_celeb_id, quam_content_id, 'FINISHED',
      '카라바조는 《이집트로 피신하는 길의 휴식》에서 천사가 펼쳐 든 악보를 읽을 수 있을 만큼 정밀하게 옮겼다. 이탈리아 문화부 자료는 그 곡을 노엘 볼드베인의 모테트 〈Quam Pulchra Es〉로 특정한다. 단순한 음악적 분위기 추정이 아니라 실제 악보의 작품 식별이 가능하므로 직접적인 시각·작업 관여 근거로 채택한다.',
      'In Rest on the Flight into Egypt, Caravaggio rendered the open score held by the angel precisely enough for the work to be identified. Italy''s Ministry of Culture names it as Noel Bauldeweyn''s motet Quam Pulchra Es. Because this is an identifiable score used in the painting rather than a general claim of influence, it is accepted as direct working engagement with the music.',
      'https://cultura.gov.it/comunicato/mostra-e-concertocaravaggio-una-vita-dal-vero', false
    ),
    (
      lasciar_uc_id, target_celeb_id, lasciar_content_id, 'FINISHED',
      '델 몬테 추기경이 주문한 《류트 연주자》의 펼친 악보에는 프란체스코 데 라이올레의 〈Lasciar il velo〉가 식별된다. 카라바조가 제목 없는 음악 소품을 그린 것이 아니라 당대에 실제로 존재하고 연주할 수 있었던 특정 마드리갈의 악보를 화면에 옮긴 사례다.',
      'The open music in the Del Monte version of The Lute Player identifies Francesco de Layolle''s Lasciar il velo. Caravaggio did not paint a generic musical prop but transcribed the score of a specific, extant madrigal into the composition.',
      'https://cultura.gov.it/comunicato/mostra-e-concertocaravaggio-una-vita-dal-vero', false
    ),
    (
      perche_uc_id, target_celeb_id, perche_content_id, 'FINISHED',
      '같은 델 몬테 주문본 《류트 연주자》에서 자케 드 베르켐의 〈Perché non date voi〉 악보가 식별된다. 실제 작품의 악보를 골라 화면에 재현한 작업 기록이므로 곡 단위 향유 자료로 연결한다.',
      'The same Del Monte version of The Lute Player contains the identifiable score of Jacquet de Berchem''s Perché non date voi. Selecting and reproducing that specific music makes the evidence work-level rather than merely thematic.',
      'https://cultura.gov.it/comunicato/mostra-e-concertocaravaggio-una-vita-dal-vero', false
    ),
    (
      chi_uc_id, target_celeb_id, chi_content_id, 'FINISHED',
      '빈첸초 주스티니아니가 주문한 《류트 연주자》에는 자크 아르카델트의 〈Chi potrà dir quanta dolcezza prova〉 악보가 그려져 있다. 문화부 자료가 그림과 곡을 직접 짝지으므로 제목이 특정된 작품 관여 기록으로 채택한다.',
      'The Vincenzo Giustiniani version of The Lute Player depicts the score of Jacques Arcadelt''s Chi potrà dir quanta dolcezza prova. The Ministry of Culture directly pairs painting and work, providing title-level evidence of Caravaggio''s engagement.',
      'https://cultura.gov.it/comunicato/mostra-e-concertocaravaggio-una-vita-dal-vero', false
    ),
    (
      dura_uc_id, target_celeb_id, dura_content_id, 'FINISHED',
      '주스티니아니 주문본의 악보에서는 아르카델트의 〈Se la dura durezza in la mia donna dura〉도 식별된다. 읽을 수 있는 악보를 회화의 핵심 소품으로 옮겼다는 점에서 막연한 음악 취향 추정과 구별된다.',
      'The score in the Giustiniani version also identifies Arcadelt''s Se la dura durezza in la mia donna dura. Its legible use as a central object in the painting distinguishes this evidence from a speculative claim about musical taste.',
      'https://cultura.gov.it/comunicato/mostra-e-concertocaravaggio-una-vita-dal-vero', false
    ),
    (
      voi_uc_id, target_celeb_id, voi_content_id, 'FINISHED',
      '이탈리아 문화부는 주스티니아니 주문본 《류트 연주자》에 그려진 곡 가운데 하나로 아르카델트의 〈Voi sapete ch’io v’amo〉를 명시한다. 그림에 옮길 악보를 작품 단위로 다룬 흔적이 남아 있어 채택한다.',
      'Italy''s Ministry of Culture lists Arcadelt''s Voi sapete ch’io v’amo among the pieces painted in the Giustiniani Lute Player. The identifiable score records work-level handling of the music and supports acceptance.',
      'https://cultura.gov.it/comunicato/mostra-e-concertocaravaggio-una-vita-dal-vero', false
    ),
    (
      vostra_uc_id, target_celeb_id, vostra_content_id, 'FINISHED',
      '아르카델트의 〈Vostra fui e sarò mentre ch’io viva〉 역시 주스티니아니 주문본 《류트 연주자》의 악보에서 식별된다. 동일한 그림에 여러 곡이 보이더라도 각각 제목과 작곡가가 확인되므로 별개의 곡으로 등록한다.',
      'Arcadelt''s Vostra fui e sarò mentre ch’io viva is likewise identified in the score painted in the Giustiniani Lute Player. Since both title and composer are recoverable, it is recorded as a distinct work rather than folded into a generic music entry.',
      'https://cultura.gov.it/comunicato/mostra-e-concertocaravaggio-una-vita-dal-vero', false
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '카라바조 user_contents 생성 수가 7건이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.contents c
  SET user_count = (
    SELECT count(*)::integer FROM public.user_contents uc WHERE uc.content_id = c.id
  )
  WHERE c.id IN (
    quam_content_id, lasciar_content_id, perche_content_id, chi_content_id,
    dura_content_id, voi_content_id, vostra_content_id
  );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 OR EXISTS (
    SELECT 1 FROM public.contents c
    WHERE c.id IN (
      quam_content_id, lasciar_content_id, perche_content_id, chi_content_id,
      dura_content_id, voi_content_id, vostra_content_id
    )
      AND c.user_count <> 1
  ) THEN
    RAISE EXCEPTION '카라바조 연결 콘텐츠의 user_count 동기화에 실패했습니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-caravaggio-full-v1',
    'Codex',
    ARRAY['카라바조', 'Caravaggio', 'Michelangelo Merisi da Caravaggio', 'Michelangelo Merisi', '미켈란젤로 메리시'],
    '1571~1610년 이탈리아 화가 미켈란젤로 메리시 다 카라바조를 도시 카라바조, 영화·밴드·동명 작품과 분리했다.',
    '이탈리아어·영어·한국어 이름과 read·Bible·classics·theatre·film·game·tennis·music·score·madrigal·Lute Player 조합으로 네 유형을 조사했다. 성서와 고전 도상은 특정 판본의 독서를 증명하지 않아 BOOK으로 채택하지 않았다. 1610년 사망 인물이므로 현대 VIDEO·디지털 GAME 기록은 없고, 공놀이·테니스 일화도 실제 운동이다. 반면 이탈리아 문화부는 세 그림에 실린 실제 악보 7곡의 제목과 작곡가를 열거한다. 악보가 추적·연주 가능할 만큼 식별되므로 MUSIC 7건을 채택했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      quam_finding_id, target_run_id, 'MUSIC', 'accepted',
      'Quam Pulchra Es', 'Noel Bauldeweyn', quam_content_id,
      '이탈리아 문화부가 《이집트로 피신하는 길의 휴식》에 그려진 모테트를 이 곡으로 식별한다.',
      NULL
    ),
    (
      lasciar_finding_id, target_run_id, 'MUSIC', 'accepted',
      'Lasciar il velo', 'Francesco de Layolle', lasciar_content_id,
      '이탈리아 문화부가 델 몬테 주문본 《류트 연주자》에 그려진 마드리갈로 식별한다.',
      NULL
    ),
    (
      perche_finding_id, target_run_id, 'MUSIC', 'accepted',
      'Perché non date voi', 'Jacquet de Berchem', perche_content_id,
      '이탈리아 문화부가 델 몬테 주문본 《류트 연주자》의 악보에서 곡명과 작곡가를 식별한다.',
      NULL
    ),
    (
      chi_finding_id, target_run_id, 'MUSIC', 'accepted',
      'Chi potrà dir quanta dolcezza prova', 'Jacques Arcadelt', chi_content_id,
      '이탈리아 문화부가 주스티니아니 주문본 《류트 연주자》에 그려진 아르카델트 마드리갈로 식별한다.',
      NULL
    ),
    (
      dura_finding_id, target_run_id, 'MUSIC', 'accepted',
      'Se la dura durezza in la mia donna dura', 'Jacques Arcadelt', dura_content_id,
      '이탈리아 문화부가 주스티니아니 주문본 《류트 연주자》에 그려진 아르카델트 마드리갈로 식별한다.',
      NULL
    ),
    (
      voi_finding_id, target_run_id, 'MUSIC', 'accepted',
      'Voi sapete ch’io v’amo', 'Jacques Arcadelt', voi_content_id,
      '이탈리아 문화부가 주스티니아니 주문본 《류트 연주자》에 그려진 아르카델트 마드리갈로 식별한다.',
      NULL
    ),
    (
      vostra_finding_id, target_run_id, 'MUSIC', 'accepted',
      'Vostra fui e sarò mentre ch’io viva', 'Jacques Arcadelt', vostra_content_id,
      '이탈리아 문화부가 주스티니아니 주문본 《류트 연주자》에 그려진 아르카델트 마드리갈로 식별한다.',
      NULL
    ),
    (
      book_finding_id, target_run_id, 'BOOK', 'rejected',
      '성서와 고전 문헌 일반', NULL, NULL,
      '카라바조의 종교화와 고전 도상은 성서 이야기와 고전 신화를 시각화한다.',
      '그림의 주제가 특정 판본을 직접 읽었다는 기록은 아니며 후원자·성직자·도상 전통을 통한 간접 전달도 가능하다. 제목·판본·독서 장면이 확인되지 않아 BOOK으로 등록하지 않았다.'
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '연극적 조명과 음악가 장면', NULL, NULL,
      '미술관 해설은 카라바조의 조명을 연극적이라고 표현하고 《음악가들》이 동시대 연주 문화와 관계한다고 설명한다.',
      '연극적이라는 미술사적 수사는 특정 희곡·공연·영상을 관람했다는 기록이 아니다. 1610년 사망 인물에게 현대 영상물을 소급 연결하지 않았다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '공놀이와 테니스 시합', NULL, NULL,
      '내셔널 갤러리 전기는 카라바조가 공놀이장을 드나들었고 1606년 다툼이 테니스 경기와 관련됐다는 전승을 소개한다.',
      '근세의 실제 운동·도박성 시합은 디지털 GAME 작품이 아니며, 특정 게임 타이틀의 플레이 기록도 아니다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 10 THEN
    RAISE EXCEPTION '카라바조 조사 finding 생성 수가 10건이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  )
  SELECT
    target_run_id,
    'MUSIC',
    finding_id,
    'https://cultura.gov.it/comunicato/mostra-e-concertocaravaggio-una-vita-dal-vero',
    'primary',
    'archive',
    'accessible',
    'Caravaggio. Una vita dal vero — Ministero della Cultura',
    '이탈리아 문화부가 카라바조 그림에 실린 실제 악보의 곡명·작곡가·그림을 직접 열거한다.'
  FROM (
    VALUES
      (quam_finding_id), (lasciar_finding_id), (perche_finding_id),
      (chi_finding_id), (dura_finding_id), (voi_finding_id), (vostra_finding_id)
  ) AS accepted_music(finding_id);

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 7 THEN
    RAISE EXCEPTION '카라바조 채택 근거 source 생성 수가 7건이 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'MUSIC', quam_finding_id,
      'https://open.spotify.com/track/0pPoWSVkfuuT3jX7o3ijIQ',
      'secondary', 'official_profile', 'accessible',
      'Quam Pulchra Es — Spotify',
      '공개 트랙 페이지와 oEmbed에서 곡명·연주자·2012년 발매·Spotify ID를 확인했다.'
    ),
    (
      target_run_id, 'MUSIC', lasciar_finding_id,
      'https://open.spotify.com/track/1mtthIbY9s904Q6179jY3W',
      'secondary', 'official_profile', 'accessible',
      'Lasciare il velo — Spotify',
      '공개 트랙 페이지와 oEmbed에서 트랙명·연주자·2015년 발매·Spotify ID를 확인했다. 역사적 작곡가 표기는 문화부 자료를 우선했다.'
    ),
    (
      target_run_id, 'MUSIC', perche_finding_id,
      'https://open.spotify.com/track/3HRYo2S4E2xwaS14B86BQB',
      'secondary', 'official_profile', 'accessible',
      'Perché non date voi — Spotify',
      '공개 트랙 페이지와 oEmbed에서 트랙명·연주자·2015년 발매·Spotify ID를 확인했다. 역사적 작곡가 표기는 문화부 자료를 우선했다.'
    ),
    (
      target_run_id, 'MUSIC', chi_finding_id,
      'https://open.spotify.com/track/07yZmASqFjiKobmOoSTHzT',
      'secondary', 'official_profile', 'accessible',
      'Chi potrà dir — Spotify',
      '공개 트랙 페이지와 oEmbed에서 곡명·연주자·2015년 발매·Spotify ID를 확인했다.'
    ),
    (
      target_run_id, 'MUSIC', dura_finding_id,
      'https://open.spotify.com/track/4vJnGb9hxsjEquTQIPiZhy',
      'secondary', 'official_profile', 'accessible',
      'Se la dura durezza — Spotify',
      '공개 트랙 페이지와 oEmbed에서 곡명·연주자·2015년 발매·Spotify ID를 확인했다.'
    ),
    (
      target_run_id, 'MUSIC', voi_finding_id,
      'https://open.spotify.com/track/0Sw65001ksXHFJ2iG2Wu1K',
      'secondary', 'official_profile', 'accessible',
      'Voi sapete ch''io v''amo anzi — Spotify',
      '공개 트랙 페이지와 oEmbed에서 곡명·연주자·2015년 발매·Spotify ID를 확인했다.'
    ),
    (
      target_run_id, 'MUSIC', vostra_finding_id,
      'https://open.spotify.com/track/1ZF8a5klzr41ut9Jv5t3H5',
      'secondary', 'official_profile', 'accessible',
      'Vostra fui e sarò, mentre ch’io viva — Spotify',
      '공개 트랙 페이지와 oEmbed에서 곡명·연주자·2018년 발매·Spotify ID를 확인했다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.nationalgallery.org.uk/artists/michelangelo-merisi-da-caravaggio',
      'secondary', 'official_profile', 'accessible',
      'Michelangelo Merisi da Caravaggio — National Gallery',
      '공식 미술관 전기와 작품 해설을 대조했지만 특정 판본을 읽은 기록은 제시되지 않는다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://www.metmuseum.org/art/collection/search/435844',
      'secondary', 'official_profile', 'accessible',
      'The Musicians — The Metropolitan Museum of Art',
      '그림이 동시대 음악 후원·연주 문화와 관계함을 설명하지만 특정 희곡·영상 관람 기록은 아니다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://www.nationalgallery.org.uk/artists/michelangelo-merisi-da-caravaggio',
      'secondary', 'official_profile', 'accessible',
      'Michelangelo Merisi da Caravaggio — National Gallery',
      '공놀이장과 테니스 시합 전승은 실제 운동 일화이므로 디지털 GAME과 분리했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 10 THEN
    RAISE EXCEPTION '카라바조 보완·기각 source 생성 수가 10건이 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Caravaggio·Michelangelo Merisi·read·book·Bible·Gospel·classics 조합을 조사했다. 종교·고전 도상은 특정 판본 독서 기록이 아니므로 채택하지 않았다.'
      WHEN 'VIDEO' THEN
        'theatre·play·performance·watched·film 조합을 조사했다. 연극적 조명이라는 평론과 음악가 장면은 있으나 제목 있는 희곡·영상 관람 기록은 없다.'
      WHEN 'GAME' THEN
        'game·played·ball court·tennis·cards 조합을 조사했다. 공놀이장과 테니스 일화는 실제 운동이며 디지털 GAME 작품이 아니다.'
      WHEN 'MUSIC' THEN
        'music·score·madrigal·Lute Player·Rest on the Flight into Egypt 조합을 조사했다. 이탈리아 문화부가 세 그림의 실제 악보 7곡을 제목·작곡가 단위로 식별해 모두 채택했다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '카라바조 조사 scope 완료 수가 4건이 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'open' OR completed_content_count <> 7 THEN
    RAISE EXCEPTION '카라바조 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  UPDATE public.profiles p
  SET celeb_tier = 'full'
  WHERE p.id = target_celeb_id
    AND p.profile_type = 'CELEB'
    AND p.status = 'active'
    AND p.celeb_tier = 'light'
    AND p.content_research_status = 'open';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION '카라바조 light→full 승격 수가 1건이 아닙니다. 실제=%', affected;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.celeb_content_research_findings f
    WHERE f.run_id = target_run_id
      AND f.decision = 'accepted'
      AND (
        f.content_id IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM public.user_contents uc
          WHERE uc.user_id = target_celeb_id AND uc.content_id = f.content_id
        )
        OR NOT EXISTS (
          SELECT 1 FROM public.celeb_content_research_sources src
          WHERE src.finding_id = f.id AND src.source_tier = 'primary'
        )
      )
  ) THEN
    RAISE EXCEPTION '카라바조 채택 finding의 콘텐츠 연결 또는 1차 출처 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'accepted') = 7
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 3
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 17
  ) THEN
    RAISE EXCEPTION '카라바조 조사 원장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;

-- 사도 요한 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 조사 원장에 반영한다.
-- 요한 문헌 저자 귀속과 최후의 만찬 찬송 전승은 확인되지만 특정 외부 작품 소비는 식별되지 않는다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := 'bdfad568-cd4a-401c-bb67-9b5ddae0a035'::uuid;
  target_run_id constant uuid := '95223312-6c34-454a-9097-f3d169ae40b2'::uuid;
  rejected_book_finding_id constant uuid := '15131061-4f3a-4441-812e-8622267b30d8'::uuid;
  rejected_video_finding_id constant uuid := '04a982dc-3127-4ef9-9d81-e25968375103'::uuid;
  rejected_game_finding_id constant uuid := '2368f838-8118-4d97-b431-3f7de8875b13'::uuid;
  rejected_music_finding_id constant uuid := 'd9844416-18df-47c9-8742-0afdda222653'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'john-the-apostle'
      AND p.nickname = '사도 요한'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '사도 요한 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '사도 요한 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id,
    '2026-07-30-john-the-apostle-empty-v1', 'Codex',
    ARRAY['사도 요한', 'John the Apostle', 'John son of Zebedee', 'John of Zebedee', '요한 보아너게'],
    '세베대의 아들 사도 요한을 세례자 요한, 복음사가 요한, 밧모의 요한, 장로 요한과 분리했다. 요한복음·요한서신·요한계시록의 전통적 저자 귀속도 역사적 사도 본인과 자동 동일시하지 않았다.',
    '공관복음·사도행전·바울서신의 사도 요한 기록과 현대 저자론을 대조해 BOOK·VIDEO·GAME·MUSIC을 조사했다. 요한 문헌은 전통적으로 사도에게 귀속되지만 본문 저자와 세베대의 아들 요한의 동일성은 오래된 논쟁이며, 설령 자기 저술로 보더라도 외부 콘텐츠 소비가 아니다. 최후의 만찬 뒤 제자들이 찬송했다는 기록도 곡명을 전하지 않고, 어업·신앙 사건·후대 성인전은 작품 감상이 아니어서 네 유형 0건을 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id, target_run_id, 'BOOK', 'rejected',
      '요한복음·요한서신·요한계시록의 성서 인용과 전통적 저자 귀속', '요한 문헌 저자들', NULL,
      '교회 전통은 요한 문헌 여러 편을 사도 요한에게 귀속하고, 본문에는 히브리 성서 인용·암시가 풍부하다.',
      '현대 연구는 복음사가·밧모의 요한·장로 요한과 세베대의 아들 요한의 동일성을 확정하지 않는다. 저자 귀속에서 역사적 사도의 특정 성서 독서를 역산할 수 없고 자기 저술도 외부 BOOK 소비가 아니다.'
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '변모·최후의 만찬·수난 목격과 후대 요한 극화', NULL, NULL,
      '복음서 전승에서 요한은 예수의 제자로 여러 종교적·역사적 사건에 참여하거나 목격한다.',
      '실제 사건·의례 참여는 제목 있는 연극·영상 작품 관람이 아니며 후대 성인극·영화는 본인 사후 제작물이다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '갈릴리 어업과 후대 성서 게임', NULL, NULL,
      '요한은 세베대의 아들로서 배에서 그물을 손질하던 어부로 전해진다.',
      '생업인 어업은 디지털 GAME 플레이가 아니며 후대 성서 게임은 사도 요한의 소비작이 아니다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '최후의 만찬 뒤 부른 이름 없는 찬송', NULL, NULL,
      '마가복음 14장 26절은 예수와 제자들이 찬송한 뒤 올리브산으로 갔다고 기록하므로 요한이 함께 불렀을 가능성이 높다.',
      '본문은 곡명이나 시편 번호를 적지 않는다. 유월절 할렐 시편 가운데 하나였다는 후대 추정만으로 개별 음악 작품을 특정하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '사도 요한 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://www.biblegateway.com/passage/?search=Acts%204%3A13&version=NRSVUE',
      'primary', 'archive', 'accessible',
      'Acts 4:13 — New Revised Standard Version Updated Edition',
      '베드로와 요한을 교육받지 못한 평범한 사람으로 묘사하는 본문을 확인했으나 특정 책의 독서 여부를 단정하는 근거로 과장하지 않았다.'
    ),
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://uscatholic.org/articles/202404/who-really-wrote-the-books-of-john/',
      'secondary', 'article', 'accessible',
      'Who really wrote the books of John? — U.S. Catholic',
      '요한 문헌의 전통적 귀속과 복음사가·밧모의 요한·사도 요한 동일성의 증거 부족을 대조했다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://www.biblegateway.com/passage/?search=Mark%209%3A2-8&version=NRSVUE',
      'primary', 'archive', 'accessible',
      'Mark 9:2–8 — New Revised Standard Version Updated Edition',
      '요한의 변모 사건 참여를 실제 종교 사건으로 확인해 제목 있는 관람 작품과 분리했다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://www.biblegateway.com/passage/?search=Mark%201%3A19-20&version=NRSVUE',
      'primary', 'archive', 'accessible',
      'Mark 1:19–20 — New Revised Standard Version Updated Edition',
      '배에서 그물을 손질하던 생업 기록을 확인해 디지털 GAME과 분리했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://www.biblegateway.com/passage/?search=Mark%2014%3A26&version=NRSVUE',
      'primary', 'archive', 'accessible',
      'Mark 14:26 — New Revised Standard Version Updated Edition',
      '제자 공동체의 찬송은 확인되지만 곡명·시편 번호·선율은 제시되지 않는다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '사도 요한 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN 'John the Apostle·사도 요한과 read·book·scripture·Gospel·Revelation 조합을 조사했다. 논쟁적 저자 귀속에서 역사적 사도의 특정 독서를 역산하지 않았다.'
        WHEN 'VIDEO' THEN 'watched·theatre·performance·transfiguration·Last Supper 조합을 조사했다. 실제 신앙 사건과 후대 극화 외에 제목 있는 관람작은 없다.'
        WHEN 'GAME' THEN 'game·played·fishing 조합을 조사했다. 어업은 생업이며 후대 성서 게임은 본인의 디지털 GAME 소비가 아니다.'
        WHEN 'MUSIC' THEN 'music·song·hymn·heard·Last Supper·Hallel 조합을 조사했다. 찬송 사실은 있으나 곡명·시편 번호가 없어 특정 작품을 기각했다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '사도 요한 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '사도 요한 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND p.content_research_confirmed_empty_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.user_contents uc WHERE uc.user_id = p.id
      )
  ) THEN
    RAISE EXCEPTION '사도 요한 최종 없음 확정 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;

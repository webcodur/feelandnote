-- 상앙의 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 반영한다.
-- 《법경》 전수설은 상앙보다 약 천 년 뒤 편찬된 《진서》에 처음 보이며 원전도 소실되어 채택하지 않는다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '426cd36a-2194-4a5f-8f62-8492b01c27e3'::uuid;
  target_run_id constant uuid := '0b5473f6-3f58-49dd-8050-b5a07b2e7de9'::uuid;
  book_finding_id constant uuid := '3d54b646-5b55-4cc7-8dfd-32b179e171ca'::uuid;
  video_finding_id constant uuid := 'fa853295-d97b-4532-a2de-6e2140d76585'::uuid;
  game_finding_id constant uuid := '74f265b4-7789-460e-8890-5182e5ec5e20'::uuid;
  music_finding_id constant uuid := 'b68210ca-2d2b-4dca-ac4a-12029a97cf18'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'shang-yang'
      AND p.nickname = '상앙'
      AND p.nickname_en = 'Shang Yang'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '상앙 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '상앙 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id,
    target_celeb_id,
    '2026-07-30-shang-yang-empty-v1',
    'Codex',
    ARRAY['상앙', '상군', '공손앙', '위앙', '商鞅', '商君', '公孫鞅', '衛鞅', 'Shang Yang', 'Gongsun Yang', 'Wei Yang'],
    '전국시대 위나라 출신으로 진 효공을 보좌한 상앙(?~기원전 338)을 《상군서》의 후대 편찬자, 한비·이사 등 다른 법가와 분리했다.',
    '《사기·상군열전》, 《진서·형법지》와 현대 초기 중국법 연구를 대조했다. 《진서》는 상앙이 이회의 《법경》을 전수받아 진의 율로 바꾸었다고 쓰지만, 이 전승은 상앙보다 약 천 년 뒤인 7세기 편찬 사료에서 처음 확인되고 《법경》 원전도 소실되었다. 더구나 “전수받았다”는 말만으로 개인 독서를 확정하기 어렵다. 《상군서》는 본인과 학파의 저작이라 제외했다. 제목 있는 공연·영상, 실제 놀이, 곡 감상은 확인되지 않아 0건으로 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      book_finding_id, target_run_id, 'BOOK', 'rejected',
      '법경', '이회', NULL,
      '7세기 편찬 《진서·형법지》는 이회가 《법경》을 짓고 “상앙이 이를 전수받아 진을 보좌하며 법을 율로 바꾸었다”고 기록한다.',
      '동시대나 근접 사료가 아닌 매우 늦은 전승이고 원전도 소실되었다. 전달·법제 계승을 상앙 개인의 작품 소비로 확정할 수 없어 등록하지 않는다.'
    ),
    (
      video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '상앙 소재 후대 드라마·다큐멘터리 일반', NULL, NULL,
      '상앙의 변법과 최후를 재현한 후대 영상은 다수 존재하지만 모두 사후 제작물이다.',
      '본인이 관람한 제목 있는 공연·영상 작품은 확인되지 않았다.'
    ),
    (
      game_finding_id, target_run_id, 'GAME', 'rejected',
      '전국시대 병법·책략과 후대 전략게임 속 상앙', NULL, NULL,
      '변법과 전쟁 동원 정책은 확인되지만 놀이 기록이 아니며, 후대 게임 캐릭터는 본인의 소비와 무관하다.',
      '실제 제목 있는 게임이나 바둑·박희 등을 두었다는 사료를 확인하지 못했다.'
    ),
    (
      music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '전국시대 진나라 악무 일반', NULL, NULL,
      '당대 제례·궁정 음악의 일반사와 상앙의 법제는 연결되지만 작품 단위 감상 기록은 아니다.',
      '상앙이 듣거나 연주한 제목 있는 곡·악무는 확인되지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '상앙 finding 생성 행 수가 4개가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://zh.wikisource.org/zh-hant/%E6%99%89%E6%9B%B8/%E5%8D%B7030',
      'primary', 'archive', 'accessible',
      '晉書/卷030 — 刑法志',
      '《법경》과 “상앙이 이를 전수받아 법을 율로 바꾸었다”는 전승의 실제 문구를 확인했다. 다만 《진서》 자체가 상앙보다 약 천 년 뒤 편찬된 사료다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://brill.com/previewpdf/book/9789004315655/B9789004315655_002.xml',
      'secondary', 'article', 'accessible',
      'Sources on Early Chinese Law before the Yuelu Academy Qin Manuscripts',
      '《법경》 전승의 근거가 7세기 《진서·형법지》이며 상앙의 진 법제 청사진으로 서술되었다는 점을 명시한다.'
    ),
    (
      target_run_id, 'BOOK', book_finding_id,
      'https://www.cambridge.org/core/journals/early-china/article/dating-a-preimperial-text-the-case-study-of-the-book-of-lord-shang/199B57467F51A62EBD492DE47DA3360A',
      'secondary', 'article', 'accessible',
      'Dating a Pre-Imperial Text: The Case Study of the Book of Lord Shang',
      '《상군서》의 복합 편찬과 진위 논쟁을 확인해 상앙 자신의 외부 독서와 후대 학파 저술을 분리했다.'
    ),
    (
      target_run_id, 'VIDEO', video_finding_id,
      'https://ctext.org/shiji/shang-jun-lie-zhuan/zh',
      'primary', 'archive', 'accessible',
      '史記 — 商君列傳',
      '상앙의 생애와 변법을 전하는 핵심 전기에서 제목 있는 공연·영상 관람 기록을 확인하지 못했다.'
    ),
    (
      target_run_id, 'GAME', game_finding_id,
      'https://ctext.org/shiji/shang-jun-lie-zhuan/zh',
      'primary', 'archive', 'accessible',
      '史記 — 商君列傳',
      '병법과 전쟁 정책을 실제 놀이로 오인하지 않도록 전기 문맥을 검토했다.'
    ),
    (
      target_run_id, 'MUSIC', music_finding_id,
      'https://ctext.org/shiji/shang-jun-lie-zhuan/zh',
      'primary', 'archive', 'accessible',
      '史記 — 商君列傳',
      '상앙 개인의 제목 있는 음악 감상·연주 기록이 없는지 전기 범위를 검토했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 6 THEN
    RAISE EXCEPTION '상앙 source 생성 행 수가 6개가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET
    status = 'completed',
    completed_at = now(),
    search_notes = CASE s.content_type
      WHEN 'BOOK' THEN
        'Shang Yang·商鞅·衛鞅·read·book·法經·李悝·商君書 조합으로 《사기》·《진서》·현대 연구를 대조했다. 《법경》은 늦은 전승과 소실 원전 문제로 기각했다.'
      WHEN 'VIDEO' THEN
        'performance·spectacle·theatre·watched 조합과 《사기·상군열전》을 조사했다. 제목 있는 생전 감상 기록은 없다.'
      WHEN 'GAME' THEN
        'game·chess·go·博戲·played 조합을 조사했다. 병법·정책과 후대 게임 등장은 소비 증거가 아니다.'
      WHEN 'MUSIC' THEN
        'music·song·樂·舞·listened 조합을 조사했다. 상앙 개인의 제목 있는 곡 감상 기록은 없다.'
    END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '상앙 scope 완료 행 수가 4개가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '상앙 조사 완료 결과가 예상과 다릅니다. status=% count=%',
      completed_status, completed_content_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'confirmed_empty'
      AND (SELECT count(*) FROM public.user_contents uc WHERE uc.user_id = p.id) = 0
  ) THEN
    RAISE EXCEPTION '상앙 light·confirmed_empty 최종 검증에 실패했습니다.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.id = target_run_id
      AND r.status = 'completed'
      AND (SELECT count(*) FROM public.celeb_content_research_scopes s
           WHERE s.run_id = r.id AND s.status = 'completed') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'accepted') = 0
      AND (SELECT count(*) FROM public.celeb_content_research_findings f
           WHERE f.run_id = r.id AND f.decision = 'rejected') = 4
      AND (SELECT count(*) FROM public.celeb_content_research_sources src
           WHERE src.run_id = r.id) = 6
  ) THEN
    RAISE EXCEPTION '상앙 조사 저장 최종 검증에 실패했습니다.';
  END IF;
END;
$$;

ROLLBACK;

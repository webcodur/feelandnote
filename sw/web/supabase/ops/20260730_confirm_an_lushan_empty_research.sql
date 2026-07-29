-- 안녹산 BOOK / VIDEO / GAME / MUSIC 전면 조사 결과 0건을 조사 원장에 반영한다.
-- 다언어 통역과 호선무 공연은 확인되지만 본인이 소비한 특정 외부 작품은 식별되지 않는다.
-- 최초 실행은 ROLLBACK 상태로 dry-run한다.

BEGIN;

DO $$
DECLARE
  target_celeb_id constant uuid := '7c35e93e-b4fe-49c1-9cb6-f105f6a58f78'::uuid;
  target_run_id constant uuid := '75702461-7c46-4906-8444-37779f29eb9c'::uuid;
  rejected_book_finding_id constant uuid := '65c3a51a-8746-4f00-802a-7488cc36dfb4'::uuid;
  rejected_video_finding_id constant uuid := '57d0467c-a5b6-444d-aaa9-893373e1d6a8'::uuid;
  rejected_game_finding_id constant uuid := 'da94424b-64b0-4db0-b6f1-3777cd199026'::uuid;
  rejected_music_finding_id constant uuid := '06c88731-35de-49ba-8696-3b40a63c8976'::uuid;
  affected integer;
  completed_status text;
  completed_content_count bigint;
BEGIN
  IF (
    SELECT count(*) FROM public.profiles p
    WHERE p.id = target_celeb_id
      AND p.slug = 'an-lushan'
      AND p.nickname = '안녹산'
      AND p.profile_type = 'CELEB'
      AND p.status = 'active'
      AND p.celeb_tier = 'light'
      AND p.content_research_status = 'open'
  ) <> 1 THEN
    RAISE EXCEPTION '안녹산 프로필의 조사 전 기준선이 달라졌습니다.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_contents uc WHERE uc.user_id = target_celeb_id
  ) OR EXISTS (
    SELECT 1 FROM public.celeb_content_research_runs r
    WHERE r.celeb_id = target_celeb_id OR r.id = target_run_id
  ) THEN
    RAISE EXCEPTION '안녹산 조사 실행 또는 콘텐츠 연결이 이미 존재합니다.';
  END IF;

  INSERT INTO public.celeb_content_research_runs (
    id, celeb_id, batch_key, researcher_label, name_variants, homonym_notes, summary
  ) VALUES (
    target_run_id, target_celeb_id,
    '2026-07-30-an-lushan-empty-v1', 'Codex',
    ARRAY['안녹산', 'An Lushan', 'An Lu-shan', 'An Rokshan', '安祿山', '安禄山'],
    '8세기 당 현종 때의 장군이자 대연 황제 안녹산을 안사의 난 전체, 부장 사사명, 후대 소설·드라마·게임의 안녹산과 분리했다.',
    '사건에 가까운 『안록산사적』 계통 기록과 당대 문화 연구를 대조해 BOOK·VIDEO·GAME·MUSIC을 조사했다. 안녹산은 여러 언어에 능해 통역했고 현종의 명령으로 호선무를 추었지만, 전자는 특정 책의 독서가 아니고 후자는 본인이 수행한 춤이다. 안사의 난과 당 궁정의 음악·무용 일반론, 후대 재현물도 개인의 작품 단위 감상으로 확장하지 않고 네 유형 0건을 확정했다.'
  );

  INSERT INTO public.celeb_content_research_findings (
    id, run_id, content_type, decision, title, creator, content_id,
    evidence_summary, rejection_reason
  ) VALUES
    (
      rejected_book_finding_id, target_run_id, 'BOOK', 'rejected',
      '여러 언어의 통역·외교 실무 자료', NULL, NULL,
      '안녹산은 여러 비한어권 언어를 알아 상인 사이의 통역 업무를 했다는 전승이 있다.',
      '언어 능력과 실무 통역은 특정 제목·저자의 외부 책을 읽었다는 증거가 아니다. 후대 『안록산사적』과 정사 열전은 안녹산이 소비한 책이 아니라 그를 기록한 자료다.'
    ),
    (
      rejected_video_finding_id, target_run_id, 'VIDEO', 'rejected',
      '호선무', NULL, NULL,
      '『안록산사적』 계통 기록은 현종이 안녹산에게 호선무를 추게 했고 그가 빠르게 돌았다고 전한다.',
      '호선무는 춤의 양식명이고 안녹산은 관객이 아니라 공연자다. 본인 공연과 후대 드라마·영상 재현은 외부 VIDEO 감상작에서 제외한다.'
    ),
    (
      rejected_game_finding_id, target_run_id, 'GAME', 'rejected',
      '안사의 난·군사 작전과 후대 전략 게임', NULL, NULL,
      '안녹산의 군사 지휘와 반란은 사료에 상세히 기록되고 후대 전략 게임의 소재가 됐다.',
      '실제 전쟁은 디지털 GAME 플레이가 아니며 후대 게임은 본인 사후 재현물이다.'
    ),
    (
      rejected_music_finding_id, target_run_id, 'MUSIC', 'rejected',
      '호선무 반주와 당 현종 궁정의 서역계 음악 일반', NULL, NULL,
      '당 현종의 궁정에는 중앙아시아계 음악과 춤이 널리 유행했고 안녹산도 호선무를 공연했다.',
      '문화권·반주 일반론만으로 안녹산이 들은 곡명·작곡가·연주자를 식별할 수 없다. 본인 무용을 임의의 현대 음원에 연결하지 않았다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '안녹산 조사 finding 생성 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  INSERT INTO public.celeb_content_research_sources (
    run_id, content_type, finding_id, url, source_tier, source_kind,
    access_status, title, notes
  ) VALUES
    (
      target_run_id, 'BOOK', rejected_book_finding_id,
      'https://ctext.org/wiki.pl?chapter=492219&if=en',
      'primary', 'archive', 'accessible',
      'An Lu Shan’s Biography, Volume I — Chinese Text Project',
      '다언어 통역과 궁정 행적을 확인했지만 개인의 특정 서명 독서는 전하지 않는다.'
    ),
    (
      target_run_id, 'VIDEO', rejected_video_finding_id,
      'https://ctext.org/wiki.pl?chapter=492219&if=en',
      'primary', 'archive', 'accessible',
      'An Lu Shan’s Biography, Volume I — Chinese Text Project',
      '현종의 명령에 따라 안녹산 자신이 호선무를 춘 장면을 확인해 외부 관람작과 분리했다.'
    ),
    (
      target_run_id, 'GAME', rejected_game_finding_id,
      'https://www.cambridge.org/core/books/cambridge-history-of-china/court-and-province-in-mid-and-late-tang/9944E1F41895AF5010CD2B7F97EB0DAB',
      'secondary', 'article', 'accessible',
      'Court and Province in Mid- and Late T’ang — Cambridge History of China',
      '안사의 난을 실제 군사·정치 사건으로 확인하고 후대 게임 재현과 분리했다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://www.metmuseum.org/essays/music-and-art-of-china',
      'secondary', 'official_profile', 'accessible',
      'Music and Art of China — The Metropolitan Museum of Art',
      '당 현종 궁정의 중앙아시아계 음악·무용 유행을 확인했으나 안녹산 개인의 곡 단위 청취 자료는 아니다.'
    ),
    (
      target_run_id, 'MUSIC', rejected_music_finding_id,
      'https://academic.oup.com/edited-volume/52498/chapter-abstract/421530360',
      'secondary', 'article', 'accessible',
      'The Huxuan and Huteng Dances — Oxford Handbook of Music in China',
      '호선무가 외래 음악무용 양식임을 확인하고 제목 있는 개별 음악 작품과 구별했다.'
    );

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 5 THEN
    RAISE EXCEPTION '안녹산 조사 source 생성 행 수가 5가 아닙니다. 실제=%', affected;
  END IF;

  UPDATE public.celeb_content_research_scopes s
  SET status = 'completed', completed_at = now(),
      search_notes = CASE s.content_type
        WHEN 'BOOK' THEN 'An Lushan·안녹산과 read·book·education·languages·interpreter 조합을 조사했다. 다언어 통역은 특정 서명 독서가 아니어서 기각했다.'
        WHEN 'VIDEO' THEN 'watched·theatre·dance·Huxuan 조합을 조사했다. 호선무는 본인이 수행한 양식명이고 제목 있는 외부 관람작은 없다.'
        WHEN 'GAME' THEN 'game·played·war·rebellion 조합을 조사했다. 안사의 난과 후대 전략 게임은 본인의 디지털 GAME 소비가 아니다.'
        WHEN 'MUSIC' THEN 'music·song·heard·court·Huxuan 조합을 조사했다. 궁정·반주 일반론 외에 곡명·창작자가 특정되는 청취작은 없다.'
      END
  WHERE s.run_id = target_run_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 4 THEN
    RAISE EXCEPTION '안녹산 조사 scope 완료 행 수가 4가 아닙니다. 실제=%', affected;
  END IF;

  SELECT result.final_research_status, result.actual_content_count
  INTO completed_status, completed_content_count
  FROM public.complete_celeb_content_research_run(target_run_id) result;

  IF completed_status <> 'confirmed_empty' OR completed_content_count <> 0 THEN
    RAISE EXCEPTION '안녹산 조사 완료 결과가 예상과 다릅니다. status=% count=%',
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
    RAISE EXCEPTION '안녹산 최종 없음 확정 검증에 실패했습니다.';
  END IF;
END;
$$;

COMMIT;

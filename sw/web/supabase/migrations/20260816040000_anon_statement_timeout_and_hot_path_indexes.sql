-- 2026-08-16 운영 적용 완료(Supabase MCP apply_migration). 기록용.
-- 공개 조회(anon) 문장 제한 3초 → 15초. 캐시가 한 시각에 같이 식어 조회가 몰릴 때
-- 57014(statement timeout)로 화면 구획이 통째로 실패하던 원인. 되돌리기: '3s'.
alter role anon set statement_timeout = '15s';
notify pgrst, 'reload config';

-- 감상문 피드 정렬 · 감상문 있는 공개 기록 필터
create index if not exists celeb_contents_review_updated_idx
  on public.celeb_contents (updated_at desc)
  where review is not null and visibility = 'public';
create index if not exists celeb_contents_review_public_id_idx
  on public.celeb_contents (id)
  where review is not null and review <> '' and visibility = 'public';

-- 영향력 순위 정렬 · 제휴 도서 조건 · 현대 인물 생년 범위
create index if not exists celeb_influence_total_score_idx
  on public.celeb_influence (total_score desc, celeb_id)
  where total_score > 0;
create index if not exists content_locales_affiliate_ko_idx
  on public.content_locales (locale, content_id)
  where affiliate_url is not null;
create index if not exists celebs_active_birth_idx
  on public.celebs (birth_date)
  where publication_status = 'active';

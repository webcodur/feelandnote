-- user_contents 테이블에 visibility 컬럼 추가
ALTER TABLE user_contents
ADD COLUMN visibility visibility_type DEFAULT 'public';

-- 기존 데이터는 모두 public으로 설정
UPDATE user_contents SET visibility = 'public' WHERE visibility IS NULL;

COMMENT ON COLUMN user_contents.visibility IS '콘텐츠 공개 범위: public(전체공개), followers(팔로워공개), private(비공개)';

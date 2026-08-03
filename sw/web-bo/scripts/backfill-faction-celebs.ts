/**
 * 폐기된 위험 스크립트.
 *
 * 과거에는 faction_people의 미연결 행을 의미 판별 없이 전부 CELEB 계정으로 만들었다.
 * 그 결과 회사·조직·제품·기계·기체·부대·집단이 개인 계정으로 등록됐다.
 * faction_people.celeb_id NOT NULL 전환이 끝난 지금 전수 자동 백필은 필요하지도, 허용되지도 않는다.
 *
 * 신규 출연자는 web-bo `/celebs/new`의 정식 셀럽 등록을 먼저 거친다.
 * 비인물 주체는 faction_groups와 미디어 문맥으로 관리한다.
 */

throw new Error(
  '실행 금지: faction_people 전수 자동 계정화는 폐기됐습니다. 회사·조직·제품·기계·부대·집단을 개인 계정으로 만드는 사고를 재발시킵니다.',
)

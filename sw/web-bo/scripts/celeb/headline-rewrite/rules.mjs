/**
 * 한 줄 정의 금지 표현. 룰 본문은 docs/project/celeb/celeb-01-02-profile-intro.md 한 줄 정의 절이 쥐고,
 * 스크립트는 이 상수 하나만 본다. `벼리다`는 활용형(벼린·벼른·벼렸다)까지 잡는다.
 */
export const HEADLINE_BAN = /(벼[리려린른렸]|포개|변신가|결을 고르|비애|후광을 왕조)/

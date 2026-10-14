# 07. 에셋

인물 초상은 명부의 `avatar_url`을 사용한다. 주소가 없거나 로딩에 실패하면 `Portrait`가 이름 표지로 대체한다. 별도 인종·성별 템플릿 초상을 만들지 않는다.

영토 그림 선택은 `ui/art.ts`의 `territoryArt()`가 담당한다. 도시 그림이 없으면 지역 그림을 사용하고, 둘 다 없으면 그림 주소를 만들지 않는다. 게임은 `public/images/game/suikoden/banners/`와 `scenes/`의 WebP를 읽는다. `territories/`·`regions/`의 PNG는 그 제작 원본이다.

지도는 `map/WorldMap.tsx`가 지형과 영토·세력·인물 표지를 그린다. 전투 효과는 화면의 SVG·CSS를 사용한다. 움직임을 줄이는 기기 설정도 따른다.

음악 경로·페이즈 배정·효과음 배정은 `hooks/useSuikodenAudio.ts`가 쥔다. 천도 전용 BGM과 `public/assets/common/`의 기존 효과음을 공용 게임 오디오 엔진으로 재생한다. 음악·효과음 음소거는 각각 제어한다.

인물 대사와 한마디는 `celeb_dialogues`에서 현재 화면에 필요한 인물만 읽는다. 대사 음원은 공용 `getVoiceUrl()`과 DB 음성 버전으로 찾으며, 새 음성을 합성하지 않는다.

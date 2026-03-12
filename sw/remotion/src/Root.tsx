import { Composition } from "remotion";
import "./style.css";
import { TextReveal } from "./compositions/TextReveal";
import { ImageSlideshow } from "./compositions/ImageSlideshow";
import {
  OneNightLibrary,
  calcTotalFrames as calcOneNightFrames,
  davinciTesla,
} from "./compositions/OneNightLibrary";
import {
  ServiceIntro,
  totalFrames as serviceIntroFrames,
} from "./compositions/ServiceIntro";
import {
  BookRecommend,
  calcTotalFrames as calcBookFrames,
  elonMusk,
} from "./compositions/BookRecommend";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 셀럽 책 추천 — 감상철학 + 5권 소개 */}
      <Composition
        id="BookRecommend"
        component={BookRecommend}
        durationInFrames={calcBookFrames(elonMusk)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          script: elonMusk,
        }}
      />
      {/* 서비스 소개 영상 — 60초 트레일러 */}
      <Composition
        id="ServiceIntro"
        component={ServiceIntro}
        durationInFrames={serviceIntroFrames}
        fps={30}
        width={1920}
        height={1080}
      />
      {/* 하룻밤의 서재 — 셀럽 가상 대담 */}

      {/* 텍스트 등장 애니메이션 — 자막/타이틀용 */}
      {/* 이미지 슬라이드쇼 — AI 이미지 영상화 */}
    </>
  );
};

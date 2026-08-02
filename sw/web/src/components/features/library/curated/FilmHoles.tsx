/*
  파일명: /components/features/library/curated/FilmHoles.tsx
  기능: 영상 목록 카드에 두르는 필름 구멍 띠
  책임: 영화 포스터가 책 표지와 같은 세로 비율이라 그림만으로는 둘이 구별되지 않는다.
        영상 목록임을 카드 생김새로 알리는 유일한 표식이므로 책·영상을 함께 진열하는
        모든 화면(서가 미리보기·기관 선정 허브·기관 상세)이 이 하나를 쓴다.
*/ // ------------------------------

/** 서버·클라이언트 양쪽에서 쓰인다. 그림 규칙은 Tailwind 임의값으로 적으면
 *  공백 처리가 까다로워 인라인으로 둔다 */
export default function FilmHoles() {
  return (
    <div
      aria-hidden
      className="h-[7px] bg-black"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.30) 0 5px, transparent 5px 12px)",
        backgroundSize: "auto 3px",
        backgroundPosition: "center",
        backgroundRepeat: "repeat-x",
      }}
    />
  );
}

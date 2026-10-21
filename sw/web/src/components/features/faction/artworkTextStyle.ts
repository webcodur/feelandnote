// 이미지 위의 자막·제목: 글자 크기에 맞춘 검정 윤곽과 짧은 음영을 공유한다.
export const ARTWORK_TEXT_STYLE = {
  WebkitTextStroke: "0.1em var(--color-black)",
  paintOrder: "stroke fill",
  textShadow: "0 1px 2px color-mix(in srgb, var(--color-black) 70%, transparent)",
} as const;

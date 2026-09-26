// 썸네일과 확대 그림이 같은 위치·비율로 제목을 표시한다.
export default function FactionArtworkTitle({ title, heading = false }: { title: string; heading?: boolean }) {
  const Title = heading ? "h2" : "span";
  const Wrapper = heading ? "div" : "span";
  return (
    <Wrapper className={`pointer-events-none absolute end-[4%] bottom-[6%] ${heading ? "w-[34%]" : "w-[44%] md:w-[34%]"}`}>
      <Title data-artwork-title className="block w-full break-keep text-balance text-end text-[clamp(0.6875rem,6cqw,4.5rem)] font-black leading-[1.1] text-white [overflow-wrap:anywhere] [text-shadow:0_2px_16px_rgba(0,0,0,0.8)]">{title}</Title>
    </Wrapper>
  );
}

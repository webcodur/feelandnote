/**
 * 보존용 대안 워드마크.
 * 2026-08-10 시안 검수 중 고딕 성채처럼 보이는 뾰족한 세리프가 재미있다는
 * 판단으로 남겨 둔다. 현재 서비스 로고에서는 사용하지 않는다.
 */
interface LogoWordmarkDraculaProps {
  compact?: boolean;
  className?: string;
}

function F({ x }: { x: number }) {
  return <path className="logo-letter" transform={`translate(${x} 0)`} d="M3 9h55l-3 12h-3c-1-6-7-9-20-9H18v33h20c6 0 9-3 10-9h3v21h-3c-1-6-4-9-10-9H18v31l9 5v3H2v-3l8-5V17L3 12Z" />;
}

function E({ x }: { x: number }) {
  return <path className="logo-letter" transform={`translate(${x} 0)`} d="M3 9h55l-3 12h-3c-1-6-7-9-20-9H18v33h20c6 0 9-3 10-9h3v21h-3c-1-6-4-9-10-9H18v27h17c13 0 19-4 22-12h3l-3 15H3v-3l7-5V17l-7-5Z" />;
}

function L({ x }: { x: number }) {
  return <path className="logo-letter" transform={`translate(${x} 0)`} d="M3 9h25v3l-9 5v67h16c13 0 19-4 23-14h3l-3 17H3v-3l8-5V17l-8-5Z" />;
}

function N({ x }: { x: number }) {
  return <path className="logo-letter" transform={`translate(${x} 0)`} d="M3 9h18l34 59V18l-9-6V9h22v3l-8 6v70h-6L14 20v58l9 6v3H2v-3l8-6V17l-7-5Z" />;
}

function O({ x }: { x: number }) {
  return <path className="logo-letter" fillRule="evenodd" transform={`translate(${x} 0)`} d="M32 7C13 7 3 23 3 48s10 41 29 41 29-16 29-41S51 7 32 7Zm0 4c12 0 19 14 19 37s-7 37-19 37-19-14-19-37 7-37 19-37Z" />;
}

function T({ x }: { x: number }) {
  return <path className="logo-letter" transform={`translate(${x} 0)`} d="M2 9h61l-3 15h-3c-1-8-7-12-20-12h-1v67l9 5v3H19v-3l9-5V12h-1C14 12 8 16 7 24H4Z" />;
}

function Ampersand({ x }: { x: number }) {
  return (
    <g className="logo-ampersand" transform={`translate(${x} 0)`}>
      <path d="M42 18c0-7-5-11-12-11-10 0-17 7-17 18 0 10 8 20 18 32l14 17c5 6 10 9 17 10" />
      <path d="M54 41c-2 19-13 44-31 44-11 0-18-7-18-17 0-12 8-20 23-28 10-5 15-12 15-21" />
      <path className="logo-ampersand-cross" d="M30 56c10-5 19-11 27-20" />
    </g>
  );
}

export default function LogoWordmarkDracula({ compact = false, className = "" }: LogoWordmarkDraculaProps) {
  if (compact) {
    return (
      <svg aria-hidden="true" className={className} viewBox="0 0 205 96" xmlns="http://www.w3.org/2000/svg">
        <F x={3} /><Ampersand x={72} /><N x={134} />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 615 96" xmlns="http://www.w3.org/2000/svg">
      <F x={3} /><E x={68} /><E x={133} /><L x={198} /><Ampersand x={267} />
      <N x={342} /><O x={416} /><T x={486} /><E x={552} />
    </svg>
  );
}

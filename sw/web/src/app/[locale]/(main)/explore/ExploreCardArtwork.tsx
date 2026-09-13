/** Decorative illustrations only; the shapes do not represent measured figure data. */
export default function ExploreCardArtwork({ variant }: { variant: string }) {
  const palette = {
    ranking: { light: "#e9c76d", dark: "#6b471e" },
    spectrum: { light: "#9ed9c8", dark: "#24594e" },
    myth: { light: "#e5bc91", dark: "#694033" },
    faction: { light: "#b1c8eb", dark: "#344d73" },
  }[variant] ?? { light: "#e9c76d", dark: "#6b471e" };
  const id = `explore-art-${variant}`;

  return (
    <svg viewBox="0 0 320 180" fill="none" aria-hidden="true" focusable="false" className="h-full w-full" style={{ color: palette.light }}>
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor={palette.dark} stopOpacity=".55" />
          <stop offset="1" stopColor={palette.dark} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-metal`} x1="80" y1="20" x2="210" y2="175" gradientUnits="userSpaceOnUse">
          <stop stopColor={palette.light} stopOpacity=".65" />
          <stop offset="1" stopColor={palette.dark} stopOpacity=".12" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="98" rx="150" ry="100" fill={`url(#${id}-glow)`} />
      <path d="M36 153H284M54 160H266" stroke="currentColor" strokeOpacity=".14" />
      {variant === "ranking" && <>
        <circle cx="160" cy="73" r="57" stroke="currentColor" strokeOpacity=".12" />
        <circle cx="160" cy="73" r="49" stroke="currentColor" strokeOpacity=".12" strokeDasharray="2 7" />
        <path d="M75 146C53 120 57 87 76 64M245 146C267 120 263 87 244 64" stroke="currentColor" strokeOpacity=".65" />
        {[0, 1, 2, 3].map((i) => <g key={i} transform={`translate(0 ${i * 16})`} fill="currentColor" fillOpacity=".3">
          <path d="M64 72Q44 67 50 52Q65 55 64 72M65 77Q83 63 80 52Q65 58 65 77" />
          <path d="M256 72Q276 67 270 52Q255 55 256 72M255 77Q237 63 240 52Q255 58 255 77" />
        </g>)}
        <path d="M88 152V128H132V152M188 152V116H232V152" fill={`url(#${id}-metal)`} stroke="currentColor" strokeOpacity=".4" />
        <path d="M130 152V103H190V152" fill={`url(#${id}-metal)`} stroke="currentColor" strokeOpacity=".7" />
        <path d="M142 41H178V56C178 73 170 82 160 82C150 82 142 73 142 56V41Z" fill={`url(#${id}-metal)`} stroke="currentColor" strokeWidth="1.5" />
        <path d="M142 47H131V53C131 66 139 70 146 70M178 47H189V53C189 66 181 70 174 70M160 83V95M148 96H172" stroke="currentColor" strokeWidth="1.5" />
        <path d="M160 49L163 56L171 57L165 62L166 70L160 66L154 70L155 62L149 57L157 56Z" fill="currentColor" fillOpacity=".8" />
        <path d="M97 140H121M199 129H221M149 124L160 116L171 124V139H149Z" stroke="currentColor" strokeOpacity=".35" />
      </>}
      {variant === "spectrum" && <>
        <g transform="translate(160 87)">
          {[25, 48, 72].map((r) => <circle key={r} r={r} stroke="currentColor" strokeOpacity=".15" />)}
          {[0, 45, 90, 135].map((angle) => <path key={angle} d="M-81 0H81" transform={`rotate(${angle})`} stroke="currentColor" strokeOpacity=".18" />)}
          <path d="M0-62L39-39L64 0L32 32L0 72L-50 50L-44 0L-34-34Z" fill={`url(#${id}-metal)`} stroke="currentColor" strokeOpacity=".8" strokeWidth="1.5" />
          <path d="M0-35L53-53L39 0L46 46L0 45L-32 32L-66 0L-20-20Z" fill="none" stroke="#d9bf83" strokeOpacity=".6" strokeDasharray="3 4" />
          {[[0,-62],[39,-39],[64,0],[32,32],[0,72],[-50,50],[-44,0],[-34,-34]].map(([x,y], i) => <circle key={i} cx={x} cy={y} r="3" fill="currentColor" />)}
          <circle r="5" fill="currentColor" /><circle r="10" stroke="currentColor" strokeOpacity=".4" />
        </g>
        <path d="M49 63H70M55 69H70M250 112H271M250 118H265" stroke="currentColor" strokeOpacity=".4" />
        <circle cx="58" cy="99" r="2" fill="currentColor" fillOpacity=".5" /><circle cx="267" cy="62" r="2" fill="currentColor" fillOpacity=".5" />
      </>}
      {variant === "myth" && <>
        <circle cx="160" cy="69" r="53" fill={`url(#${id}-metal)`} fillOpacity=".3" stroke="currentColor" strokeOpacity=".2" />
        <path d="M29 145L83 100L119 145M213 143L254 108L296 145" fill={`url(#${id}-metal)`} stroke="currentColor" strokeOpacity=".13" />
        <path d="M92 77L160 39L228 77Z" fill={`url(#${id}-metal)`} stroke="currentColor" strokeWidth="1.5" />
        <path d="M113 71L160 46L207 71M95 84H225M99 140H221M90 147H230M81 154H239" stroke="currentColor" strokeOpacity=".65" />
        {[109, 139, 169, 199].map((x) => <g key={x}>
          <path d={`M${x} 88H${x+12}V137H${x}Z`} fill={`url(#${id}-metal)`} stroke="currentColor" strokeOpacity=".65" />
          <path d={`M${x+4} 92V132M${x+8} 92V132`} stroke="currentColor" strokeOpacity=".2" />
        </g>)}
        <path d="M66 46V58M60 52H72M251 28V42M244 35H258" stroke="currentColor" strokeOpacity=".6" />
        <circle cx="87" cy="29" r="1.5" fill="currentColor" /><circle cx="271" cy="78" r="2" fill="currentColor" />
        <path d="M43 131H93M226 129H277" stroke="currentColor" strokeOpacity=".2" strokeDasharray="4 5" />
      </>}
      {variant === "faction" && <>
        <path d="M160 42L88 101L124 140H196L232 101L160 42ZM88 101H232M124 140L160 42L196 140" stroke="currentColor" strokeOpacity=".35" />
        <path d="M49 72L88 101L56 142M271 72L232 101L264 142" stroke="currentColor" strokeOpacity=".2" strokeDasharray="3 4" />
        {[[49,72],[56,142],[271,72],[264,142]].map(([x,y], i) => <circle key={i} cx={x} cy={y} r="4" fill={palette.dark} stroke="currentColor" strokeOpacity=".4" />)}
        {[[88,101,23],[232,101,23],[124,140,15],[196,140,15],[160,42,29]].map(([x,y,r], i) => <g key={i} transform={`translate(${x} ${y})`}>
          <circle r={r+5} stroke="currentColor" strokeOpacity=".13" />
          <circle r={r} fill="#10151e" stroke="currentColor" strokeOpacity={i===4 ? ".85" : ".45"} />
          <circle cy={-r*.2} r={r*.23} fill={`url(#${id}-metal)`} stroke="currentColor" strokeOpacity=".6" />
          <path d={`M${-r*.48} ${r*.5}Q${-r*.45} 0 0 0Q${r*.45} 0 ${r*.48} ${r*.5}`} fill={palette.dark} stroke="currentColor" strokeOpacity=".6" />
        </g>)}
      </>}
    </svg>
  );
}

import React from "react";

// 그리스 열쇠 문양 (Greek Key / Meander) - 코너용
// 프레임 모서리, 카드 장식 등에 활용

interface CorinthianKeyProps {
  className?: string;
  variant?: "corner" | "border" | "frame";
}

export default function CorinthianKey({ className = "", variant = "corner" }: CorinthianKeyProps) {
  const viewBoxes = {
    corner: "0 0 100 100",
    border: "0 0 300 40",
    frame: "0 0 200 200",
  };

  const sizes = {
    corner: "w-24 h-24",
    border: "w-72 h-10",
    frame: "w-48 h-48",
  };

  return (
    <div className={`relative ${sizes[variant]} ${className}`}>
      <svg
        viewBox={viewBoxes[variant]}
        className="w-full h-full drop-shadow-lg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="key-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bf953f" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#aa771c" />
          </linearGradient>
        </defs>

        {variant === "corner" && (
          <g fill="none" stroke="url(#key-gold)" strokeWidth="4" strokeLinecap="square">
            {/* 외곽 L자 */}
            <path d="M5 95 L5 5 L95 5" />
            {/* 미로 패턴 */}
            <path d="M15 85 L15 15 L85 15" />
            <path d="M25 75 L25 25 L75 25 L75 35" />
            <path d="M35 65 L35 35 L65 35 L65 45" />
            <path d="M45 55 L45 45 L55 45" />
          </g>
        )}

        {variant === "border" && (
          <g fill="none" stroke="url(#key-gold)" strokeWidth="3" strokeLinecap="square">
            {/* 상단/하단 라인 */}
            <path d="M0 5 L300 5" />
            <path d="M0 35 L300 35" />

            {/* 반복 패턴 */}
            {[0, 60, 120, 180, 240].map((x) => (
              <path
                key={x}
                d={`M${x} 35 L${x} 15 L${x + 20} 15 L${x + 20} 25 L${x + 40} 25 L${x + 40} 15 L${x + 60} 15 L${x + 60} 35`}
              />
            ))}
          </g>
        )}

        {variant === "frame" && (
          <g fill="none" stroke="url(#key-gold)" strokeWidth="3" strokeLinecap="square">
            {/* 외곽 프레임 */}
            <rect x="5" y="5" width="190" height="190" />
            <rect x="15" y="15" width="170" height="170" />

            {/* 네 모서리 미로 패턴 */}
            {[
              { x: 20, y: 20, rot: 0 },
              { x: 180, y: 20, rot: 90 },
              { x: 180, y: 180, rot: 180 },
              { x: 20, y: 180, rot: 270 },
            ].map((corner, i) => (
              <g key={i} transform={`translate(${corner.x}, ${corner.y}) rotate(${corner.rot})`}>
                <path d="M0 0 L0 30 L10 30 L10 10 L30 10 L30 0" />
              </g>
            ))}

            {/* 중앙 빈 공간 표시 (점선) */}
            <rect x="50" y="50" width="100" height="100" strokeDasharray="5 5" opacity="0.3" />
          </g>
        )}
      </svg>
    </div>
  );
}

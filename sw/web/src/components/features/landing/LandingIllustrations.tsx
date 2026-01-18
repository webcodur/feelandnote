/*
  파일명: /components/features/landing/LandingIllustrations.tsx
  기능: 랜딩페이지 섹션별 대형 일러스트레이션
  책임: 각 섹션의 시각적 임팩트를 위한 SVG 일러스트레이션 제공
*/

"use client";

import { ICON_COLORS } from "@/components/ui/icons/neo-pantheon/types";

interface IllustrationProps {
  className?: string;
}

// #region 피드 섹션 - 봉화 (소식 전달)
export function FeedIllustration({ className }: IllustrationProps) {
  return (
    <div className={`relative ${className}`}>
      <style jsx>{`
        @keyframes flameFlicker {
          0%, 100% { opacity: 0.6; transform: scaleY(1) translateY(0); }
          25% { opacity: 0.8; transform: scaleY(1.05) translateY(-2px); }
          50% { opacity: 0.7; transform: scaleY(0.95) translateY(0); }
          75% { opacity: 0.9; transform: scaleY(1.02) translateY(-1px); }
        }
      `}</style>
      <svg viewBox="0 0 400 300" fill="none" className="w-full h-full">
        <defs>
          <linearGradient id="flameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={ICON_COLORS.GOLD} stopOpacity="0.8" />
            <stop offset="50%" stopColor="#ffaa00" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ff6600" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* 뒤쪽 봉화대 (멀리 있는 것) */}
        <g transform="translate(80, 100)" opacity="0.3">
          <path d="M25 180 L35 180 L32 80 L28 80 Z" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
          <rect x="20" y="70" width="20" height="15" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
          <path d="M22 70 Q30 50, 30 40 Q30 50, 38 70" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
        </g>

        {/* 뒤쪽 봉화대 2 */}
        <g transform="translate(280, 90)" opacity="0.25">
          <path d="M25 190 L35 190 L32 80 L28 80 Z" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
          <rect x="20" y="70" width="20" height="15" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
          <path d="M22 70 Q30 50, 30 40 Q30 50, 38 70" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
        </g>

        {/* 메인 봉화대 */}
        <g transform="translate(160, 40)">
          {/* 기둥 */}
          <path d="M30 250 L50 250 L46 120 L34 120 Z" stroke={ICON_COLORS.GOLD} strokeWidth="2" fill="none" opacity="0.6" />
          {/* 기둥 장식 */}
          <line x1="38" y1="130" x2="38" y2="240" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" opacity="0.3" />
          <line x1="42" y1="130" x2="42" y2="240" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" opacity="0.3" />

          {/* 받침대 */}
          <rect x="25" y="105" width="30" height="20" stroke={ICON_COLORS.GOLD} strokeWidth="2" fill="none" opacity="0.6" />
          <line x1="28" y1="110" x2="52" y2="110" stroke={ICON_COLORS.GOLD} strokeWidth="1" opacity="0.4" />
          <line x1="28" y1="118" x2="52" y2="118" stroke={ICON_COLORS.GOLD} strokeWidth="1" opacity="0.4" />

          {/* 화로 */}
          <path d="M15 105 L25 85 L55 85 L65 105 Z" stroke={ICON_COLORS.GOLD} strokeWidth="2" fill="none" opacity="0.7" />
          <line x1="22" y1="90" x2="58" y2="90" stroke={ICON_COLORS.GOLD} strokeWidth="1" opacity="0.4" />

          {/* 불꽃 - 메인 */}
          <g style={{ animation: "flameFlicker 1.5s ease-in-out infinite" }}>
            <path
              d="M40 80 Q30 60, 35 40 Q40 20, 40 5 Q40 20, 45 40 Q50 60, 40 80"
              stroke="url(#flameGradient)"
              strokeWidth="2"
              fill="none"
              opacity="0.8"
            />
            <path
              d="M40 75 Q33 55, 38 35 Q40 25, 40 15"
              stroke={ICON_COLORS.GOLD}
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <path
              d="M40 75 Q47 55, 42 35 Q40 25, 40 15"
              stroke={ICON_COLORS.GOLD}
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
          </g>

          {/* 불꽃 - 작은 곁불 */}
          <g style={{ animation: "flameFlicker 1.2s ease-in-out infinite", animationDelay: "0.3s" }}>
            <path d="M32 82 Q28 70, 30 55 Q32 65, 32 82" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" opacity="0.5" />
          </g>
          <g style={{ animation: "flameFlicker 1.3s ease-in-out infinite", animationDelay: "0.6s" }}>
            <path d="M48 82 Q52 70, 50 55 Q48 65, 48 82" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" opacity="0.5" />
          </g>
        </g>

        {/* 지면 라인 */}
        <line x1="50" y1="290" x2="350" y2="290" stroke={ICON_COLORS.GOLD} strokeWidth="1" opacity="0.2" />

        {/* 신호 파동 (소식 전파) */}
        <g transform="translate(200, 60)">
          <path d="M-60 0 Q-50 -15, -30 0" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" opacity="0.2" className="animate-pulse" style={{ animationDuration: "2s" }} />
          <path d="M-80 0 Q-65 -25, -40 0" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" fill="none" opacity="0.15" className="animate-pulse" style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
          <path d="M30 0 Q50 -15, 60 0" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" opacity="0.2" className="animate-pulse" style={{ animationDuration: "2s", animationDelay: "0.3s" }} />
          <path d="M40 0 Q65 -25, 80 0" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" fill="none" opacity="0.15" className="animate-pulse" style={{ animationDuration: "2s", animationDelay: "0.8s" }} />
        </g>
      </svg>
    </div>
  );
}
// #endregion

// #region 탐색 섹션 - 별자리 네트워크 (제자리에서 빛남)
export function ExploreIllustration({ className }: IllustrationProps) {
  const stars = [
    { cx: 200, cy: 150, r: 20, isCenter: true, delay: 0 },
    { cx: 100, cy: 80, r: 12, delay: 0.4 },
    { cx: 300, cy: 80, r: 14, delay: 0.8 },
    { cx: 70, cy: 180, r: 10, delay: 1.2 },
    { cx: 330, cy: 180, r: 11, delay: 1.6 },
    { cx: 140, cy: 250, r: 9, delay: 2.0 },
    { cx: 260, cy: 250, r: 13, delay: 2.4 },
    { cx: 50, cy: 40, r: 6, delay: 2.8 },
    { cx: 350, cy: 40, r: 7, delay: 3.2 },
    { cx: 30, cy: 130, r: 5, delay: 3.6 },
    { cx: 370, cy: 130, r: 6, delay: 4.0 },
    { cx: 200, cy: 50, r: 8, delay: 4.4 },
    { cx: 200, cy: 260, r: 7, delay: 4.8 },
  ];

  return (
    <div className={`relative ${className}`}>
      <style jsx>{`
        @keyframes starBreathe {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        @keyframes glowBreathe {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <svg viewBox="0 0 400 300" fill="none" className="w-full h-full">
        <defs>
          <radialGradient id="starGlowGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ICON_COLORS.GOLD} stopOpacity="1" />
            <stop offset="50%" stopColor={ICON_COLORS.GOLD} stopOpacity="0.3" />
            <stop offset="100%" stopColor={ICON_COLORS.GOLD} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 연결선 - 별자리 */}
        <g stroke={ICON_COLORS.GOLD} strokeWidth="1" opacity="0.15">
          <line x1="200" y1="150" x2="100" y2="80" />
          <line x1="200" y1="150" x2="300" y2="80" />
          <line x1="200" y1="150" x2="70" y2="180" />
          <line x1="200" y1="150" x2="330" y2="180" />
          <line x1="200" y1="150" x2="140" y2="250" />
          <line x1="200" y1="150" x2="260" y2="250" />
          <line x1="200" y1="150" x2="200" y2="50" />
          <line x1="200" y1="150" x2="200" y2="260" />
          <line x1="100" y1="80" x2="50" y2="40" />
          <line x1="300" y1="80" x2="350" y2="40" />
          <line x1="70" y1="180" x2="30" y2="130" />
          <line x1="330" y1="180" x2="370" y2="130" />
          <line x1="100" y1="80" x2="200" y2="50" />
          <line x1="300" y1="80" x2="200" y2="50" />
          <line x1="140" y1="250" x2="200" y2="260" />
          <line x1="260" y1="250" x2="200" y2="260" />
        </g>

        {/* 별들 - 제자리에서 빛남 */}
        {stars.map((star, i) => (
          <g key={i}>
            {/* 글로우 효과 - 제자리에서 opacity만 변화 */}
            <circle
              cx={star.cx}
              cy={star.cy}
              r={star.r * 2.5}
              fill="url(#starGlowGradient)"
              style={{
                animation: `glowBreathe 3s ease-in-out infinite`,
                animationDelay: `${star.delay}s`
              }}
            />
            {/* 외곽 링 */}
            <circle
              cx={star.cx}
              cy={star.cy}
              r={star.r}
              stroke={ICON_COLORS.GOLD}
              strokeWidth={star.isCenter ? 2.5 : 1.5}
              fill="none"
              style={{
                animation: `starBreathe 3s ease-in-out infinite`,
                animationDelay: `${star.delay}s`
              }}
            />
            {/* 중심점 */}
            <circle
              cx={star.cx}
              cy={star.cy}
              r={star.r / 3}
              fill={ICON_COLORS.GOLD}
              style={{
                animation: `starBreathe 3s ease-in-out infinite`,
                animationDelay: `${star.delay}s`
              }}
            />
            {/* 중앙 별 추가 장식 */}
            {star.isCenter && (
              <>
                <circle cx={star.cx} cy={star.cy} r={star.r + 8} stroke={ICON_COLORS.GOLD} strokeWidth="0.5" fill="none" opacity="0.3" strokeDasharray="4 4" />
                <circle cx={star.cx} cy={star.cy} r={star.r + 16} stroke={ICON_COLORS.GOLD} strokeWidth="0.5" fill="none" opacity="0.15" />
              </>
            )}
          </g>
        ))}

        {/* 외곽 궤도 링 */}
        <circle cx="200" cy="150" r="110" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" fill="none" opacity="0.08" strokeDasharray="8 6" />
        <circle cx="200" cy="150" r="130" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" fill="none" opacity="0.05" />
      </svg>
    </div>
  );
}
// #endregion

// #region 휴게실 섹션 - 책상 위 주사위
export function LoungeIllustration({ className }: IllustrationProps) {
  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 400 300" fill="none" className="w-full h-full">
        {/* 책상 표면 */}
        <g>
          {/* 책상 상판 - 원근감 있는 사각형 */}
          <path
            d="M50 200 L150 240 L350 200 L250 160 Z"
            stroke={ICON_COLORS.GOLD}
            strokeWidth="2"
            fill="none"
            opacity="0.4"
          />
          {/* 책상 앞면 */}
          <path
            d="M150 240 L150 260 L350 220 L350 200"
            stroke={ICON_COLORS.GOLD}
            strokeWidth="1.5"
            fill="none"
            opacity="0.3"
          />
          {/* 책상 테두리 장식 */}
          <path d="M60 202 L155 240 L340 202" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" fill="none" opacity="0.2" />
        </g>

        {/* 주사위 1 - 왼쪽, 살짝 기울어짐 */}
        <g transform="translate(150, 155) rotate(-15)">
          {/* 윗면 */}
          <path d="M0 0 L30 -15 L60 0 L30 15 Z" stroke={ICON_COLORS.GOLD} strokeWidth="2" fill="none" opacity="0.7" />
          {/* 왼쪽면 */}
          <path d="M0 0 L0 35 L30 50 L30 15 Z" stroke={ICON_COLORS.GOLD} strokeWidth="1.5" fill="none" opacity="0.5" />
          {/* 오른쪽면 */}
          <path d="M60 0 L60 35 L30 50 L30 15 Z" stroke={ICON_COLORS.GOLD} strokeWidth="1.5" fill="none" opacity="0.6" />
          {/* 윗면 눈 - 1 */}
          <circle cx="30" cy="0" r="5" fill={ICON_COLORS.GOLD} opacity="0.6" />
        </g>

        {/* 주사위 2 - 중앙, 정면 (가장 큼) */}
        <g transform="translate(215, 130)">
          {/* 윗면 */}
          <path d="M0 0 L35 -18 L70 0 L35 18 Z" stroke={ICON_COLORS.GOLD} strokeWidth="2" fill="none" opacity="0.7" />
          {/* 왼쪽면 */}
          <path d="M0 0 L0 42 L35 60 L35 18 Z" stroke={ICON_COLORS.GOLD} strokeWidth="1.5" fill="none" opacity="0.5" />
          {/* 오른쪽면 */}
          <path d="M70 0 L70 42 L35 60 L35 18 Z" stroke={ICON_COLORS.GOLD} strokeWidth="1.5" fill="none" opacity="0.6" />
          {/* 윗면 눈 - 5 */}
          <circle cx="20" cy="-5" r="4" fill={ICON_COLORS.GOLD} opacity="0.6" />
          <circle cx="50" cy="-5" r="4" fill={ICON_COLORS.GOLD} opacity="0.6" />
          <circle cx="35" cy="0" r="4" fill={ICON_COLORS.GOLD} opacity="0.6" />
          <circle cx="20" cy="8" r="4" fill={ICON_COLORS.GOLD} opacity="0.6" />
          <circle cx="50" cy="8" r="4" fill={ICON_COLORS.GOLD} opacity="0.6" />
        </g>

        {/* 주사위 3 - 오른쪽, 굴러가는 중 (기울어짐) */}
        <g transform="translate(300, 150) rotate(25)">
          {/* 윗면 */}
          <path d="M0 0 L25 -12 L50 0 L25 12 Z" stroke={ICON_COLORS.GOLD} strokeWidth="2" fill="none" opacity="0.6" />
          {/* 왼쪽면 */}
          <path d="M0 0 L0 30 L25 42 L25 12 Z" stroke={ICON_COLORS.GOLD} strokeWidth="1.5" fill="none" opacity="0.4" />
          {/* 오른쪽면 */}
          <path d="M50 0 L50 30 L25 42 L25 12 Z" stroke={ICON_COLORS.GOLD} strokeWidth="1.5" fill="none" opacity="0.5" />
          {/* 윗면 눈 - 2 */}
          <circle cx="15" cy="-2" r="4" fill={ICON_COLORS.GOLD} opacity="0.5" />
          <circle cx="35" cy="4" r="4" fill={ICON_COLORS.GOLD} opacity="0.5" />
        </g>

        {/* 그림자 효과 */}
        <ellipse cx="190" cy="210" rx="30" ry="8" fill={ICON_COLORS.GOLD} opacity="0.08" />
        <ellipse cx="255" cy="205" rx="35" ry="10" fill={ICON_COLORS.GOLD} opacity="0.1" />
        <ellipse cx="320" cy="208" rx="25" ry="7" fill={ICON_COLORS.GOLD} opacity="0.06" />
      </svg>
    </div>
  );
}
// #endregion

// #region 기록관 섹션 - 거대한 신전 + 불씨 흩날림
// 불씨 파티클 데이터 - 하이드레이션 에러 방지를 위해 고정값 사용
const EMBERS_DATA = [
  { cx: 120, startY: 185, size: 1.5, duration: 3.2, delay: 0.3, drift: 8 },
  { cx: 145, startY: 195, size: 2.1, duration: 4.1, delay: 1.2, drift: -12 },
  { cx: 170, startY: 182, size: 1.2, duration: 3.8, delay: 2.5, drift: 5 },
  { cx: 195, startY: 210, size: 2.5, duration: 4.5, delay: 0.8, drift: -8 },
  { cx: 220, startY: 188, size: 1.8, duration: 3.5, delay: 3.1, drift: 14 },
  { cx: 245, startY: 200, size: 1.3, duration: 4.2, delay: 1.8, drift: -5 },
  { cx: 270, startY: 192, size: 2.2, duration: 3.9, delay: 4.2, drift: 10 },
  { cx: 130, startY: 205, size: 1.6, duration: 4.8, delay: 2.1, drift: -14 },
  { cx: 155, startY: 183, size: 2.8, duration: 3.3, delay: 0.5, drift: 6 },
  { cx: 180, startY: 215, size: 1.4, duration: 4.0, delay: 3.8, drift: -10 },
  { cx: 205, startY: 190, size: 2.0, duration: 3.6, delay: 1.5, drift: 12 },
  { cx: 230, startY: 198, size: 1.1, duration: 4.4, delay: 4.5, drift: -6 },
  { cx: 255, startY: 186, size: 2.4, duration: 3.4, delay: 0.9, drift: 9 },
  { cx: 280, startY: 208, size: 1.7, duration: 4.6, delay: 2.8, drift: -11 },
  { cx: 140, startY: 194, size: 2.6, duration: 3.7, delay: 1.1, drift: 7 },
  { cx: 165, startY: 212, size: 1.9, duration: 4.3, delay: 3.5, drift: -9 },
  { cx: 190, startY: 181, size: 1.0, duration: 3.1, delay: 4.8, drift: 13 },
  { cx: 215, startY: 202, size: 2.3, duration: 4.7, delay: 0.2, drift: -7 },
  { cx: 240, startY: 189, size: 1.5, duration: 3.0, delay: 2.4, drift: 11 },
  { cx: 265, startY: 196, size: 2.7, duration: 4.9, delay: 1.7, drift: -13 },
];

export function ArchiveIllustration({ className }: IllustrationProps) {

  return (
    <div className={`relative ${className}`}>
      <style jsx>{`
        @keyframes emberFloat {
          0% {
            opacity: 0;
            transform: translateY(0) translateX(0);
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            opacity: 0;
            transform: translateY(-120px) translateX(var(--drift));
          }
        }
        @keyframes emberGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
      <svg viewBox="0 0 400 300" fill="none" className="w-full h-full">
        <defs>
          <linearGradient id="templeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={ICON_COLORS.GOLD} stopOpacity="0.8" />
            <stop offset="100%" stopColor={ICON_COLORS.GOLD} stopOpacity="0.3" />
          </linearGradient>
          <filter id="templeGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="emberGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffaa00" stopOpacity="1" />
            <stop offset="50%" stopColor={ICON_COLORS.GOLD} stopOpacity="0.8" />
            <stop offset="100%" stopColor={ICON_COLORS.GOLD} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 페디먼트 (삼각형 지붕) */}
        <g filter="url(#templeGlow)">
          <path
            d="M50 100 L200 25 L350 100"
            stroke="url(#templeGradient)"
            strokeWidth="3"
            fill="none"
          />
          {/* 지붕 내부 삼각형 */}
          <path d="M70 95 L200 35 L330 95" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" opacity="0.3" />
        </g>

        {/* 엔터블러처 */}
        <line x1="40" y1="100" x2="360" y2="100" stroke={ICON_COLORS.GOLD} strokeWidth="3" />
        <line x1="45" y1="108" x2="355" y2="108" stroke={ICON_COLORS.GOLD} strokeWidth="1" opacity="0.5" />

        {/* 기둥들 */}
        {[80, 140, 200, 260, 320].map((x, i) => (
          <g key={i}>
            {/* 기둥 본체 */}
            <rect
              x={x - 12}
              y={110}
              width={24}
              height={140}
              stroke={ICON_COLORS.GOLD}
              strokeWidth="2"
              fill="none"
              opacity="0.6"
            />
            {/* 기둥 홈 (플루팅) */}
            <line x1={x - 6} y1={115} x2={x - 6} y2={245} stroke={ICON_COLORS.GOLD} strokeWidth="0.5" opacity="0.3" />
            <line x1={x} y1={115} x2={x} y2={245} stroke={ICON_COLORS.GOLD} strokeWidth="0.5" opacity="0.3" />
            <line x1={x + 6} y1={115} x2={x + 6} y2={245} stroke={ICON_COLORS.GOLD} strokeWidth="0.5" opacity="0.3" />
            {/* 주두 (기둥 머리) - 이오니아식 */}
            <rect x={x - 15} y={105} width={30} height={8} stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" opacity="0.5" />
            <path d={`M${x - 15} 105 Q${x - 18} 100 ${x - 15} 95`} stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" opacity="0.4" />
            <path d={`M${x + 15} 105 Q${x + 18} 100 ${x + 15} 95`} stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" opacity="0.4" />
            {/* 기둥 베이스 */}
            <rect x={x - 14} y={245} width={28} height={6} stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" opacity="0.4" />
          </g>
        ))}

        {/* 계단 */}
        <line x1="30" y1="250" x2="370" y2="250" stroke={ICON_COLORS.GOLD} strokeWidth="2" />
        <line x1="25" y1="260" x2="375" y2="260" stroke={ICON_COLORS.GOLD} strokeWidth="2" opacity="0.7" />
        <line x1="20" y1="270" x2="380" y2="270" stroke={ICON_COLORS.GOLD} strokeWidth="2" opacity="0.5" />
        <line x1="15" y1="280" x2="385" y2="280" stroke={ICON_COLORS.GOLD} strokeWidth="2" opacity="0.3" />


        {/* 불씨 흩날리는 효과 */}
        {EMBERS_DATA.map((ember, i) => (
          <circle
            key={i}
            cx={ember.cx}
            cy={ember.startY}
            r={ember.size}
            fill="url(#emberGradient)"
            style={{
              animation: `emberFloat ${ember.duration}s ease-out infinite`,
              animationDelay: `${ember.delay}s`,
              // @ts-expect-error CSS custom property
              "--drift": `${ember.drift}px`,
            }}
          />
        ))}

      </svg>
    </div>
  );
}
// #endregion

// #region Hero 기둥 (대형)
export function HeroPillar({ className, side }: IllustrationProps & { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <div className={`${className}`}>
      <svg viewBox="0 0 80 500" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* 주두 (Capital) - 코린트식 */}
        <g>
          {/* 상단 판 */}
          <rect x="5" y="0" width="70" height="8" stroke={ICON_COLORS.GOLD} strokeWidth="1.5" fill="none" opacity="0.6" />
          <rect x="10" y="8" width="60" height="6" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" opacity="0.5" />

          {/* 아칸서스 잎 장식 */}
          <path
            d={isLeft
              ? "M40 20 Q25 30, 15 50 Q20 45, 25 55 Q30 45, 35 55 Q40 45, 40 35"
              : "M40 20 Q55 30, 65 50 Q60 45, 55 55 Q50 45, 45 55 Q40 45, 40 35"
            }
            stroke={ICON_COLORS.GOLD}
            strokeWidth="1"
            fill="none"
            opacity="0.4"
          />
          <path
            d={isLeft
              ? "M40 20 Q55 30, 65 50 Q60 45, 55 55 Q50 45, 45 55 Q40 45, 40 35"
              : "M40 20 Q25 30, 15 50 Q20 45, 25 55 Q30 45, 35 55 Q40 45, 40 35"
            }
            stroke={ICON_COLORS.GOLD}
            strokeWidth="1"
            fill="none"
            opacity="0.4"
          />

          {/* 소용돌이 장식 */}
          <path d="M15 45 Q5 40, 8 30 Q12 35, 15 32" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" opacity="0.3" />
          <path d="M65 45 Q75 40, 72 30 Q68 35, 65 32" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" opacity="0.3" />
        </g>

        {/* 기둥 몸체 (Shaft) */}
        <g>
          {/* 외곽 */}
          <line x1="15" y1="60" x2="15" y2="440" stroke={ICON_COLORS.GOLD} strokeWidth="2" opacity="0.6" />
          <line x1="65" y1="60" x2="65" y2="440" stroke={ICON_COLORS.GOLD} strokeWidth="2" opacity="0.6" />

          {/* 플루팅 (세로 홈) */}
          <line x1="25" y1="65" x2="25" y2="435" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" opacity="0.3" />
          <line x1="35" y1="65" x2="35" y2="435" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" opacity="0.3" />
          <line x1="45" y1="65" x2="45" y2="435" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" opacity="0.3" />
          <line x1="55" y1="65" x2="55" y2="435" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" opacity="0.3" />

          {/* 엔타시스 (미세한 곡선) 표현 - 살짝 불룩한 느낌 */}
          <path d="M15 60 Q12 250, 15 440" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" fill="none" opacity="0.2" />
          <path d="M65 60 Q68 250, 65 440" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" fill="none" opacity="0.2" />
        </g>

        {/* 베이스 (Base) */}
        <g>
          {/* 토러스 (볼록한 원통) */}
          <rect x="10" y="440" width="60" height="10" stroke={ICON_COLORS.GOLD} strokeWidth="1.5" fill="none" opacity="0.5" />
          <path d="M10 445 Q40 442, 70 445" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" fill="none" opacity="0.3" />

          {/* 스코티아 (오목한 부분) */}
          <rect x="8" y="450" width="64" height="8" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" opacity="0.4" />

          {/* 플린스 (받침 판) */}
          <rect x="5" y="458" width="70" height="12" stroke={ICON_COLORS.GOLD} strokeWidth="1.5" fill="none" opacity="0.5" />
          <rect x="0" y="470" width="80" height="10" stroke={ICON_COLORS.GOLD} strokeWidth="2" fill="none" opacity="0.6" />

          {/* 계단형 받침 */}
          <line x1="0" y1="480" x2="80" y2="480" stroke={ICON_COLORS.GOLD} strokeWidth="1.5" opacity="0.4" />
          <line x1="0" y1="490" x2="80" y2="490" stroke={ICON_COLORS.GOLD} strokeWidth="1" opacity="0.3" />
          <line x1="0" y1="500" x2="80" y2="500" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" opacity="0.2" />
        </g>
      </svg>
    </div>
  );
}
// #endregion

// #region Hero 배경 텍스처
export function HeroTexture({ className }: IllustrationProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg viewBox="0 0 800 600" fill="none" className="w-full h-full opacity-[0.03]" preserveAspectRatio="xMidYMid slice">
        {/* 그리스 키 패턴 (미안더) - 상단 */}
        <g stroke={ICON_COLORS.GOLD} strokeWidth="2" fill="none">
          {Array.from({ length: 20 }).map((_, i) => (
            <path
              key={`top-${i}`}
              d={`M${i * 50} 0 L${i * 50} 15 L${i * 50 + 15} 15 L${i * 50 + 15} 30 L${i * 50 + 30} 30 L${i * 50 + 30} 15 L${i * 50 + 45} 15 L${i * 50 + 45} 0`}
            />
          ))}
        </g>

        {/* 그리스 키 패턴 - 하단 */}
        <g stroke={ICON_COLORS.GOLD} strokeWidth="2" fill="none" transform="translate(0, 570)">
          {Array.from({ length: 20 }).map((_, i) => (
            <path
              key={`bottom-${i}`}
              d={`M${i * 50} 30 L${i * 50} 15 L${i * 50 + 15} 15 L${i * 50 + 15} 0 L${i * 50 + 30} 0 L${i * 50 + 30} 15 L${i * 50 + 45} 15 L${i * 50 + 45} 30`}
            />
          ))}
        </g>

        {/* 코너 장식 - 좌상단 */}
        <g transform="translate(50, 50)">
          <rect x="0" y="0" width="150" height="150" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
          <rect x="10" y="10" width="130" height="130" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
          <path d="M0 0 L30 30 M150 0 L120 30 M0 150 L30 120 M150 150 L120 120" stroke={ICON_COLORS.GOLD} strokeWidth="1" />
          {/* 중앙 원형 장식 */}
          <circle cx="75" cy="75" r="40" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
          <circle cx="75" cy="75" r="30" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
          {/* 꽃잎 패턴 */}
          {Array.from({ length: 8 }).map((_, i) => (
            <ellipse
              key={i}
              cx="75"
              cy="50"
              rx="8"
              ry="15"
              stroke={ICON_COLORS.GOLD}
              strokeWidth="1"
              fill="none"
              transform={`rotate(${i * 45}, 75, 75)`}
            />
          ))}
        </g>

        {/* 코너 장식 - 우상단 */}
        <g transform="translate(600, 50)">
          <rect x="0" y="0" width="150" height="150" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
          <rect x="10" y="10" width="130" height="130" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
          <circle cx="75" cy="75" r="40" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
          <circle cx="75" cy="75" r="30" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
          {Array.from({ length: 8 }).map((_, i) => (
            <ellipse
              key={i}
              cx="75"
              cy="50"
              rx="8"
              ry="15"
              stroke={ICON_COLORS.GOLD}
              strokeWidth="1"
              fill="none"
              transform={`rotate(${i * 45}, 75, 75)`}
            />
          ))}
        </g>

        {/* 중앙 대형 장식 */}
        <g transform="translate(300, 200)">
          {/* 외곽 원 */}
          <circle cx="100" cy="100" r="150" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
          <circle cx="100" cy="100" r="140" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" fill="none" />
          <circle cx="100" cy="100" r="120" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
          {/* 방사형 선 - 12개 (30도 간격) */}
          {[
            { x2: 250, y2: 100 },    // 0°
            { x2: 229.9, y2: 175 },  // 30°
            { x2: 175, y2: 229.9 },  // 60°
            { x2: 100, y2: 250 },    // 90°
            { x2: 25, y2: 229.9 },   // 120°
            { x2: -29.9, y2: 175 },  // 150°
            { x2: -50, y2: 100 },    // 180°
            { x2: -29.9, y2: 25 },   // 210°
            { x2: 25, y2: -29.9 },   // 240°
            { x2: 100, y2: -50 },    // 270°
            { x2: 175, y2: -29.9 },  // 300°
            { x2: 229.9, y2: 25 },   // 330°
          ].map((pos, i) => (
            <line
              key={i}
              x1="100"
              y1="100"
              x2={pos.x2}
              y2={pos.y2}
              stroke={ICON_COLORS.GOLD}
              strokeWidth="0.5"
            />
          ))}
          {/* 내부 별 패턴 */}
          <path
            d="M100 20 L115 70 L170 70 L125 100 L145 155 L100 125 L55 155 L75 100 L30 70 L85 70 Z"
            stroke={ICON_COLORS.GOLD}
            strokeWidth="1"
            fill="none"
          />
        </g>

        {/* 세로 장식 라인 - 좌 */}
        <g transform="translate(30, 100)">
          <line x1="0" y1="0" x2="0" y2="400" stroke={ICON_COLORS.GOLD} strokeWidth="2" />
          <line x1="8" y1="0" x2="8" y2="400" stroke={ICON_COLORS.GOLD} strokeWidth="1" />
          {/* 장식 마디 */}
          {Array.from({ length: 5 }).map((_, i) => (
            <g key={i} transform={`translate(-10, ${i * 100})`}>
              <rect x="0" y="0" width="28" height="20" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
              <circle cx="14" cy="10" r="5" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
            </g>
          ))}
        </g>

        {/* 세로 장식 라인 - 우 */}
        <g transform="translate(762, 100)">
          <line x1="0" y1="0" x2="0" y2="400" stroke={ICON_COLORS.GOLD} strokeWidth="2" />
          <line x1="8" y1="0" x2="8" y2="400" stroke={ICON_COLORS.GOLD} strokeWidth="1" />
          {Array.from({ length: 5 }).map((_, i) => (
            <g key={i} transform={`translate(-10, ${i * 100})`}>
              <rect x="0" y="0" width="28" height="20" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
              <circle cx="14" cy="10" r="5" stroke={ICON_COLORS.GOLD} strokeWidth="1" fill="none" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
// #endregion

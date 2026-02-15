/*
  파일명: /app/(main)/rest/hegemony/page.tsx
  기능: 패권 게임 페이지
  책임: 셀럽 영향력 카드를 이용한 1:1 전략 대전을 제공한다.
*/

import HegemonyGame from "@/components/features/game/battle/HegemonyGame";
import SectionHeader from "@/components/shared/SectionHeader";
import { getArenaPageTitle, ARENA_SECTION_HEADERS } from "@/constants/arena";

export const metadata = { title: getArenaPageTitle("hegemony") };

const headerInfo = ARENA_SECTION_HEADERS["hegemony"];

export default function Page() {
  return (
    <>
      <SectionHeader
        label={headerInfo.label}
        title={headerInfo.title}
        description={
          <>
            {headerInfo.description}
            {headerInfo.subDescription && (
              <>
                <br />
                <span className="text-text-tertiary text-xs sm:text-sm mt-1 block">
                  {headerInfo.subDescription}
                </span>
              </>
            )}
          </>
        }
      />

      {/* 모바일: 안내 문구 */}
      <div className="flex lg:hidden flex-col items-center justify-center py-20 px-6 text-center">
        <p className="text-text-secondary text-sm">
          패권 게임은 PC 환경에서만 이용할 수 있습니다.
        </p>
        <p className="text-text-tertiary text-xs mt-2">
          데스크톱 브라우저에서 접속해 주세요.
        </p>
      </div>

      {/* PC: 게임 */}
      <div className="hidden lg:block">
        <HegemonyGame />
      </div>
    </>
  );
}

/*
  파일명: /app/(policy)/privacy/page.tsx
  기능: 개인정보처리방침 페이지
  책임: Feel&Note 개인정보 수집 및 이용 내역을 표시한다.
*/

export const metadata = { title: "개인정보처리방침" };

export default function PrivacyPage() {
  return (
    <div className="space-y-10 text-text-primary">
      <header className="space-y-4 border-b border-border pb-6">
        <h1 className="text-3xl font-bold">개인정보 처리방침</h1>
        <p className="text-text-secondary">
          Feel&Note는 회원의 개인정보를 소중히 다루며, 관련 법령을 준수하고 있습니다.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">1. 개인정보의 처리 목적</h2>
        <p className="text-text-secondary leading-relaxed">
          회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
        </p>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
          <li><strong>회원 가입 및 관리</strong>: 회원제 서비스 제공, 개인식별, 가입의사 확인, 심사 및 이용제한 등</li>
          <li><strong>서비스 제공 및 개선</strong>: 문화생활 기록 저장, 맞춤형 콘텐츠 추천, 서비스 기능 개선 등</li>
          <li><strong>고객 문의 처리</strong>: 민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지, 처리결과 통보 등</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">2. 수집하는 개인정보 항목</h2>
        <p className="text-text-secondary leading-relaxed">
          회사는 회원가입 및 서비스 이용 과정에서 아래와 같은 개인정보를 수집할 수 있습니다.
        </p>
        <div className="rounded-lg bg-bg-card/50 p-4 border border-border">
          <ul className="list-disc pl-5 space-y-2 text-text-secondary">
            <li><strong>필수항목</strong>: 이메일 주소, 닉네임, 프로필 이미지 (소셜 로그인 시 제공받는 정보)</li>
            <li><strong>선택항목</strong>: 이용학 문화 콘텐츠 기록(영화, 책, 공연 등), 자기소개 등</li>
            <li><strong>자동 수집 항목</strong>: IP 주소, 쿠키, 접속 로그, 서비스 이용 기록, 기기 정보</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">3. 개인정보의 보유 및 이용기간</h2>
        <p className="text-text-secondary leading-relaxed">
          회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
        </p>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
          <li><strong>회원 탈퇴 시</strong>: 지체 없이 파기 (단, 관계법령에 위반되는 경우 제외)</li>
          <li><strong>관계법령에 따른 보존</strong>: 전자상거래 등에서의 소비자 보호에 관한 법률 등 관련 법령의 규정에 의하여 보존할 필요가 있는 경우</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">4. 개인정보의 파기</h2>
        <p className="text-text-secondary leading-relaxed">
          회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다. 파기 방법은 전자적 파일 형태인 경우 복구 및 재생되지 않도록 기술적인 방법을 이용하여 삭제합니다.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">5. 회원의 권리와 행사 방법</h2>
        <p className="text-text-secondary leading-relaxed">
          회원은 언제든지 개인정보 열람, 정정, 삭제, 처리정지 요구 등의 권리를 행사할 수 있습니다. 이러한 권리 행사는 회사에 대해 서면, 전자우편 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.
        </p>
      </section>

      <footer className="pt-8 border-t border-border">
        <p className="text-sm text-text-secondary">
          공고일자: 2026년 1월 11일<br/>
          시행일자: 2026년 1월 11일
        </p>
      </footer>
    </div>
  );
}

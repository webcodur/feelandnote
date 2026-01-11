/*
  파일명: /app/(policy)/terms/page.tsx
  기능: 이용약관 페이지
  책임: Feel&Note 서비스 이용약관을 표시한다.
*/

export default function TermsPage() {
  return (
    <div className="space-y-10 text-text-primary">
      <header className="space-y-4 border-b border-border pb-6">
        <h1 className="text-3xl font-bold">서비스 이용약관</h1>
        <p className="text-text-secondary">
          이 약관은 Feel&Note 서비스 이용과 관련하여 회사와 회원의 권리, 의무 및 책임사항을 규정합니다.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">제 1 조 (목적)</h2>
        <p className="text-text-secondary leading-relaxed">
          이 약관은 Feel&Note(이하 "회사")가 제공하는 문화생활 기록 및 공유 플랫폼 서비스(이하 "서비스")의 이용조건 및 절차, 회사와 회원의 권리, 의무 및 책임사항 등 기타 필요한 사항을 규정함을 목적으로 합니다.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">제 2 조 (용어의 정의)</h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
          <li>"서비스"라 함은 단말기(PC, 휴대형단말기 등)와 상관없이 회원이 이용할 수 있는 Feel&Note 및 관련 제반 서비스를 의미합니다.</li>
          <li>"회원"이라 함은 서비스에 접속하여 이 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 고객을 말합니다.</li>
          <li>"콘텐츠"라 함은 회원이 서비스상에 게시한 부호, 문자, 음성, 음향, 화상, 동영상 등의 정보 형태의 글, 사진, 동영상 및 각종 파일과 링크 등을 의미합니다.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">제 3 조 (계정 생성)</h2>
        <p className="text-text-secondary leading-relaxed">
          1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입하거나 소셜 로그인(Google, Kakao 등)을 통해 회원가입을 신청합니다.<br/>
          2. 회사는 원칙적으로 이용자의 신청에 대하여 승낙함을 원칙으로 합니다. 다만, 실명이 아니거나 타인의 명의를 이용한 경우 등에는 승낙을 하지 않거나 사후에 이용계약을 해지할 수 있습니다.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">제 4 조 (회원의 의무)</h2>
        <p className="text-text-secondary leading-relaxed">
          회원은 다음 행위를 하여서는 안 됩니다.
        </p>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
          <li>신청 또는 변경 시 허위내용의 등록</li>
          <li>타인의 정보 도용</li>
          <li>회사가 게시한 정보의 변경</li>
          <li>회사 및 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
          <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
          <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">제 5 조 (저작권의 귀속 및 이용제한)</h2>
        <p className="text-text-secondary leading-relaxed">
          1. 회원이 서비스 내에 게시한 게시물의 저작권은 해당 게시물의 저작자에게 귀속됩니다.<br/>
          2. 회원은 서비스를 이용함으로써 얻은 정보를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.<br/>
          3. 회사는 회원이 게시한 콘텐츠를 서비스를 운영, 홍보, 개선하기 위한 목적으로 이용할 수 있습니다.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">제 6 조 (책임 제한)</h2>
        <p className="text-text-secondary leading-relaxed">
          회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다. 또한, 회사는 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않으며, 그 밖의 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.
        </p>
      </section>

      <footer className="pt-8 border-t border-border">
        <p className="text-sm text-text-secondary">
          부칙<br/>
          이 약관은 2026년 1월 11일부터 시행합니다.
        </p>
      </footer>
    </div>
  );
}

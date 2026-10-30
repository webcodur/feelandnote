import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { ORACLE_SERVERS } from '@/lib/oracle-config'

const linkClass = 'inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-accent underline underline-offset-4 hover:bg-bg-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

const guideSections = [
  { id: 'oracle-architecture', label: '서비스 구성' },
  { id: 'oracle-resources', label: '용어와 자원 개수' },
  { id: 'oracle-billing', label: '요금 확인' },
  { id: 'oracle-status', label: '운영 상태 읽기' },
]

function GuideSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4 rounded-xl border border-border bg-bg-card p-4 md:p-6">
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      {children}
    </section>
  )
}

function ReferenceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
      <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="sr-only"> (새 탭)</span>
    </a>
  )
}

const resourceTerms = [
  ['인스턴스 · Instance / VM', '가상 서버 한 대입니다. 웹 화면을 만드는 서버와 데이터를 보관하는 서버를 따로 운영합니다.'],
  ['Shape · OCPU · 메모리', 'Shape는 서버 기종, OCPU는 CPU 처리량의 단위, 메모리는 실행 중인 프로그램의 작업 공간입니다. 메모리와 디스크는 서로 다른 자원입니다.'],
  ['부트 볼륨 · Boot Volume', '운영체제와 파일이 들어 있는 기본 디스크입니다. 두 서버에 하나씩 연결돼 있습니다. 별도 Block Volume은 추가 디스크입니다.'],
  ['VNIC · 공인 IP · 사설 IP', 'VNIC는 가상 네트워크 카드입니다. 공인 IP는 인터넷에서 접근하는 주소, 사설 IP는 내부 통신 주소입니다. 현재 두 서버가 각각 하나씩 사용합니다.'],
  ['VCN · Subnet · Gateway', 'VCN은 서버들이 속한 가상 네트워크, Subnet은 그 안의 주소 구역, Gateway는 외부로 나가는 통로입니다. 서버와 별도로 목록에 나타납니다.'],
  ['보안 목록 · NSG · IAM 정책', '보안 목록과 NSG는 네트워크 통신 허용 규칙입니다. IAM 정책은 사람이나 서버가 오라클 자원을 조회·변경할 수 있는 권한입니다.'],
  ['Software Source', 'OS Management Hub의 운영체제 패키지 저장소입니다. 목록이 많아도 서버가 그만큼 실행 중이라는 뜻이 아닙니다.'],
]

export function OracleServiceGuide() {
  const web = ORACLE_SERVERS.web
  const database = ORACLE_SERVERS.database

  return (
    <section aria-labelledby="oracle-guide-title" className="space-y-4 text-sm leading-7 text-text-secondary">
      <header>
        <h2 id="oracle-guide-title" className="scroll-mt-24 text-xl font-semibold text-text-primary">Oracle 서비스 구성과 사용 안내</h2>
        <p className="mt-2">오라클은 feelandnote의 웹 서버와 데이터베이스 서버를 실행하는 곳입니다. 위 상태판은 서버의 실제 응답과 사용량을 조회하고, 아래 안내는 각 자원의 역할과 확인 방법을 설명합니다.</p>
        <nav aria-label="오라클 안내 목차" className="mt-3 flex flex-wrap gap-2">
          {guideSections.map(({ id, label }) => <a key={id} href={`#${id}`} className={linkClass}>{label}</a>)}
        </nav>
      </header>

      <GuideSection id="oracle-architecture" title="서비스는 이렇게 연결됩니다">
        <ol aria-label="웹 요청이 전달되는 순서" className="grid gap-3 md:grid-cols-3">
          {[
            ['1. 브라우저 → Cloudflare', 'feelandnote.com으로 접속하면 Cloudflare가 HTTPS·방화벽·캐시를 맡습니다. 캐시에 있는 응답은 여기서 바로 돌려줄 수 있습니다.'],
            ['2. 웹 터널 → 웹 서버', '원본 처리가 필요한 요청은 Cloudflare Tunnel을 지나 Caddy로 들어옵니다. Caddy가 Next.js에 전달하고, Next.js가 화면과 응답을 만듭니다.'],
            ['3. 웹 서버 → DB 서버', '데이터가 필요하면 Auth·PostgREST API를 호출합니다. Nginx가 요청을 전달하고, PostgreSQL이 계정·인물·작품·감상 기록을 보관합니다.'],
          ].map(([title, description]) => (
            <li key={title} className="rounded-lg bg-bg-secondary p-4">
              <h4 className="font-semibold text-text-primary">{title}</h4>
              <p className="mt-2">{description}</p>
            </li>
          ))}
        </ol>
        <p>로그인 등 브라우저가 DB API를 직접 부르는 요청도 있습니다. 공개 DB 주소인 <span className="text-text-primary">db.feelandnote.com</span>은 별도의 Cloudflare Tunnel로 DB 서버에 연결됩니다. PostgreSQL 포트를 인터넷에 직접 여는 구성은 아닙니다.</p>

        <div className="grid gap-4 lg:grid-cols-2">
          {[
            { server: web, title: '사용자 웹 서버', role: 'Next.js·Caddy·웹 터널을 실행합니다. 서비스 화면과 검색엔진용 HTML을 만들고, DB API에서 필요한 데이터를 읽습니다.', cpu: `${web.ocpus} OCPU · 기본 CPU ${web.baselinePercent}%`, cost: 'E4 CPU와 메모리는 유료 자원입니다.' },
            { server: database, title: 'DB·로그인 서버', role: 'PostgreSQL·Auth·PostgREST·Nginx를 실행합니다. 데이터를 저장하고 로그인과 데이터 조회를 처리합니다.', cpu: `${database.ocpus} OCPU`, cost: '현재 A1 구성은 최근 사용료 조회에서 무료로 집계됐습니다. 무료 한도와 적용 조건은 계정에서 확인합니다.' },
          ].map(({ server, title, role, cpu, cost }) => (
            <div key={server.name} className="rounded-lg border border-border p-4">
              <h4 className="font-semibold text-text-primary">{title}</h4>
              <p className="mt-1 break-all font-mono text-text-primary">{server.name}</p>
              <p className="mt-2">{role}</p>
              <dl className="mt-3 space-y-1">
                <div><dt className="inline">기종: </dt><dd className="inline break-all">{server.shape}</dd></div>
                <div><dt className="inline">할당: </dt><dd className="inline">{cpu} · 메모리 {server.memoryGB}GB · 부트 디스크 {server.bootVolumeGB}GB</dd></div>
                <div><dt className="inline">공인 IP: </dt><dd className="inline font-mono">{server.address}</dd></div>
              </dl>
              <p className="mt-3">{cost}</p>
            </div>
          ))}
        </div>
        <p>웹의 burstable 설정은 평소 기본 CPU 처리량을 쓰고 필요할 때 일시적으로 더 사용하는 방식입니다. CPU 요금은 기본 비율을 기준으로, 메모리 요금은 할당한 용량을 기준으로 계산됩니다. 지속적인 최대 CPU 성능을 보장하는 설정은 아닙니다.</p>
        <ReferenceLink href="https://docs.oracle.com/en-us/iaas/Content/Compute/References/burstable-instances.htm">Burstable 공식 설명</ReferenceLink>
      </GuideSection>

      <GuideSection id="oracle-resources" title="목록이 많아도 모두 서버는 아닙니다">
        <p>인스턴스 두 대에 디스크·네트워크 카드·공인 IP·사설 IP가 각각 붙으므로, 자원 목록에는 여러 항목으로 나뉘어 보입니다. 네트워크·방화벽·DNS 설정도 따로 표시됩니다.</p>
        <dl className="divide-y divide-border">
          {resourceTerms.map(([term, meaning]) => (
            <div key={term} className="grid gap-1 py-3 md:grid-cols-[15rem_1fr] md:gap-5">
              <dt className="font-semibold text-text-primary">{term}</dt>
              <dd>{meaning}</dd>
            </div>
          ))}
        </dl>
        <div className="rounded-lg bg-bg-secondary p-4">
          <h4 className="font-semibold text-text-primary">배포 슬롯도 서버 개수가 아닙니다</h4>
          <p className="mt-2">웹 서버 안에는 blue·green 두 배포 폴더가 있습니다. current가 지금 서비스할 폴더를 가리키고, 반대 폴더는 직전 정상본을 보관합니다. 배포 때 잠깐 켜는 canary도 같은 VM 안의 검증용 프로세스입니다.</p>
        </div>
        <p>남은 자원인지 확인할 때는 이름보다 연결 상태를 봅니다. 인스턴스의 상태, 부트·추가 볼륨의 연결 대상, 공인 IP의 할당 대상을 함께 확인합니다. 디스크의 AVAILABLE 표시는 사용 중 여부를 뜻하지 않으므로 연결 정보를 별도로 봐야 합니다.</p>
        <ReferenceLink href="https://docs.oracle.com/en-us/iaas/osmh/doc/understand-software-sources.htm">Software Source 공식 설명</ReferenceLink>
      </GuideSection>

      <GuideSection id="oracle-billing" title="사용료와 카드 승인을 구분해서 확인합니다">
        <ol className="list-decimal space-y-3 ps-5">
          <li><span className="font-semibold text-text-primary">서버 목록:</span> Oracle 콘솔의 Compute → Instances에서 춘천 리전과 구획을 확인합니다. 운영 서버 이름은 위 두 개입니다. 구획은 자원을 묶는 폴더 같은 개념입니다.</li>
          <li><span className="font-semibold text-text-primary">실제 사용료:</span> Billing &amp; Cost Management → Cost Analysis에서 조회 기간을 정하고 Service, SKU별로 나눠 봅니다. E4 CPU와 메모리가 각각 다른 항목으로 잡히는 것은 정상입니다. Resource별 조회로 비용이 발생한 서버도 대조할 수 있습니다.</li>
          <li><span className="font-semibold text-text-primary">통화와 최종 청구:</span> 사용료 조회에서 이 계정의 통화는 SGD(싱가포르달러)입니다. 숫자를 원화나 미국달러로 읽지 않습니다. Invoices에서 청구서 금액을 확인하고 세금·환율·카드 수수료와 카드사 매입 내역을 대조합니다.</li>
        </ol>
        <p>최근 확인된 비용은 웹 E4 CPU·메모리에서 발생했습니다. DB A1·디스크·외부 전송·모니터링은 최근 조회에서 0으로 집계됐지만, 자원을 늘리거나 무료 한도를 넘기면 결과가 달라질 수 있습니다. 이 안내의 서버 구성은 실시간 오라클 자원 목록이나 청구서 조회를 대신하지 않습니다.</p>
        <div className="rounded-lg bg-bg-secondary p-4">
          <h4 className="font-semibold text-text-primary">큰 금액이 승인됐다가 바로 취소됐다면</h4>
          <p className="mt-2">오라클은 카드 유효성 확인을 위해 임시 승인을 할 수 있습니다. 유료 전환 때는 미화 100달러 상당을 승인한 뒤 오라클 측에서 즉시 취소한다고 안내합니다. 같은 금액이 반환됐다면 사용료 청구와 구분하고, 카드사에서 취소·매입 상태를 확인합니다. 취소 반영 시간은 카드사마다 다릅니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReferenceLink href="https://cloud.oracle.com/">Oracle 콘솔</ReferenceLink>
          <ReferenceLink href="https://docs.oracle.com/en-us/iaas/Content/Billing/Concepts/costanalysisoverview.htm">Cost Analysis 안내</ReferenceLink>
          <ReferenceLink href="https://docs.oracle.com/en-us/iaas/Content/Billing/Tasks/changingpaymentmethod.htm">카드 임시 승인 안내</ReferenceLink>
        </div>
      </GuideSection>

      <GuideSection id="oracle-status" title="위 운영 상태판은 이렇게 읽습니다">
        <dl className="space-y-4">
          {[
            ['사용자 웹 · 웹 서비스 · DB API · DB 서버', '웹 응답, 웹 프로세스, 데이터 조회 API, PostgreSQL을 각각 확인합니다. 웹은 열려도 DB API가 실패하면 데이터 조회나 로그인이 실패할 수 있습니다.'],
            ['VM 메모리 · 서비스 메모리 · 스왑', 'VM 메모리는 서버 전체, 서비스 메모리는 웹 프로세스 쪽 사용량입니다. 서비스 수치에 파일 캐시가 포함될 수 있으므로 숫자 하나만으로 메모리 누수를 판단하지 않습니다. 스왑은 디스크를 임시 메모리로 사용하는 양입니다.'],
            ['웹·DB 디스크 · 캐시 자동 정리', '디스크는 메모리와 별도로 여유 공간을 봅니다. 캐시 크기는 직전 청소 때 측정한 값이므로 측정 시각도 함께 읽습니다. 웹 캐시 청소는 저장 공간 관리이며 서버나 DB를 지우는 작업이 아닙니다.'],
            ['DB 백업', '실행 설정과 최근 완료 결과를 함께 확인합니다. 백업이 꺼져 있거나 최근 성공 기록이 없는 상태는 DB가 정상 응답한다는 사실과 별개입니다.'],
          ].map(([term, meaning]) => (
            <div key={term}><dt className="font-semibold text-text-primary">{term}</dt><dd className="mt-1">{meaning}</dd></div>
          ))}
        </dl>
        <p>상태판은 화면을 보는 동안 자동 갱신되며, 「다시 확인」으로 즉시 조회할 수 있습니다. SSH 조회 실패는 상태를 읽지 못했다는 뜻이므로, 서버 중단으로 단정하기 전에 공개 웹 응답과 Oracle 콘솔의 인스턴스 상태를 함께 확인합니다.</p>
      </GuideSection>
    </section>
  )
}

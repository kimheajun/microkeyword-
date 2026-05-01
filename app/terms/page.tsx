export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">이용약관</h1>
      <p className="text-sm text-gray-500 mb-8">최종 갱신: 2026-05-01</p>

      <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
        <Section title="1. 서비스 정의">
          본 서비스("마이크로키워드추출기")는 강의 졸업생을 위한 무료 키워드 추출 도구입니다. 네이버 플레이스 URL을 입력하면 자동으로 광고용 키워드를 추출·분류합니다.
        </Section>

        <Section title="2. 이용 자격">
          <ul className="list-disc pl-5 space-y-1">
            <li>강의 졸업생만 가입 및 사용 가능합니다.</li>
            <li>유효한 졸업생 코드 보유자에 한해 가입을 허용합니다.</li>
          </ul>
        </Section>

        <Section title="3. 무료 서비스">
          <ul className="list-disc pl-5 space-y-1">
            <li>본 서비스는 <b>현재 무료로 제공</b>됩니다.</li>
            <li>운영자는 사전 공지 후 서비스 정책·요금·기능을 변경할 권리가 있습니다.</li>
            <li>네이버 검색광고 API 사용에 따른 사용자 본인 계정 비용은 사용자 부담입니다 (보통 무료 한도 내).</li>
          </ul>
        </Section>

        <Section title="4. 사용자 의무">
          <ul className="list-disc pl-5 space-y-1">
            <li>본인 인증 정보 및 API 키는 본인이 관리할 책임이 있습니다.</li>
            <li>자동화 봇·과도한 호출 등으로 서비스 안정성을 해치지 않습니다.</li>
            <li>분석 결과를 광고 외 용도(스팸·기만적 광고 등)로 사용하지 않습니다.</li>
          </ul>
        </Section>

        <Section title="5. 서비스 한계 및 면책">
          <ul className="list-disc pl-5 space-y-1">
            <li>키워드 추출 결과는 네이버 검색광고 API 데이터에 기반하나, 정확성·완전성을 보장하지 않습니다.</li>
            <li>광고 효과·매출 보장 없음. 결과를 활용한 광고 운영의 모든 책임은 사용자에 있습니다.</li>
            <li>외부 API(네이버·카카오·Anthropic) 장애 시 일시적으로 서비스 사용이 어려울 수 있습니다.</li>
          </ul>
        </Section>

        <Section title="6. 서비스 종료">
          운영자는 사전 30일 이상 공지 후 서비스를 종료할 수 있습니다. 종료 시 사용자 데이터는 즉시 삭제됩니다.
        </Section>

        <Section title="7. 약관 변경">
          본 약관은 사전 공지 후 변경될 수 있습니다. 변경 후 계속 사용 시 변경된 약관에 동의한 것으로 간주됩니다.
        </Section>

        <Section title="8. 준거법 및 관할">
          본 약관은 대한민국 법률에 따라 해석되며, 분쟁 시 운영자 소재지 관할 법원을 1심 법원으로 합니다.
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

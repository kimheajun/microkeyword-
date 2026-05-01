export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">개인정보처리방침</h1>
      <p className="text-sm text-gray-500 mb-8">최종 갱신: 2026-05-01</p>

      <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
        <Section title="1. 수집 항목">
          <ul className="list-disc pl-5 space-y-1">
            <li><b>이메일</b>: 가입·로그인용</li>
            <li><b>비밀번호</b>: bcrypt 해시 저장 (평문 저장 안 함)</li>
            <li><b>졸업생 코드</b>: 강의 수강생 검증용</li>
            <li><b>네이버 검색광고 API 키 (Access License, Secret Key, Customer ID)</b>: AES-256-GCM 암호화 저장</li>
            <li><b>분석 요청 기록</b>: 사용량 통계용 (날짜·요청 종류만, 개인 식별 정보 분리)</li>
          </ul>
        </Section>

        <Section title="2. 수집 목적">
          <ul className="list-disc pl-5 space-y-1">
            <li>졸업생 인증 및 무료 도구 제공</li>
            <li>네이버 검색광고 API 호출 (사용자 본인 키로)</li>
            <li>서비스 개선을 위한 익명 사용 통계</li>
          </ul>
        </Section>

        <Section title="3. 보관 기간">
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 정보: 회원 탈퇴 시 즉시 삭제</li>
            <li>분석 결과 캐시: 24시간 후 자동 삭제</li>
            <li>사용 로그: 90일 후 자동 삭제</li>
          </ul>
        </Section>

        <Section title="4. 제3자 제공">
          <ul className="list-disc pl-5 space-y-1">
            <li>본 서비스는 사용자 정보를 <b>제3자에 제공하지 않습니다</b>.</li>
            <li>다만 네이버 검색광고 API · Anthropic Claude API 호출은 사용자가 입력한 키와 분석 요청에 한해 발생합니다.</li>
          </ul>
        </Section>

        <Section title="5. 보안">
          <ul className="list-disc pl-5 space-y-1">
            <li>비밀번호: bcrypt 단방향 해시 (평문 저장 X)</li>
            <li>API 키: AES-256-GCM 암호화 (서버 관리자도 평문 조회 불가)</li>
            <li>세션: HTTP-only secure cookie + JWT 서명 검증</li>
            <li>모든 통신 HTTPS 강제 (배포 환경)</li>
          </ul>
        </Section>

        <Section title="6. 사용자 권리">
          <ul className="list-disc pl-5 space-y-1">
            <li>저장된 정보 열람·정정·삭제 요청 가능 (내 계정 페이지)</li>
            <li>회원 탈퇴 시 모든 정보 즉시 삭제</li>
          </ul>
        </Section>

        <Section title="7. 문의">
          <p>본 방침 관련 문의는 강의 운영자 카카오톡 채널을 통해 가능합니다.</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
      {children}
    </section>
  );
}

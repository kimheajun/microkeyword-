export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 prose prose-sm">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">사용 가이드</h1>
      <p className="text-sm text-gray-500 mb-8">네이버 검색광고 API 키 발급 + 도구 사용법</p>

      <Section num={1} title="네이버 검색광고 계정 가입 (이미 있으면 건너뛰기)">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li><a href="https://searchad.naver.com" target="_blank" className="text-blue-600 underline">searchad.naver.com</a> 접속</li>
          <li>우상단 <b>"신규가입"</b> 클릭 → 사업자 또는 개인 광고주로 가입</li>
          <li>광고비 충전 <b>안 해도</b> 키 발급 가능 (무료)</li>
        </ol>
      </Section>

      <Section num={2} title="API 라이센스 3개 값 발급">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>로그인 후 우상단 본인 이름 → <b>"도구"</b> → <b>"API 사용 관리"</b></li>
          <li><b>"신규 라이센스 발급"</b> 클릭</li>
          <li>다음 3개 값 복사:
            <ul className="list-disc pl-5 mt-1">
              <li><b>Access License</b> (긴 문자열, 약 80자)</li>
              <li><b>Secret Key</b> (base64 형태, 약 50자)</li>
              <li><b>Customer ID</b> (숫자, 보통 7자리)</li>
            </ul>
          </li>
        </ol>
      </Section>

      <Section num={3} title="도구에 키 등록">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li><a href="/dashboard" className="text-blue-600 underline">내 계정 페이지</a> 접속</li>
          <li>3개 값을 각각 입력 후 <b>"저장 + 검증"</b> 클릭</li>
          <li>즉시 1회 테스트 호출됨 → "✓ 검증 완료" 메시지 나오면 끝</li>
        </ol>
        <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm text-emerald-800 mt-3">
          🔒 <b>키는 AES-256-GCM 으로 암호화 저장</b>됩니다. 서버 관리자도 평문으로 볼 수 없습니다.
        </div>
      </Section>

      <Section num={4} title="키워드 추출 사용법">
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li><a href="/" className="text-blue-600 underline">홈</a>으로 이동</li>
          <li>네이버 플레이스 URL 복사 후 입력란에 붙여넣기</li>
          <li><b>"키워드 자동 추출"</b> 클릭 → 약 30~40초 후 결과 표시</li>
          <li>패턴별 필터 + "100개 더 보기"로 전체 키워드 탐색</li>
          <li>같은 업체 24시간 내 재요청 시 캐시에서 즉시 반환 (API 호출 0)</li>
        </ol>
      </Section>

      <Section num={5} title="자주 묻는 질문">
        <div className="space-y-3 text-sm">
          <FAQ q="키 발급에 비용이 드나요?">
            아니요, 네이버 검색광고 광고주 가입과 API 키 발급 모두 무료입니다. 광고비 충전을 하지 않아도 키워드 도구 API는 사용 가능합니다.
          </FAQ>
          <FAQ q="키를 입력하지 않으면 사용 못 하나요?">
            현재 자사 단일 키 폴백이 있어 일부 사용은 가능하지만, 분당 60회 한도를 다른 사용자와 공유하므로 느리거나 실패할 수 있습니다. <b>본인 키 등록을 강력히 권장</b>합니다.
          </FAQ>
          <FAQ q="키가 누출되면 어떻게 되나요?">
            네이버 검색광고 키는 <b>키워드 도구 조회 권한만</b> 있고, 광고 캠페인 생성·수정·결제 권한은 별도 메뉴에서만 작동합니다. 그래도 걱정되면 네이버 콘솔에서 즉시 키 재발급 후 도구에 다시 등록하세요.
          </FAQ>
          <FAQ q="결과는 얼마나 정확한가요?">
            <b>네이버 검색광고 API의 공식 데이터</b>를 그대로 사용하므로 네이버 광고관리자 키워드 도구와 100% 동일한 숫자입니다.
          </FAQ>
        </div>
      </Section>
    </div>
  );
}

function Section({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-3">
        <span className="bg-gray-900 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm">{num}</span>
        {title}
      </h2>
      <div className="ml-9">{children}</div>
    </section>
  );
}

function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="bg-white border border-gray-200 rounded p-3">
      <summary className="font-medium text-gray-900 cursor-pointer">{q}</summary>
      <div className="mt-2 text-gray-700">{children}</div>
    </details>
  );
}

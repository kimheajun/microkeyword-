# 마이크로키워드추출기

강의 졸업생 영업 활동용 무료 도구. 네이버 플레이스 URL을 넣으면 업체 정보·블로그 리뷰를 자동 분석해 광고용 키워드 200~500개를 4 카테고리(지역·업종·목적·히든)로 추출 + 네이버 검색광고 API 실 조회수 검증.

## 기술 스택

- **Frontend/Backend**: Next.js 16 + React 19 + Tailwind 4
- **DB**: Postgres (Neon)
- **인증**: Cookie + JWT (jose)
- **암호화**: AES-256-GCM (BYOK 키 보관)
- **외부 API**:
  - 네이버 검색 API (지역검색·블로그검색)
  - 네이버 검색광고 API (조회수, BYOK)
  - Anthropic Claude (리뷰 분석)

## 핵심 기능

1. URL → 업체 정보 자동 추출
2. 블로그 리뷰 30개 → Claude로 목적·히든 키워드 자동 분류
3. 1번(지역) 필수 + 7 패턴 조합 (1+2, 1+3, 1+4, 1+2+3, 1+2+4, 1+3+4, 1+2+3+4)
4. 네이버 검색광고 API로 PC/모바일/총합 실 조회수 + 경쟁 정도
5. 24h 캐시
6. BYOK (사용자별 네이버 키, 분당 60회 한도 분산)

## 환경변수 (`.env.local`)

```
DATABASE_URL=postgresql://...
SESSION_SECRET=<32바이트 hex>
KEY_ENCRYPTION_KEY=<32바이트 hex>
GRADUATE_CODES=BETA1,BETA2,...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-7
NAVER_SEARCHAD_ACCESS_LICENSE=...   (선택, 자사 폴백 키)
NAVER_SEARCHAD_SECRET_KEY=...
NAVER_SEARCHAD_CUSTOMER_ID=...
```

## 개발

```bash
npm install
npm run dev
```

## 배포 (Vercel)

1. GitHub repo에 push
2. Vercel에서 import
3. 위 환경변수 등록
4. Deploy

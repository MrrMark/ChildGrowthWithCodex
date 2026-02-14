# Child Growth Codex

영유아검진 결과를 누적하여 성장률을 기록하고 기초 예측을 제공하는 TypeScript 단일 스택 프로젝트입니다.

## Stack

- Mobile: React Native + Expo + TypeScript
- API: Fastify + TypeScript
- DB: PostgreSQL (옵션, `DATABASE_URL` 미설정 시 in-memory)
- Shared Types: `@child-growth/shared`

## Quick Start

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
npm run dev:api
```

모바일 실행:

```bash
npm run dev:mobile
```

필수 런타임:

- Node.js 20+
- npm 10+ (또는 호환 워크스페이스 패키지 매니저)

## API Endpoints

- `POST /children`
- `GET /children`
- `POST /children/:childId/checkups`
- `POST /children/:childId/checkups/ocr-parse`
- `POST /children/:childId/checkups/ocr-upload` (multipart file 업로드)
- `GET /children/:childId/growth`
- `GET /children/:childId/prediction`

## PostgreSQL

PostgreSQL을 사용하려면:

```bash
docker compose up -d
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/child_growth npm run dev:api
```

> `DATABASE_URL`이 설정되면 API가 자동으로 PostgreSQL 저장소를 사용하고,
> 설정되지 않으면 in-memory 저장소를 사용합니다.

OCR 제공자(이미지/PDF 처리)를 연결하려면 `apps/api/.env`에 아래를 추가합니다.

```bash
OCR_SPACE_API_KEY=replace-me
OCR_SPACE_ENDPOINT=https://api.ocr.space/parse/image
OCR_SPACE_LANGUAGE=kor
```

- 텍스트 파일(`text/plain`)은 로컬에서 즉시 파싱됩니다.
- PDF/이미지는 OCR.space API로 파싱됩니다.

## Test

```bash
npm test
```

## Integration Check

```bash
npm run verify:db
```

옵션:

- `KEEP_UP=1 npm run verify:db` : 검증 후 Docker 컨테이너 유지
- `API_PORT=4400 npm run verify:db` : API 포트 지정
- `DATABASE_URL=postgresql://... npm run verify:db` : DB URL 덮어쓰기
- `ENABLE_OCR_PROVIDER=1 OCR_SPACE_API_KEY=... npm run verify:db` : 실제 OCR.space 연동 포함

`verify:db`는 성공/실패 케이스를 함께 검증합니다.

- 성공: DB 저장, 성장/예측, `text/plain` OCR 업로드
- 실패: `ocr-upload` 파일 누락(400), 이미지 업로드 시 API 키 누락(400)

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] docker is required for DB integration check."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] node is required."
  exit 1
fi

API_PORT="${API_PORT:-4300}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/child_growth}"
LOG_FILE="${LOG_FILE:-/tmp/child-growth-db-integration.log}"
KEEP_UP="${KEEP_UP:-0}"
ENABLE_OCR_PROVIDER="${ENABLE_OCR_PROVIDER:-0}"

if [[ "$ENABLE_OCR_PROVIDER" == "1" ]]; then
  API_OCR_SPACE_API_KEY="${OCR_SPACE_API_KEY:-}"
  API_OCR_SPACE_ENDPOINT="${OCR_SPACE_ENDPOINT:-https://api.ocr.space/parse/image}"
  API_OCR_SPACE_LANGUAGE="${OCR_SPACE_LANGUAGE:-kor}"
else
  # Default integration run intentionally disables provider to validate failure handling deterministically.
  API_OCR_SPACE_API_KEY=""
  API_OCR_SPACE_ENDPOINT="https://api.ocr.space/parse/image"
  API_OCR_SPACE_LANGUAGE="kor"
fi

cleanup() {
  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" >/dev/null 2>&1; then
    kill "$API_PID" >/dev/null 2>&1 || true
    wait "$API_PID" 2>/dev/null || true
  fi

  if [[ "$KEEP_UP" != "1" ]]; then
    docker compose down >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "[1/9] Starting PostgreSQL container"
docker compose up -d postgres >/dev/null

echo "[2/9] Waiting for PostgreSQL readiness"
for i in {1..40}; do
  if docker compose exec -T postgres pg_isready -U postgres -d child_growth >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [[ "$i" == "40" ]]; then
    echo "[ERROR] PostgreSQL did not become ready in time."
    exit 1
  fi
done

echo "[3/9] Building API"
npm run -w @child-growth/shared build >/dev/null
npm run -w @child-growth/api build >/dev/null

echo "[4/9] Starting API with DATABASE_URL"
DATABASE_URL="$DATABASE_URL" \
PORT="$API_PORT" \
OCR_SPACE_API_KEY="$API_OCR_SPACE_API_KEY" \
OCR_SPACE_ENDPOINT="$API_OCR_SPACE_ENDPOINT" \
OCR_SPACE_LANGUAGE="$API_OCR_SPACE_LANGUAGE" \
node apps/api/dist/server.js >"$LOG_FILE" 2>&1 &
API_PID=$!

for i in {1..40}; do
  if curl -fsS "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [[ "$i" == "40" ]]; then
    echo "[ERROR] API did not become ready in time."
    echo "--- API LOG ---"
    cat "$LOG_FILE"
    exit 1
  fi
done

echo "[5/9] Running DB-backed API scenario"
CHILD_JSON=$(curl -fsS -X POST "http://127.0.0.1:${API_PORT}/children" \
  -H 'Content-Type: application/json' \
  -d '{"name":"DB Integration","birthDate":"2021-01-01","sex":"F"}')
CHILD_ID=$(node -e 'const d=JSON.parse(process.argv[1]); process.stdout.write(d.id);' "$CHILD_JSON")

for row in \
  '2023-01-01,82.0,11.2' \
  '2023-07-01,86.5,12.1' \
  '2024-01-01,90.8,13.3'
do
  IFS=',' read -r DATE HEIGHT WEIGHT <<< "$row"
  curl -fsS -X POST "http://127.0.0.1:${API_PORT}/children/${CHILD_ID}/checkups" \
    -H 'Content-Type: application/json' \
    -d "{\"checkupDate\":\"${DATE}\",\"heightCm\":${HEIGHT},\"weightKg\":${WEIGHT},\"source\":\"manual\"}" >/dev/null
done

DUP_STATUS=$(curl -s -o /tmp/dup_checkup_response.json -w "%{http_code}" -X POST "http://127.0.0.1:${API_PORT}/children/${CHILD_ID}/checkups" \
  -H 'Content-Type: application/json' \
  -d '{"checkupDate":"2024-01-01","heightCm":90.8,"weightKg":13.3,"source":"manual"}')
if [[ "$DUP_STATUS" != "409" ]]; then
  echo "[ERROR] Expected duplicate checkup status=409, got ${DUP_STATUS}"
  cat /tmp/dup_checkup_response.json
  exit 1
fi

PRED_JSON=$(curl -fsS "http://127.0.0.1:${API_PORT}/children/${CHILD_ID}/prediction")
PRED_STATUS=$(node -e 'const d=JSON.parse(process.argv[1]); process.stdout.write(d.prediction.status);' "$PRED_JSON")
if [[ "$PRED_STATUS" != "ok" ]]; then
  echo "[ERROR] Expected prediction.status=ok, got ${PRED_STATUS}"
  echo "$PRED_JSON"
  exit 1
fi

echo "[6/9] Running OCR upload scenario (text/plain local extraction)"
cat > /tmp/ocr-db-sample.txt <<'TXT'
키: 95.1
체중: 14.0
머리둘레: 49.1
TXT

OCR_UPLOAD_JSON=$(curl -fsS -X POST "http://127.0.0.1:${API_PORT}/children/${CHILD_ID}/checkups/ocr-upload" \
  -F 'file=@/tmp/ocr-db-sample.txt;type=text/plain')
OCR_HEIGHT=$(node -e 'const d=JSON.parse(process.argv[1]); process.stdout.write(String(d.parsed.heightCm ?? ""));' "$OCR_UPLOAD_JSON")
if [[ "$OCR_HEIGHT" != "95.1" ]]; then
  echo "[ERROR] Expected parsed.heightCm=95.1, got ${OCR_HEIGHT}"
  echo "$OCR_UPLOAD_JSON"
  exit 1
fi

echo "[7/9] Running OCR upload failure case (missing file)"
NO_FILE_STATUS=$(curl -s -o /tmp/ocr_no_file_response.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:${API_PORT}/children/${CHILD_ID}/checkups/ocr-upload")
if [[ "$NO_FILE_STATUS" != "400" ]]; then
  echo "[ERROR] Expected ocr-upload without file status=400, got ${NO_FILE_STATUS}"
  cat /tmp/ocr_no_file_response.json
  exit 1
fi

echo "[8/9] Running OCR upload failure case (image without OCR_SPACE_API_KEY)"
printf '\x89PNG\r\n\x1a\n' > /tmp/ocr-db-fake.png
NO_KEY_STATUS=$(curl -s -o /tmp/ocr_no_key_response.json -w "%{http_code}" \
  -X POST "http://127.0.0.1:${API_PORT}/children/${CHILD_ID}/checkups/ocr-upload" \
  -F 'file=@/tmp/ocr-db-fake.png;type=image/png')
if [[ "$NO_KEY_STATUS" != "400" ]]; then
  echo "[ERROR] Expected image ocr-upload without key status=400, got ${NO_KEY_STATUS}"
  cat /tmp/ocr_no_key_response.json
  exit 1
fi

if ! grep -q "OCR API key is missing" /tmp/ocr_no_key_response.json; then
  echo "[ERROR] Expected missing OCR API key message in response"
  cat /tmp/ocr_no_key_response.json
  exit 1
fi

echo "[9/9] Completed successfully"
echo "Child ID: ${CHILD_ID}"
echo "Prediction status: ${PRED_STATUS}"

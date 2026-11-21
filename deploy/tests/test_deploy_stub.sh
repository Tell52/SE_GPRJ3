#!/usr/bin/env bash
# ==============================================================================
# Offline check of deploy/deploy.sh (TA shared-cloud version). No GCP access.
# ==============================================================================
# The shared-cloud deploy.sh creates nothing: the portal/TA pre-provisions the
# Cloud SQL instance, secrets, service account, registry, job and service. This
# test runs it with DRY_RUN=1 and a fake `gcloud`/`docker` that FAIL if called,
# then checks the printed plan:
#   - zero real gcloud/docker calls in DRY_RUN
#   - the migration job runs `prisma migrate deploy` then `npm run prisma:seed`
#   - the job gets DATABASE_URL and ADMIN_PASSWORD from Secret Manager only
#   - the service listens on port 3000 and is limited to 1 instance
#   - nothing creates infrastructure or touches project IAM
#   - no password value appears in the output
# HOW TO RUN (repo root):  bash deploy/tests/test_deploy_stub.sh
# ==============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
for tool in gcloud docker; do
  printf '#!/usr/bin/env bash\necho "%s called: $*" >> "%s/real-calls"\nexit 1\n' "$tool" "$TMP" > "$TMP/$tool"
  chmod +x "$TMP/$tool"
done

OUT="$TMP/output"
PATH="$TMP:$PATH" DRY_RUN=1 bash "$ROOT/deploy/deploy.sh" > "$OUT" 2>&1

fail() { echo "FAIL: $1"; cat "$OUT"; exit 1; }
[ ! -e "$TMP/real-calls" ] || fail 'DRY_RUN made a real gcloud/docker call'
grep -q 'run jobs update s9084416c-migrate ' "$OUT" || fail 'migration job not updated'
grep -Fq 'npx\ prisma\ migrate\ deploy\ \&\&\ npm\ run\ prisma:seed' "$OUT" || fail 'wrong migrate/seed command'
grep -Fq 'DATABASE_URL=s9084416c-database-url:latest\,ADMIN_PASSWORD=s9084416c-admin-password:latest' "$OUT" || fail 'job secrets wrong'
grep -q 'run jobs execute s9084416c-migrate .*--wait' "$OUT" || fail 'migration not awaited'
grep -q 'run services update s9084416c .*--port 3000' "$OUT" || fail 'service port is not 3000'
grep -q 'run services update s9084416c .*--max-instances 1' "$OUT" || fail 'max instances not limited'
if grep -Eq 'sql instances create|secrets create|add-iam-policy-binding|services enable' "$OUT"; then
  fail 'script tries to create infrastructure or change IAM'
fi
if grep -Eq -- '--password=[^<]|_PASSWORD=[^s]' "$OUT"; then fail 'a password value may be printed'; fi
echo 'PASS deploy.sh dry run: no GCP calls, correct job, secrets, port and limits'
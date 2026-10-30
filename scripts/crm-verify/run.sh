#!/usr/bin/env bash
# Verify the CRM migrations on a throw-away Postgres.
#
#   scripts/crm-verify/run.sh            build the stand-in schema, apply 0004, 0005 and 0006 (twice),
#                                        run the SQL tests, then tear the cluster down
#   scripts/crm-verify/run.sh --keep     leave the cluster running (prints how to connect)
#   CRM_VERIFY_SKIP_TRACKER=1            skip the invented-tracker import (when applying a real-shaped one through
#   CRM_VERIFY_EXTRA_SQL="a.sql b.sql"   SQL files applied last, in order)
#
# Needs the Postgres 14+ binaries on PATH (Homebrew: postgresql@16). Nothing here touches a real
# database: the cluster lives in a temp folder and listens on 127.0.0.1 only.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
MIGRATIONS="$REPO/drizzle/migrations"
PORT="${CRM_VERIFY_PORT:-54330}"
WORK="${CRM_VERIFY_DIR:-$(mktemp -d)}"
KEEP=0
[ "${1:-}" = "--keep" ] && KEEP=1

# macOS: the postmaster refuses to start with an unset or invalid locale in the environment.
export LC_ALL=C LANG=C

for bin in initdb pg_ctl psql; do
  command -v "$bin" >/dev/null || { echo "Missing $bin on PATH"; exit 2; }
done

PSQL=(psql -h 127.0.0.1 -p "$PORT" -U postgres -X -q -v ON_ERROR_STOP=1)
LOG="$WORK/run.log"

cleanup() {
  if [ "$KEEP" -eq 0 ]; then
    pg_ctl -D "$WORK/pgdata" -m immediate stop >/dev/null 2>&1 || true
    rm -rf "$WORK"
  fi
}
trap cleanup EXIT

echo "== cluster in $WORK on port $PORT"
initdb -D "$WORK/pgdata" -U postgres --auth=trust -E UTF8 --locale=C >/dev/null
pg_ctl -D "$WORK/pgdata" -l "$WORK/server.log" -w \
  -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories='' -c fsync=off" start >/dev/null
"${PSQL[@]}" -d postgres -c "CREATE DATABASE crm_scratch" >/dev/null
PSQL+=(-d crm_scratch)

echo "== stand-in schema"
"${PSQL[@]}" -f "$HERE/stub_schema.sql"

apply() {
  local file="$1"
  echo "== apply $(basename "$file")"
  "${PSQL[@]}" -f "$file" 2>&1 | tee -a "$LOG"
}

apply "$MIGRATIONS/0004_crm_leads.sql"
apply "$MIGRATIONS/0005_crm_handoff_next_step.sql"

LESSONS="$MIGRATIONS/0006_crm_lessons.sql"
if [ -f "$LESSONS" ]; then
  apply "$LESSONS"
else
  echo "== 0006_crm_lessons.sql does not exist yet; the tests below should fail"
fi

echo "== tests (first apply)"
"${PSQL[@]}" -f "$HERE/test_lessons.sql" 2>&1 | tee "$WORK/tests.log"

if [ -f "$LESSONS" ]; then
  apply "$LESSONS"
  echo "== tests (after the second apply)"
  "${PSQL[@]}" -f "$HERE/test_second_apply.sql" 2>&1 | tee -a "$WORK/tests.log"
fi

# The SQL the tracker dry run writes: refuses to commit when its own totals are wrong, then runs once and is repeatable.
if [ -f "$LESSONS" ] && [ -z "${CRM_VERIFY_SKIP_TRACKER:-}" ] && command -v python3 >/dev/null; then
  echo "== tracker import SQL (invented tracker)"
  python3 -I "$HERE/make_tracker_import.py" "$WORK/tracker"
  if "${PSQL[@]}" -f "$WORK/tracker/import_bad.sql" >"$WORK/bad.log" 2>&1; then
    echo "FAIL: an import whose totals are wrong was committed"; exit 1
  fi
  grep -q "Reconciliation failed" "$WORK/bad.log" || { echo "FAIL: the wrong import did not fail on its reconciliation"; cat "$WORK/bad.log"; exit 1; }
  "${PSQL[@]}" -v expect=0 -f "$HERE/test_tracker_import.sql" 2>&1 | tee -a "$WORK/tests.log"
  "${PSQL[@]}" -f "$WORK/tracker/import.sql" 2>&1 | tee -a "$WORK/tests.log"
  grep -q "Reconciliation ok" "$WORK/tests.log" || { echo "FAIL: the import did not report a matching reconciliation"; exit 1; }
  "${PSQL[@]}" -v expect=1 -f "$HERE/test_tracker_import.sql" 2>&1 | tee -a "$WORK/tests.log"
  echo "== second run of import.sql adds nothing"
  "${PSQL[@]}" -f "$WORK/tracker/import.sql" 2>&1 | tee -a "$WORK/tests.log"
  "${PSQL[@]}" -v expect=1 -f "$HERE/test_tracker_import.sql" 2>&1 | tee -a "$WORK/tests.log"
fi

# Optional: SQL files to apply last, in order (space-separated paths), for example an import.sql made from the
# real tracker with invented family phones, followed by a file of SELECTs that prints its totals.
for extra in ${CRM_VERIFY_EXTRA_SQL:-}; do
  echo "== extra: $(basename "$extra")"
  "${PSQL[@]}" -f "$extra" 2>&1 | tee -a "$WORK/tests.log"
done

# Warnings the triggers are expected to raise (psql prints them to stderr, which tee captured).
for expected in "no prepaid session left"; do
  grep -q "$expected" "$WORK/tests.log" || { echo "FAIL: expected a WARNING containing '$expected'"; exit 1; }
done

echo "== all SQL checks passed"
if [ "$KEEP" -eq 1 ]; then
  echo "cluster kept: psql -h 127.0.0.1 -p $PORT -U postgres -d crm_scratch   (stop: pg_ctl -D $WORK/pgdata stop)"
fi

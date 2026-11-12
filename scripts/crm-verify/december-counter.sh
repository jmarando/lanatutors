#!/usr/bin/env bash
# Checks the golden December notes against the SQL counter the team used before the desk existed.
#
#   scripts/crm-verify/december-counter.sh           run the counter on a throw-away Postgres and compare
#   scripts/crm-verify/december-counter.sh --write   rewrite "expected" in the fixture from what the SQL answers
#
# The fixture is scripts/crm-tests/fixtures/december-notes.json. The parser in src/utils/decemberDesk.ts is tested against
# the same file (npm run test:crm), so the parser and the SQL cannot drift apart without one of the two checks failing.
# Needs the Postgres 14+ binaries on PATH (Homebrew: export PATH=/opt/homebrew/bin:$PATH). Nothing here touches a real
# database: the cluster lives in a temp folder and listens on 127.0.0.1 only.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
FIXTURE="$HERE/../crm-tests/fixtures/december-notes.json"
PORT="${DECEMBER_VERIFY_PORT:-54331}"
WORK="$(mktemp -d)"
WRITE=0
[ "${1:-}" = "--write" ] && WRITE=1

# macOS: the postmaster refuses to start with an unset or invalid locale in the environment.
export LC_ALL=C LANG=C
for bin in initdb pg_ctl psql python3; do
  command -v "$bin" >/dev/null || { echo "Missing $bin on PATH"; exit 2; }
done

cleanup() {
  pg_ctl -D "$WORK/pgdata" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

initdb -D "$WORK/pgdata" -U postgres --auth=trust -E UTF8 --locale=C >/dev/null
pg_ctl -D "$WORK/pgdata" -l "$WORK/server.log" -w \
  -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories='' -c fsync=off" start >/dev/null
PSQL=(psql -h 127.0.0.1 -p "$PORT" -U postgres -X -q -v ON_ERROR_STOP=1 -d postgres)

# The one table the counter reads, with the columns it uses, and the fixture's notes as rows.
python3 - "$FIXTURE" > "$WORK/load.sql" <<'PY'
import json, sys
fixture = json.load(open(sys.argv[1]))
print("CREATE TABLE public.lead_activities (id text, family_id uuid NOT NULL, kind text NOT NULL, body text);")
for n in fixture["notes"]:
    body = n["body"].replace("'", "''")
    print(f"INSERT INTO public.lead_activities (id, family_id, kind, body) VALUES ('{n['id']}', '{n['family_id']}', '{n['kind']}', '{body}');")
PY
"${PSQL[@]}" -f "$WORK/load.sql"

# One row per class, in the order of the codes: seats and families are the 3rd and 4th columns.
"${PSQL[@]}" -At -F ',' -f "$HERE/december-count.sql" | cut -d',' -f3,4 > "$WORK/answer.csv"

python3 - "$FIXTURE" "$WORK/answer.csv" "$WRITE" <<'PY'
import json, sys
path, answer, write = sys.argv[1], sys.argv[2], sys.argv[3] == "1"
fixture = json.load(open(path))
rows = [line.split(",") for line in open(answer).read().strip().splitlines()]
if len(rows) != len(fixture["expected"]):
    sys.exit(f"The counter returned {len(rows)} rows, the fixture expects {len(fixture['expected'])}")
got = [{"code": e["code"], "seats": int(r[0]), "families": int(r[1])} for e, r in zip(fixture["expected"], rows)]
if write:
    fixture["expected"] = got
    with open(path, "w") as out:
        json.dump(fixture, out, indent=2)
        out.write("\n")
    print("expected rewritten from the SQL counter")
elif got != fixture["expected"]:
    print("SQL counter says:", got)
    print("fixture expects :", fixture["expected"])
    sys.exit(1)
else:
    print("ok: the SQL counter gives the fixture's totals")
PY

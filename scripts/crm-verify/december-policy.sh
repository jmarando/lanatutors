#!/usr/bin/env bash
# Checks migration 0009 on a throw-away Postgres: who can read December classes before and after it.
#
#   scripts/crm-verify/december-policy.sh
#
# The stand-in is intensive_classes with row level security and the two policies production has for it (read from
# pg_policies on 2026-11-16): anyone reads `active` classes, admins manage all. The check signs in as nobody (anon), as a
# signed-in parent and as an admin, and expects, after 0009, that a running (`confirmed`) class is readable like an
# `active` one, an archived class stays hidden, and nobody but an admin can change a class. 0009 is applied twice, as the
# runner or a hand apply might. Needs the Postgres 14+ binaries on PATH (Homebrew: export PATH=/opt/homebrew/bin:$PATH).
# Nothing here touches a real database: the cluster lives in a temp folder and listens on 127.0.0.1 only.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
MIGRATION="$HERE/../../drizzle/migrations/0009_december_running_classes.sql"
PORT="${DECEMBER_VERIFY_PORT:-54332}"
WORK="$(mktemp -d)"

export LC_ALL=C LANG=C
for bin in initdb pg_ctl psql; do
  command -v "$bin" >/dev/null || { echo "Missing $bin on PATH"; exit 2; }
done
[ -f "$MIGRATION" ] || { echo "FAIL: $MIGRATION does not exist"; exit 1; }

cleanup() {
  pg_ctl -D "$WORK/pgdata" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

initdb -D "$WORK/pgdata" -U postgres --auth=trust -E UTF8 --locale=C >/dev/null
pg_ctl -D "$WORK/pgdata" -l "$WORK/server.log" -w \
  -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories='' -c fsync=off" start >/dev/null
PSQL=(psql -h 127.0.0.1 -p "$PORT" -U postgres -X -q -v ON_ERROR_STOP=1 -d postgres)

"${PSQL[@]}" <<'SQL'
-- Supabase's roles and auth.uid(), as far as these policies need them: the signed-in user comes from a setting.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;

CREATE TYPE public.app_role AS ENUM ('admin', 'tutor', 'student');
CREATE TABLE public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL);
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
INSERT INTO public.user_roles VALUES ('00000000-0000-4000-8000-0000000000ad', 'admin');

CREATE TABLE public.intensive_classes (
  id uuid PRIMARY KEY,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  meeting_link text
);
ALTER TABLE public.intensive_classes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intensive_classes TO anon, authenticated;

-- Production's policies on the table, as pg_policies shows them.
CREATE POLICY "Anyone can view active classes" ON public.intensive_classes FOR SELECT USING (status = 'active');
CREATE POLICY "Admins can manage classes" ON public.intensive_classes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.intensive_classes (id, subject, status) VALUES
  ('c1000000-0000-4000-8000-000000000001', 'Taking reservations', 'active'),
  ('c2000000-0000-4000-8000-000000000002', 'Running', 'confirmed'),
  ('c3000000-0000-4000-8000-000000000003', 'Archived', 'archived');
SQL

# What a role sees: the statuses it can read, sorted and comma-joined.
seen() {
  local role="$1" uid="$2"
  "${PSQL[@]}" -At <<SQL
SET test.uid = '$uid';
SET ROLE $role;
SELECT coalesce(string_agg(status, ',' ORDER BY status), '') FROM public.intensive_classes;
SQL
}

# How many classes a role managed to change.
changed() {
  local role="$1" uid="$2"
  "${PSQL[@]}" -At <<SQL | tail -1
BEGIN;
SET LOCAL test.uid = '$uid';
SET LOCAL ROLE $role;
WITH done AS (UPDATE public.intensive_classes SET subject = subject || '!' RETURNING 1) SELECT count(*) FROM done;
ROLLBACK;
SQL
}

PARENT=00000000-0000-4000-8000-0000000000aa
ADMIN=00000000-0000-4000-8000-0000000000ad
fail=0
check() {
  if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FAIL $1: expected '$3', got '$2'"; fail=1; fi
}

check "before 0009, anyone reads only active classes" "$(seen anon '')" "active"

"${PSQL[@]}" -f "$MIGRATION"
"${PSQL[@]}" -f "$MIGRATION"

check "anyone reads active and running classes, not archived ones" "$(seen anon '')" "active,confirmed"
check "a signed-in parent reads the same" "$(seen authenticated "$PARENT")" "active,confirmed"
check "an admin reads every class" "$(seen authenticated "$ADMIN")" "active,archived,confirmed"
check "nobody signed in can change a class" "$(changed anon '')" "0"
check "a signed-in parent cannot change a class" "$(changed authenticated "$PARENT")" "0"
check "an admin can change every class" "$(changed authenticated "$ADMIN")" "3"
check "one read policy for everyone remains" "$("${PSQL[@]}" -At -c "SELECT count(*) FROM pg_policies WHERE tablename = 'intensive_classes' AND cmd = 'SELECT'")" "1"

if [ "$fail" -ne 0 ]; then
  echo "december-policy: FAILED"
  exit 1
fi
echo "december-policy: all checks passed"

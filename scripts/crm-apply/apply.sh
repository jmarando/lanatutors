#!/usr/bin/env bash
# Apply a drizzle migration to the lanatutors database and record it, so a later
# Lovable/drizzle sync sees it as done.
#
#   LOVABLE_DB_MIGRATION_URL='postgresql://...' scripts/crm-apply/apply.sh
#   scripts/crm-apply/apply.sh --verify        # check only, change nothing
#   scripts/crm-apply/apply.sh --print-record  # the INSERT to run by hand
#
# It applies 0004_crm_leads by default. For a later migration set its tag:
#   CRM_MIGRATION_TAG=0006_crm_lessons scripts/crm-apply/apply.sh --print-record
#
# The URL can also live in ~/.config/lanatutors/db-url (chmod 600). Never put it
# in .env: that file is tracked by git.
set -euo pipefail

REF="iccemuiqcdumgxiwxzdq"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TAG="${CRM_MIGRATION_TAG:-0004_crm_leads}"
MIGRATION="$ROOT/drizzle/migrations/$TAG.sql"
JOURNAL="$ROOT/drizzle/migrations/meta/_journal.json"

URL="${LOVABLE_DB_MIGRATION_URL:-}"
if [[ -z "$URL" && -f "$HOME/.config/lanatutors/db-url" ]]; then
  URL="$(tr -d '[:space:]' < "$HOME/.config/lanatutors/db-url")"
fi

if [[ "${1:-}" == "--print-record" ]]; then
  :
elif [[ -z "$URL" ]]; then
  cat >&2 <<'MSG'
No connection string found.

Set it for one command:
  LOVABLE_DB_MIGRATION_URL='postgresql://...' scripts/crm-apply/apply.sh
or keep it outside the repo:
  mkdir -p ~/.config/lanatutors && printf '%s' 'postgresql://...' > ~/.config/lanatutors/db-url
  chmod 600 ~/.config/lanatutors/db-url

In Lovable: Cloud -> Database -> Connection string (session pooler). It contains
the project ref. Do not put it in .env, which is tracked here.
MSG
  exit 2
fi

if [[ -n "$URL" && "${CRM_ALLOW_ANY_DB:-}" != "1" && "$URL" != *"$REF"* ]]; then
  echo "Refusing to run: the connection string does not name the lanatutors project ($REF)." >&2
  echo "Set CRM_ALLOW_ANY_DB=1 only for a scratch database." >&2
  exit 2
fi

HASH="$(shasum -a 256 "$MIGRATION" | awk '{print $1}')"
WHEN="$(python3 - "$JOURNAL" "$TAG" <<'PY'
import json, sys
journal = json.load(open(sys.argv[1]))
entry = next(e for e in journal["entries"] if e["tag"] == sys.argv[2])
print(entry["when"])
PY
)"

RECORD_SQL="
create schema if not exists drizzle;
create table if not exists drizzle.__drizzle_migrations (
  id serial primary key,
  hash text not null,
  created_at bigint
);
insert into drizzle.__drizzle_migrations (hash, created_at)
select '$HASH', $WHEN
where not exists (select 1 from drizzle.__drizzle_migrations where hash = '$HASH');
"

VERIFY_SQL_0004="
select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname in ('families','leads','lead_activities','crm_settings')) as tables,
  (select count(*) from pg_trigger where not tgisinternal and tgname like 'crm_%') as triggers,
  (select count(*) from pg_policies where schemaname = 'public'
     and tablename in ('families','leads','lead_activities','crm_settings')) as policies,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('crm_normalize_phone','crm_upsert_family','crm_open_lead',
                         'crm_record_assessment_booking','crm_create_lead','crm_team_members',
                         'crm_set_default_owner','crm_families_normalize_phone')) as functions,
  (select count(*) from public.families) as families,
  (select count(*) from public.leads) as leads,
  (select count(*) from public.lead_activities) as activities,
  (select count(*) from public.whatsapp_conversations where family_id is not null) as chats_linked,
  (select count(*) from public.consultation_bookings where family_id is not null) as calls_linked;
"

# Expected after 0006: tables 3, views 2, triggers 6, policies 3, functions 5.
VERIFY_SQL_0006="
select
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname in ('enrolments','session_packs','lesson_reports')) as tables,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'v' and c.relname in ('crm_enrolment_balances','crm_lessons')) as views,
  (select count(*) from pg_trigger where not tgisinternal and tgname in
     ('crm_bookings_before_insert','crm_lesson_reports_before_insert','crm_lesson_reports_before_update',
      'crm_lesson_reports_after_delete','crm_session_packs_before_insert','crm_session_packs_after_insert')) as triggers,
  (select count(*) from pg_policies where schemaname = 'public'
     and tablename in ('enrolments','session_packs','lesson_reports')) as policies,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('crm_tutor_share','crm_norm_text','crm_ensure_family_for_user','crm_ensure_enrolment','crm_record_payment')) as functions,
  (select lessons_from from public.crm_settings where id) as lessons_from,
  (select count(*) from public.enrolments) as enrolments,
  (select count(*) from public.bookings where enrolment_id is not null) as bookings_linked;
"
case "$TAG" in
  0006_crm_lessons) VERIFY_SQL="$VERIFY_SQL_0006" ;;
  *) VERIFY_SQL="$VERIFY_SQL_0004" ;;
esac

if [[ "${1:-}" == "--print-record" ]]; then
  echo "$RECORD_SQL"
  exit 0
fi

mask() { sed -E 's#(://[^:]+:)[^@]+@#\1***@#; s#(password=)[^&]+#\1***#' <<<"$1"; }
echo "Target: $(mask "$URL")"
echo "Migration: $MIGRATION"
echo "Hash: $HASH  (journal when: $WHEN)"

run() { psql "$URL" -X -v ON_ERROR_STOP=1 "$@"; }

if [[ "${1:-}" == "--verify" ]]; then
  run -c "$VERIFY_SQL"
  exit 0
fi

echo
echo "Before:"
run -At -c "select to_regclass('public.families') is not null as crm_present;"

if run -At -c "select exists (select 1 from drizzle.__drizzle_migrations where hash = '$HASH');" 2>/dev/null | grep -qx t; then
  echo "Already recorded as applied. Nothing to do."
  run -c "$VERIFY_SQL"
  exit 0
fi

echo
echo "Applying in one transaction..."
run --single-transaction -f "$MIGRATION" -c "$RECORD_SQL"

echo
echo "After:"
run -c "$VERIFY_SQL"

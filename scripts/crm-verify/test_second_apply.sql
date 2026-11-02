-- T18 (plan case 7): applying 0006 a second time adds no rows and changes no balances.
-- Runs after test_lessons.sql, which stored the state in crm_test.snapshot, and after the second apply.
\set ON_ERROR_STOP on

DO $$
DECLARE s crm_test.snapshot; n record;
BEGIN
  SELECT * INTO s FROM crm_test.snapshot;
  SELECT
    (SELECT count(*) FROM public.enrolments) AS enrolments,
    (SELECT count(*) FROM public.session_packs) AS packs,
    (SELECT coalesce(sum(sessions_used), 0) FROM public.session_packs) AS used,
    (SELECT count(*) FROM public.lesson_reports) AS reports,
    (SELECT coalesce(sum(tutor_pay_kes), 0) FROM public.lesson_reports) AS pay,
    (SELECT coalesce(sum(balance), 0) FROM public.crm_enrolment_balances) AS balance,
    (SELECT count(*) FROM public.bookings WHERE enrolment_id IS NOT NULL) AS linked,
    (SELECT lessons_from FROM public.crm_settings WHERE id) AS lessons_from,
    (SELECT count(*) FROM public.families) AS families
  INTO n;
  PERFORM crm_test.assert(n.enrolments = s.enrolments, 'T18 enrolments unchanged');
  PERFORM crm_test.assert(n.packs = s.packs AND n.used = s.used, 'T18 packs unchanged');
  PERFORM crm_test.assert(n.reports = s.reports AND n.pay = s.pay, 'T18 reports and pay unchanged');
  PERFORM crm_test.assert(n.balance = s.balance, 'T18 balances unchanged');
  PERFORM crm_test.assert(n.linked = s.linked AND n.families = s.families, 'T18 links and families unchanged');
  PERFORM crm_test.assert(n.lessons_from = s.lessons_from, 'T18 the cut-over is not reset by a second apply');

  -- The behaviour still works after the second apply.
  PERFORM crm_test.assert(public.crm_tutor_share() = 0.70, 'T18 constants intact');
  PERFORM crm_test.assert((SELECT count(*) FROM pg_trigger WHERE tgrelid = 'public.lesson_reports'::regclass AND NOT tgisinternal) = 3,
    'T18 exactly three triggers on lesson_reports (insert, update guard, delete), got '
    || (SELECT count(*) FROM pg_trigger WHERE tgrelid = 'public.lesson_reports'::regclass AND NOT tgisinternal));
  PERFORM crm_test.assert((SELECT count(*) FROM pg_trigger WHERE tgrelid = 'public.bookings'::regclass AND tgname = 'crm_bookings_before_insert') = 1,
    'T18 one CRM trigger on bookings');
  PERFORM crm_test.assert((SELECT count(*) FROM pg_trigger WHERE tgrelid = 'public.session_packs'::regclass AND NOT tgisinternal) = 4,
    'T18 four triggers on session_packs (default rate, late payment pickup, correction guard, removal guard), got '
    || (SELECT count(*) FROM pg_trigger WHERE tgrelid = 'public.session_packs'::regclass AND NOT tgisinternal));
  RAISE NOTICE 'T18 ok';
END $$;

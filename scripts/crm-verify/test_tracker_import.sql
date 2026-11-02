-- The SQL that scripts/crm-import/tracker_dry_run.py writes, applied to the scratch database by run.sh.
-- Called with :expect = 0 (nothing imported yet: the import that reconciles wrongly rolled back) or
-- :expect = 1 (imported once, and still the same after a second run).
\set ON_ERROR_STOP on

-- psql does not substitute variables inside a dollar-quoted block, so hand the flag over as a setting.
SELECT set_config('crm_test.expect', :'expect', false) \gset

DO $$
DECLARE
  n int; paid numeric; used numeric; pay numeric; outstanding numeric; e record; packs int;
  expect_rows boolean := current_setting('crm_test.expect') = '1';
BEGIN
  SELECT count(*), coalesce(sum(amount_kes), 0), coalesce(sum(sessions_used), 0)
  INTO n, paid, used FROM public.session_packs WHERE notes LIKE 'tracker import row %';

  IF NOT expect_rows THEN
    PERFORM crm_test.assert(n = 0 AND NOT EXISTS (SELECT 1 FROM public.families WHERE parent_name LIKE 'Family _'),
      'T21 an import that does not reconcile leaves nothing behind');
    RAISE NOTICE 'T21 ok (rolled back)';
    RETURN;
  END IF;

  -- Every row with money or sessions made one pack: 11 lines minus the empty one, plus the split.
  PERFORM crm_test.assert(n = 10, 'T22 ten packs were written, got ' || n);
  PERFORM crm_test.assert(paid = 89325, 'T22 paid adds up to 89,325, got ' || paid);
  PERFORM crm_test.assert(used = 33, 'T22 sessions taken add up to 33 (half sessions kept), got ' || used);

  SELECT coalesce(sum(opening_tutor_pay_kes), 0), coalesce(sum(opening_tutor_pay_kes - coalesce(opening_tutor_paid_kes, 0)), 0)
  INTO pay, outstanding FROM public.enrolments en
  WHERE EXISTS (SELECT 1 FROM public.session_packs p WHERE p.enrolment_id = en.id AND p.notes LIKE 'tracker import row %');
  PERFORM crm_test.assert(pay = 47635, 'T22 tutor pay adds up to 47,635, got ' || pay);
  PERFORM crm_test.assert(outstanding = 6650, 'T22 outstanding adds up to 6,650, got ' || outstanding);

  -- A top-up on the same child, subject and tutor is a second pack on one enrolment.
  SELECT en.id, en.opening_tutor_pay_kes INTO e FROM public.enrolments en JOIN public.families f ON f.id = en.family_id
  WHERE f.parent_name = 'Family D';
  PERFORM crm_test.assert(e.id IS NOT NULL AND e.opening_tutor_pay_kes = 7350 + 2450, 'T22 family D has one enrolment holding both payments');
  SELECT count(*) INTO packs FROM public.session_packs WHERE enrolment_id = e.id;
  PERFORM crm_test.assert(packs = 2, 'T22 and two packs');

  -- The tutor was found through the phone list, and a line with no numbers still made its enrolment.
  PERFORM crm_test.assert((SELECT tutor_id FROM public.enrolments WHERE student_name = 'Child A1') = crm_test.id(31), 'T22 Tutor Alpha was found by phone');
  PERFORM crm_test.assert((SELECT tutor_id FROM public.enrolments WHERE student_name = 'Child B2') = crm_test.id(32), 'T22 Tutor Beta was found by phone');
  PERFORM crm_test.assert(EXISTS (SELECT 1 FROM public.enrolments WHERE student_name = 'Child C2' AND subject = 'Art')
    AND NOT EXISTS (SELECT 1 FROM public.session_packs p JOIN public.enrolments en ON en.id = p.enrolment_id WHERE en.student_name = 'Child C2'),
    'T22 the empty line kept its enrolment and made no pack');
  PERFORM crm_test.assert((SELECT count(*) FROM public.families WHERE parent_name LIKE 'Family _' AND status = 'active') = 5, 'T22 families that paid are active');

  -- The over-used and half-session lines are kept as the sheet has them.
  PERFORM crm_test.assert((SELECT sessions_left FROM public.crm_enrolment_balances WHERE student_name = 'Child B2') = 0.5, 'T22 half a session left on the 3.5 of 4 line');
  PERFORM crm_test.assert((SELECT sessions_left FROM public.crm_enrolment_balances WHERE student_name = 'Child C1' AND subject = 'Science') = -1, 'T22 one session over on the line that took 5 of 4');

  -- Nobody has lessons against these yet, so the credit is exactly the tracker's formula: paid minus taken x rate.
  PERFORM crm_test.assert((SELECT sum(balance) FROM public.crm_enrolment_balances b WHERE b.family_name LIKE 'Family _') =
    89325 - (1450 * 3.5 + 3500 * 3 + 3500 * 1 + 3500 * 6 + 1000 * 5 + 1800 * 5 + 1500 * 4 + 1450 * 5.5),
    'T22 credit held follows the tracker formula, got ' || (SELECT sum(balance) FROM public.crm_enrolment_balances b WHERE b.family_name LIKE 'Family _'));
  RAISE NOTICE 'T22 ok';
END $$;

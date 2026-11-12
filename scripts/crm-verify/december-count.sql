-- December 2026 classes: reservations per class. READ-ONLY (a single SELECT).
-- Run it read-only in any SQL editor on the database; scripts/crm-verify/december-counter.sh runs it on a throw-away copy.
--
-- How seats are counted: the team adds ONE note per child per class on the family's timeline in the CRM.
-- A note that starts with DEC26 and lists class codes counts one seat for each code, for example:
--     DEC26 F3-MATHS F3-ENG - Amani
-- To take a seat back, add a note: DEC26 CANCEL F3-ENG
-- Codes: F3-MATHS F3-CHEM F3-ENG (Form 3) and G8-MATHS G8-SCI G8-ENG (Grade 8).
-- Only timeline notes count (kind = 'note'). WhatsApp copies and calls are ignored.

WITH notes AS (
  SELECT family_id, body
  FROM public.lead_activities
  WHERE kind = 'note'
    AND body ~* '^\s*DEC26\M'
),
codes (ord, code, label, grp) AS (
  VALUES
    (1, 'F3-MATHS', 'Mathematics',        'Form 3 (KCSE 2027)'),
    (2, 'F3-CHEM',  'Chemistry',          'Form 3 (KCSE 2027)'),
    (3, 'F3-ENG',   'English',            'Form 3 (KCSE 2027)'),
    (4, 'G8-MATHS', 'Mathematics',        'Grade 8 (KJSEA 2027)'),
    (5, 'G8-SCI',   'Integrated Science', 'Grade 8 (KJSEA 2027)'),
    (6, 'G8-ENG',   'English',            'Grade 8 (KJSEA 2027)')
),
tally AS (
  SELECT c.ord, c.grp, c.label,
         count(*) FILTER (WHERE n.body !~* 'DEC26\s+CANCEL' AND n.body ~* ('\m' || c.code || '\M')) AS reserved,
         count(*) FILTER (WHERE n.body  ~* 'DEC26\s+CANCEL' AND n.body ~* ('\m' || c.code || '\M')) AS taken_back,
         count(DISTINCT n.family_id) FILTER (WHERE n.body !~* 'DEC26\s+CANCEL' AND n.body ~* ('\m' || c.code || '\M')) AS families
  FROM codes c
  LEFT JOIN notes n ON true
  GROUP BY c.ord, c.grp, c.label
)
SELECT grp AS "group",
       label AS class,
       reserved - taken_back AS seats,
       families,
       greatest(6 - (reserved - taken_back), 0) AS still_needed,
       CASE WHEN reserved - taken_back >= 6 THEN 'OPENS'
            ELSE 'needs ' || greatest(6 - (reserved - taken_back), 0) || ' more' END AS status
FROM tally
ORDER BY ord;

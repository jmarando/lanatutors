# Call-log dry run

One-off helper that turns the team's **Client Call Tracking** sheet into a
reviewed list and a SQL import for the CRM leads slice. It never writes to the
database by itself: you review the CSV, then run the SQL by hand.

## Run it

```bash
python3 -I call_log_dry_run.py "<path to call log.xlsx>" ./out
```

`.csv` works too, which is handy for trying a small fixture without a
spreadsheet. Only the Python standard library is used, so `-I` is safe.

The first run writes two files into `./out`:

| File | What it is |
|---|---|
| `review.csv` | One row per call. Cleaned phone, proposed stage, proposed next step, flags, and an empty `decision` column. |
| `import.sql` | SQL that loads every reviewed row into `families`, `leads` and `lead_activities`. |

### Reviewing

Open `review.csv` in a spreadsheet and work down it:

1. **`decision`** — every row whose status was Resolved needs `won` or `lost`.
   Rows with no decision are skipped by `import.sql` and listed at the end.
   The generated SQL uses `went_elsewhere` as the lost reason; edit the
   `update public.leads ... lost_reason` line if the real reason is price,
   timing or no reply.
2. **`flags`** — anything the script could not settle:
   - a phone number that is missing or too short;
   - a date it could not read, or one outside the sheet's period;
   - a date that could plausibly be day-first or month-first;
   - a phone number that appears on more than one row;
   - a Resolved row with no decision.
3. **`proposed_stage`** — check the mapping:
   - Open / No Answer / Pending → `new`
   - In Progress / Escalated → `contacted`
   - notes that mention a booked or held assessment call → `call_booked` or `call_done`
   - Resolved → decided by hand
4. **`next_step` and `next_step_at`** — the sheet's follow-up date wins when
   there is one. Otherwise the call date plus a day is used, so no imported
   lead lands in limbo. Adjust dates that are clearly stale.

Then rebuild the SQL from the reviewed file:

```bash
python3 -I call_log_dry_run.py ./out/review.csv ./out --from-review
```

## Running `import.sql`

Run it once, in the Supabase SQL editor (or as `service_role`), **after**
`drizzle/migrations/0004_crm_leads.sql` has been applied. The editor's role can
call `crm_upsert_family` and `crm_open_lead`; `anon` and `authenticated`
cannot.

What it does, per phone number:

1. `crm_upsert_family` finds the family by phone, or creates it.
2. `crm_open_lead` returns the family's open lead, or creates one with channel
   `import`. A family that already wrote on WhatsApp keeps its WhatsApp lead;
   the call notes join it.
3. Each call is inserted as a `call` activity with `source_table =
   'crm_import_call_log'` and a stable `source_id`, so running the file twice
   adds no duplicate notes.
4. The lead takes the stage of its **latest** call and that call's next step.
   Resolved families close as Won or Lost.

Safe to run twice, and wrapped in one transaction: a failure leaves nothing
half-imported.

## Things it deliberately does not do

- It does not touch payments, packs or tutor pay. That is the tracker import in
  the next slice.
- It does not merge families. Two spellings of the same parent with different
  phone numbers stay two families; merge them in the CRM afterwards.
- It does not invent a lost reason beyond `went_elsewhere`.
- It keeps all personal data out of the repository: the sheet and the `out`
  folder live outside the code.

# Payment tracker dry run (lessons slice)

`tracker_dry_run.py` does for the team's **multi-student payment tracker** what the call-log script does for
the call log: it turns the sheet into a reviewed list and a SQL import, and never writes to the database
itself. The import needs `drizzle/migrations/0006_crm_lessons.sql` (enrolments, session packs, opening tutor pay).

## Run it

```bash
python3 -I tracker_dry_run.py "<path to the tracker.xlsx>" ./tracker-out --check
```

- `.csv` works too (same columns), which is how the tests run it on an invented sheet.
- The workbook's **Tutors** sheet gives the tutor name and phone list. For a CSV, pass `--tutors tutors.csv`.
- `--check` exits with 1 when the totals differ from the targets. `--expect paid=..,taken=..,pay=..,outstanding=..`
  changes the targets (default: the audit's KES 110,925 paid, 59 sessions taken, KES 66,535 tutor pay, KES 3,150 outstanding).
- Tests: `python3 -I -m unittest discover -s scripts/crm-import -p "test_*.py"`.

## What it does with each line

A **line** is one child, one subject and one tutor under a parent. Each becomes one review row, with:

- the amount, reference, rate (the typed one, else amount ÷ sessions paid), sessions paid and taken;
- **tutor pay = rate × sessions taken × 70%**, the tracker's own formula, and what was already paid
  (the whole line when its status is Paid; none when Pending or Partially Paid, because the sheet does not say how much was sent);
- the tutor's phone, found in the Tutors sheet when every word of the name matches exactly one person.

Things it decides for you, and flags so you can check:

| Case | What it does |
|---|---|
| A line lists several subjects with counts, `Maths(3), English(2)`, and the counts add up to the sessions taken | Splits it into one row per subject (tutors paired in order, or the one tutor), sharing amount and sessions paid by the counts, so the totals do not move |
| Counts that do not add up, no counts, or tutors that cannot be paired | Leaves it as one row, flagged: split it by hand in `review.csv` |
| Sessions paid is blank | Sets it to the sessions taken, or to amount ÷ rate when nothing was taken, so the pack is valid. Money and balances are unchanged |
| Sessions taken exceeds sessions paid | Keeps it (the family owes), flagged |
| Half sessions (3.5) | Kept: the packs hold fractions |
| No money or sessions on the line | Still makes the child and subject, with no pack |
| A **continuation line**: money and sessions but no student, tutor or subject | Held back until you set `decision` to `attach`; proposed as another payment on the line above |

## Reviewing

Open `review.csv` and work down it:

1. **`family_phone`** (or **`family_id`** for an existing family): the sheet has no parent phones, so each family is matched by hand.
   Rows with neither are skipped and listed at the end of `import.sql`.
2. **`decision`**: `attach` for a continuation line; `skip` to leave any row out.
3. **`flags`**: read every one. Fix `tutor_phone` or `tutor_profile_id` where a tutor was not found.
4. Edit amounts, sessions or subjects freely; `--from-review` recomputes the totals from the file.

```bash
python3 -I tracker_dry_run.py ./tracker-out/review.csv ./tracker-out --from-review
```

The summary prints the totals against the targets. **Do not import until they agree, or you know why they do not.**

## Running `import.sql`

Once, at the cut-over, **after** migration 0006 is applied and **before** anyone confirms a lesson for these families
(confirming a lesson changes the sessions used and would fail the reconciliation).

It runs in one transaction. For each row it finds or creates the family (by phone), the enrolment (same child, subject
and tutor, so a top-up becomes a second pack on one enrolment) and the pack, with `paid_on` empty because the sheet has
no payment dates, and adds the tutor pay and references to the enrolment's opening fields for the payouts slice.
Each pack is marked `tracker import row N part M`, so running the file twice adds nothing.

At the end it **adds up what it wrote and raises an exception if that differs from the review**, so a bad import keeps nothing.
That check counts every pack marked `tracker import row ...`, so keep to one import per database. To redo one,
delete those packs and clear `opening_tutor_*` on their enrolments first.

## Known limits

- The sheet's own "sessions paid" total will not equal the packs' total when blank cells were filled in; the summary shows the packs' figure.
- A Partially Paid line counts wholly as outstanding until the payouts slice records the transfers.
- Tutors typed as a list ("A, B") are not matched to tutor accounts; split the line and set `tutor_phone`.
- Nothing here merges families. The same parent spelled two ways with different phones becomes two families.

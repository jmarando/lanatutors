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

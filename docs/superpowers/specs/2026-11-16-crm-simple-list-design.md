# CRM, simpler: one list and a panel, inside the admin dashboard

Date: 2026-11-16. Status: the approach ("One list and a panel") and the look (a mockup: a counts band, quick filters, one list
of families, a slide-out panel with Call, WhatsApp and four tabs) were approved by the owner in chat on 2026-11-16. This
document is waiting for the owner's approval. Nothing is built.

## Why

The owner: the CRM "looks scary going in". They showed two screenshots of a lead tool they find easy (a band of three counts,
one clean list with call and WhatsApp buttons on each row, and a panel that slides out with the lead's details, big Call and
WhatsApp buttons and tabs), and asked that the CRM live inside the admin dashboard, under its CRM menu item, not as a separate
app at `/admin`.

Today `/admin` opens "Lana CRM", an app with its own left menu (Today, Leads, Lessons, December, More). Its first screen,
Today, is eight cards, most of them empty most of the time. A family is a long page of forms: stage, owner, next step, the
child, sessions and payments, progress, the assessment call, the timeline. The admin dashboard the team knew moved to
`/admin/more`, and its CRM item jumps out to `/admin`.

Success: someone on the team opens the admin, clicks CRM, sees who needs them, and calls or WhatsApps a family in one click,
without being put off by what they see.

## What the team sees

```
Admin menu (as today)          CRM                                     [search…]  [+ Add lead]
  Parents & Students           ┌ NEW 12 ──────┐ ┌ IN PROGRESS 18 ┐ ┌ WON THIS MONTH 3 ┐   (dark band)
    Consultations              └ +4 this week ┘ └ 2 due today ───┘ └ 5 last month ────┘
    CRM            (2)         [All open 30] [Needs a reply 2] [Overdue 4] [Call booked 7] [Top-up due 1] [Mine] [Won and lost]
    Lessons        (2)         FAMILY                   STAGE        NEXT STEP                 CAME IN        OWNER  REACH OUT
    …                          Mrs Kamau                New          Reply on WhatsApp         2 hours ago    —      📞 💬
  Programs                       Amani · Form 3 Maths                                          WhatsApp
    December desk              Mr Otieno                Contacted    Call · Tue 18 Nov         Yesterday      Ivy    📞 💬
    …                            Baraka · Grade 8 Sci                                          Website
```

Clicking a row slides a panel in from the right (full screen on a phone):

```
Mrs Achieng                                   ✕
Zuri · IGCSE English · Year 10
[STAGE Call booked] [CAME IN WhatsApp] [OWNER Paul]
[ 📞 Call ]  [ 💬 WhatsApp ]
( Info | Follow-up | Payments | History )
```

The numbers above are made up.

## Goals

- The CRM opens inside the admin dashboard, from its CRM menu item; `/admin` is the admin dashboard again.
- The first CRM screen is one list of families with three counts and a few quick filters, and nothing else.
- Every family opens in a panel with Call and WhatsApp at the top and four tabs that hold everything the family page holds today.
- Everything the team can do today stays possible.
- Old links keep working.

## Non-goals

- New data, new fields, a lead score, or any database change.
- Changing how leads are created (WhatsApp, the booking form, Lana's in-chat booking, + Add lead) or the CRM's rules (stages,
  the next-step rule, top-ups, payments).
- Restyling the rest of the admin dashboard.
- Changing the December desk or the Lessons screen beyond moving them into the dashboard.

## Anti-goals (a failure even if the code works)

1. Something the team can do today (log a call, set the next step, record or correct a payment, change a tutor, confirm a
   lesson, add December seats, mark won or lost, add a note) is no longer reachable.
2. A link that worked (`/admin/families/<id>`, `/admin/leads`, `/admin/lessons`, `/admin/december`, `/admin/more`) lands
   nowhere.
3. A failed read shows an empty list or zero counts instead of an error with a retry.
4. The panel shows one family's details under another family's name (for example after clicking two rows quickly).
5. The other admin tabs change how they behave.

## Constraints

- No database migration and no edge function change: the screens read and write what they do today, as an admin.
- The repo is public: no business figures or production details in code, docs, commit messages or PR text.
- The site is published from `main` through Lovable. This change is front end only, so a publish is the whole rollout.
- Admin screens are checked with a local build and mocked walkthroughs (`scripts/crm-verify/`); nobody signs in as a real
  admin for checks.
- It builds on the December desk's Phase 2 branch (`claude/december-desk-enrol`), which changes the same CRM screens and is
  not merged yet.

## Approaches considered

1. **One list and a panel (picked by the owner).** The CRM tab is one list; a family opens in a slide-out panel with tabs;
   Today's eight cards become quick filters and next-step pills; Lessons and the December desk become admin menu items. Most
   change, and closest to the screenshots the owner likes.
2. **Lighter current screens.** Keep Today, Leads and the family page, inside the dashboard: Today as one list, the family
   page with folding sections. Less work, but it still feels like the tool the team avoids.
3. **Only move it.** Put the current screens inside the dashboard unchanged. It answers where the CRM lives, not that it
   looks scary.

## Design

### Where it lives, and its addresses

- `/admin` shows the admin dashboard (`AdminDashboard-Redesigned`) on its Dashboard tab, as before the CRM existed, with the
  site's top navigation as `/admin/more` has today. The dashboard header's "Today" button goes.
- The CRM, Lessons and the December desk are dashboard tabs with addresses, so reloads, the back button and links work:
  - `/admin/crm` is the CRM list; `/admin/crm/<familyId>` is the list with that family's panel open (closing the panel goes
    back to `/admin/crm`).
  - `/admin/lessons` is the Lessons screen; `/admin/december` is the December desk.
  - The other dashboard tabs keep working as they do now, without addresses.
- Old addresses redirect: `/admin/families/<id>` to `/admin/crm/<id>`, `/admin/leads` to `/admin/crm`, `/admin/more` to `/admin`.
  `/admin/lessons` and `/admin/december` keep their addresses.
- The admin menu (`AdminSidebar`): under Parents & Students, CRM becomes a tab (it no longer jumps out) with a badge for
  families waiting for a reply, and Lessons is added after it, with a badge for lessons waiting to be confirmed. Under
  Programs, "December desk" is added and shows until 2026-12-19, as the desk's own menu entry does now.
- Inside the dashboard the CRM screens have no menu of their own: the CRM's left rail and phone bottom bar
  (`CrmShell`) go; each screen keeps a simple header (title, a subtitle, its buttons).

### The list

- **The band.** Three counts on a dark band, each a filter when clicked:
  - **New**: open leads at stage New, with how many came in over the last 7 days.
  - **In progress**: leads at Contacted, Call booked or Call done, with how many have a next step due today.
  - **Won this month**: leads won since the 1st of this month (Nairobi time), with last month's number beside it.
- **Quick filters** (one at a time, with counts): All open (the default), Needs a reply, Overdue (a next step due today or
  earlier, or an assessment call that has passed without an outcome), Call booked, Top-up due (a family down to its last
  prepaid session), Mine (the rule Today's Mine switch uses now), Won and lost (closed leads, most recent first).
- **Search** over the same things the Leads search covers now: name, phone, child, subject and next step.
- **+ Add lead** opens the existing new-lead dialog; when it saves, that family's panel opens.
- **Rows**, newest first:
  - **Family**: the parent's name, and under it the child and subject (with the grade when known).
  - **Stage**: a coloured pill (New, Contacted, Call booked, Call done, Won, Lost).
  - **Next step**: one pill, the first of these that applies:
    1. the family is waiting for a WhatsApp reply: "Reply on WhatsApp" (red);
    2. the assessment call has passed with no outcome: "Log the call" (red);
    3. the assessment call is today and still ahead: "Assessment call today, 4 pm";
    4. a next step is set: its text and when, red when late ("Send the package · 1 day late"), amber when due today;
    5. stage New with nothing above: "Needs first call";
    6. a won family down to its last prepaid session: "Top-up: 1 session left" (amber);
    7. an open lead with no next step: "No next step" (amber); a closed lead with nothing above: no pill.
  - **Came in**: how long ago (for example "2 hours ago") and the channel (WhatsApp, Website, Phone…).
  - **Owner**: the owner's name, or a dash.
  - **Reach out**: Call (`tel:`) and WhatsApp (`wa.me`) buttons that work without opening the panel.
- **Phone**: each row becomes a card (name, child, the stage and next-step pills, the two buttons); the filters scroll
  sideways; the band shows its three counts in one row.
- A failed read shows an error and a Try again button, never an empty list or zero counts.

### The panel

- A sheet from the right, about 520 px wide on a desktop and full screen on a phone. It is keyed by the family, so a new row
  replaces its contents rather than mixing two families.
- **Header** (dark, like the band): the parent's name; the child, subject and grade; three tiles (Stage, Came in, Owner); big
  Call and WhatsApp buttons; a close button.
- **Info**: how they found us (channel, first seen, where it came from), the child (name, grade, curriculum, subjects, mode,
  budget, urgency, with the existing Save details), contact (phone, email, area), and the assessment call's time and
  recommended tutor.
- **Follow-up**: stage, owner, the next step (what, when, who), Log call, the assessment call outcome (rate and package), Mark
  won and Mark lost.
- **Payments**: the sessions card as it is (each child and subject, sessions left, credit, Record payment, payments with
  Correct and Remove, the tutor), then progress.
- **History**: the timeline with its note box and the December seats button.
- These tabs reuse the family page's existing parts (`AssessmentCard`, `NextStepEditor`, `LogCallDialog`, `CloseLeadDialog`,
  `SessionsCard`, `RecordPaymentDialog`, `PaymentDialogs`, `StudentProgress`, `FamilyTimeline`, `DecemberSeatsDialog`) and
  their behaviour does not change. A save refreshes the list behind the panel.

### Lessons and the December desk

They render inside the dashboard as they are, with their headers and without the CRM rail. Their links to a family open
`/admin/crm/<familyId>`.

### What goes

The Today screen, the Leads board, the family page and the CRM rail. The old "CRM / Customers" page (`AdminCrm.tsx` and
`CrmNotesPanel.tsx`), which the CRM item stops pointing at, is deleted.

## How it is checked

- Pure rules in a module of their own (the next-step pill, the quick filters, the band's counts), tested with
  `npm run test:crm`, including the pill order above, late versus due today in Nairobi time, and the month boundary for Won
  this month.
- A mocked walkthrough of the new CRM at 1280 and 390 px: the list, each filter, search, a row's buttons, the panel and each
  tab, a deep link to `/admin/crm/<id>`, each old address redirecting, the menu badges, and a failed read. The existing
  walkthroughs (`walkthrough.js`, the two December ones) move to the new addresses and keep passing.
- `tsc`, eslint on the touched files, `npm run build`, and the existing test suites.

## Rollout

After the December desk's Phase 2 (its own pull request, which also needs migration 0009 applied first): one branch, one
pull request, merge, publish. No migration and no function deploy. After publishing, check that the live bundle has the new
CRM, then the owner signs in once and looks.

## Left to the builder

The exact styling (it follows the approved mockup and the app's colours), how the components are split, how the menu badges
get their counts, whether the other dashboard tabs also get addresses, and a "show more" for the Won and lost filter if the
list is long.

## Calls made while writing this (the owner has not decided these)

1. The three counts are New, In progress and Won this month, and the stage shows where the screenshots had a score.
2. The tabs are Info, Follow-up, Payments and History; progress sits under Payments.
3. Today's other cards (Assessment calls today, Calls to log, No next step) become next-step pills rather than filters, to
   keep the filters few.
4. The list is newest first, like the screenshots; the filters and red pills carry the urgency.
5. Admins land on the dashboard; the CRM is one click away.
6. The old "CRM / Customers" page is deleted rather than kept unreachable.

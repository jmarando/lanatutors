"""
Tests for tracker_dry_run.py, on an invented tracker (no real names or numbers).

    python3 -I -m unittest discover -s scripts/crm-import -p "test_*.py"

The fixture copies the quirks of the real sheet: text amounts, a half session, more sessions taken
than paid for, lines that list several subjects and tutors, a partly paid line, a line with no
numbers, lines with a blank "sessions paid", and a top-up line with no student, tutor or subject.
"""
import contextlib
import csv
import importlib.util
import io
import pathlib
import subprocess
import sys
import tempfile
import unittest
from decimal import Decimal

SCRIPT = pathlib.Path(__file__).with_name("tracker_dry_run.py")
_spec = importlib.util.spec_from_file_location("tracker_dry_run", SCRIPT)
tdr = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = tdr  # dataclasses looks its own module up by name
_spec.loader.exec_module(tdr)

HEADER = (
    "Parent,Student,Tutor,Subject,Amount paid by parent (KES),Payment reference,Rate per session (KES),"
    "Sessions paid,Sessions taken,Remaining sessions,Parent balance (KES),Tutor pay (KES),"
    "Tutor payment reference,Tutor pay status,Notes"
)
ROWS = [
    "Family A,,,,,,,,,,,,,,",
    ",Child A1,Tutor Alpha,Maths,21000,REFA1,3500,6,6,,,14700,PAYA1,Paid,",
    "Family B,,,,,,,,,,,,,,",
    ',Child B1,"Tutor Alpha, Tutor Beta","Maths(3), English(2)",6000,REFB1,1000,6,5,,,3500,PAYB1,Paid,',
    ',Child B2,Tutor Beta,English,"KES 5,800",REFB2,1450,4,3.5,,,3552.5,PAYB2,paid,',
    "Family C,,,,,,,,,,,,,,",
    ",Child C1,Tutor Gamma,Science,7200,REFC1,1800,4,5,,,6300,PAYC1,Paid,",
    ',Child C1,"Tutor Gamma, Tutor Delta","Maths(2), Science(1)",14000,REFC2,1500,12,4,,,4200,,Partially Paid,Two sessions left',
    ",Child C2,Tutor Gamma,Art,,,1000,,,,,,,,",
    "Family D,,,,,,,,,,,,,,",
    ",Child D1,Tutor Alpha,Maths,10500,REFD1,3500,3,3,,,7350,PAYD1,Paid,",
    ",,,,10500,REFD2,3500,3,1,,,2450,,,",
    "Family E,,,,,,,,,,,,,,",
    ",Child E1,Tutor Alpha,Maths,8325,REFE1,1450,,5.5,,,5582.5,PAYE1,Paid,",
    ",Child E2,Tutor Alpha,English,6000,REFE2,1000,,,,,,,,",
]
TUTORS = "Name,Phone\nTutor Alpha Mwangi,0722000001\nTutor Beta Otieno,722000002\n"

# What the sheet adds up to, by hand. The continuation line (Family D's second payment) is held back.
HELD = {"paid": Decimal("78825"), "taken": Decimal("32"), "pay": Decimal("45185"), "outstanding": Decimal("4200")}
WITH_CONTINUATION = {"paid": Decimal("89325"), "taken": Decimal("33"), "pay": Decimal("47635"), "outstanding": Decimal("6650")}


class TrackerDryRunTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = pathlib.Path(self.tmp.name)
        self.sheet = self.dir / "tracker.csv"
        self.sheet.write_text("\n".join(["Title row", "", HEADER] + ROWS) + "\n", encoding="utf-8")
        self.tutors = self.dir / "tutors.csv"
        self.tutors.write_text(TUTORS, encoding="utf-8")
        self.out = self.dir / "out"

    def tearDown(self):
        self.tmp.cleanup()

    def run_script(self, *args):
        buffer = io.StringIO()
        with contextlib.redirect_stdout(buffer):
            code = tdr.main(["tracker_dry_run.py", *map(str, args)])
        return code, buffer.getvalue()

    def dry_run(self, *extra):
        return self.run_script(self.sheet, self.out, "--tutors", self.tutors, *extra)

    def review(self):
        with (self.out / "review.csv").open(newline="", encoding="utf-8") as handle:
            return list(csv.DictReader(handle))

    def write_review(self, rows):
        with (self.out / "review.csv").open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=tdr.REVIEW_COLUMNS)
            writer.writeheader()
            writer.writerows(rows)

    # ------------------------------------------------------------------ reading

    def test_reads_every_line_under_its_parent(self):
        data = tdr.read_tracker(self.sheet, self.tutors)
        self.assertEqual([line["parent"] for line in data.lines].count("Family B"), 2)
        self.assertEqual(len(data.lines), 10)
        kinds = [line["kind"] for line in data.lines]
        self.assertEqual(kinds.count("continuation"), 1)
        self.assertEqual(kinds.count("line"), 9)

    def test_amounts_typed_as_text_and_status_case(self):
        data = tdr.read_tracker(self.sheet, self.tutors)
        b2 = next(line for line in data.lines if line["student"] == "Child B2")
        self.assertEqual(b2["amount"], Decimal("5800"))
        self.assertEqual(b2["tutor_status"], "paid")

    # ------------------------------------------------------------------ the numbers

    def test_totals_hold_back_the_continuation_line(self):
        code, out = self.dry_run()
        self.assertEqual(code, 0)
        totals = tdr.totals(self.review())
        for key, expected in HELD.items():
            self.assertEqual(totals[key], expected, key)
        self.assertIn("held for a decision", out.lower())
        self.assertIn("continuation", out.lower())

    def test_continuation_line_shows_what_it_adds_and_is_attached_by_decision(self):
        self.dry_run()
        rows = self.review()
        held = [r for r in rows if r["kind"] == "continuation"]
        self.assertEqual(len(held), 1)
        self.assertEqual((held[0]["student"], held[0]["subject"], held[0]["tutor"]), ("Child D1", "Maths", "Tutor Alpha"))
        self.assertEqual(held[0]["decision"], "")
        held[0]["decision"] = "attach"
        self.write_review(rows)
        code, out = self.run_script(self.out / "review.csv", self.out, "--from-review")
        self.assertEqual(code, 0)
        totals = tdr.totals(self.review())
        for key, expected in WITH_CONTINUATION.items():
            self.assertEqual(totals[key], expected, key)

    def test_check_fails_when_the_totals_differ_from_the_targets(self):
        code, out = self.dry_run("--expect", "paid=78825,taken=32,pay=45185,outstanding=4200", "--check")
        self.assertEqual(code, 0)
        self.assertIn("matches", out.lower())
        code, out = self.dry_run("--expect", "paid=110925,taken=59,pay=66535,outstanding=3150", "--check")
        self.assertEqual(code, 1)
        self.assertIn("differs", out.lower())

    # ------------------------------------------------------------------ splitting and flags

    def test_splits_a_line_by_the_counts_in_its_subjects(self):
        self.dry_run()
        parts = [r for r in self.review() if r["student"] == "Child B1"]
        self.assertEqual(len(parts), 2)
        maths, english = sorted(parts, key=lambda r: r["part"])
        self.assertEqual((maths["subject"], maths["tutor"]), ("Maths", "Tutor Alpha"))
        self.assertEqual((english["subject"], english["tutor"]), ("English", "Tutor Beta"))
        self.assertEqual((Decimal(maths["sessions_taken"]), Decimal(english["sessions_taken"])), (Decimal(3), Decimal(2)))
        self.assertEqual((Decimal(maths["amount_kes"]), Decimal(english["amount_kes"])), (Decimal(3600), Decimal(2400)))
        self.assertEqual((Decimal(maths["sessions_paid"]), Decimal(english["sessions_paid"])), (Decimal(4), Decimal(2)))
        self.assertEqual((Decimal(maths["tutor_pay_kes"]), Decimal(english["tutor_pay_kes"])), (Decimal(2100), Decimal(1400)))
        self.assertIn("split", maths["flags"].lower())

    def test_does_not_split_when_the_counts_do_not_add_up(self):
        self.dry_run()
        rows = [r for r in self.review() if r["reference"] == "REFC2"]
        self.assertEqual(len(rows), 1)
        self.assertIn("counts", rows[0]["flags"].lower())
        self.assertEqual(rows[0]["subject"], "Maths(2), Science(1)")

    def test_flags_what_a_person_must_look_at(self):
        self.dry_run()
        by_ref = {r["reference"]: r for r in self.review() if r["reference"]}
        self.assertIn("taken exceeds paid", by_ref["REFC1"]["flags"].lower())
        self.assertIn("partially paid", by_ref["REFC2"]["flags"].lower())
        self.assertIn("half", by_ref["REFB2"]["flags"].lower())
        empty = next(r for r in self.review() if r["student"] == "Child C2")
        self.assertIn("no money or sessions", empty["flags"].lower())

    def test_a_partly_paid_line_counts_wholly_as_outstanding(self):
        self.dry_run()
        row = next(r for r in self.review() if r["reference"] == "REFC2")
        self.assertEqual(Decimal(row["tutor_pay_kes"]), Decimal(4200))
        self.assertEqual(Decimal(row["tutor_paid_kes"]), Decimal(0))

    def test_blank_sessions_paid_is_filled_in_so_the_pack_is_valid(self):
        self.dry_run()
        by_ref = {r["reference"]: r for r in self.review() if r["reference"]}
        self.assertEqual(Decimal(by_ref["REFE1"]["sessions_paid"]), Decimal("5.5"))  # = taken
        self.assertEqual(Decimal(by_ref["REFE2"]["sessions_paid"]), Decimal(6))      # = amount / rate
        self.assertIn("sessions paid was blank", by_ref["REFE1"]["flags"].lower())

    def test_rate_is_the_typed_one_or_amount_over_sessions(self):
        self.dry_run()
        by_ref = {r["reference"]: r for r in self.review() if r["reference"]}
        self.assertEqual(Decimal(by_ref["REFC2"]["rate_per_session"]), Decimal(1500))   # typed over 14000 / 12
        self.assertEqual(Decimal(by_ref["REFA1"]["rate_per_session"]), Decimal(3500))

    # ------------------------------------------------------------------ tutors

    def test_tutors_are_matched_to_the_phone_list_by_name(self):
        self.dry_run()
        by_ref = {r["reference"]: r for r in self.review() if r["reference"]}
        self.assertEqual(by_ref["REFA1"]["tutor_phone"], "254722000001")
        self.assertEqual(by_ref["REFB2"]["tutor_phone"], "254722000002")
        self.assertEqual(by_ref["REFC1"]["tutor_phone"], "")
        self.assertIn("tutor not found", by_ref["REFC1"]["flags"].lower())

    # ------------------------------------------------------------------ import.sql

    def fill_families(self):
        rows = self.review()
        phones = {"Family A": "0712000001", "Family B": "0712000002", "Family D": "712000004"}
        for row in rows:
            row["family_phone"] = phones.get(row["parent"], "")
            if row["kind"] == "continuation":
                row["decision"] = "attach"
        self.write_review(rows)
        return self.run_script(self.out / "review.csv", self.out, "--from-review")

    def test_import_sql_is_one_transaction_with_one_block_per_row(self):
        self.dry_run()
        self.fill_families()
        sql = (self.out / "import.sql").read_text(encoding="utf-8")
        self.assertTrue(sql.lstrip().startswith("--"))
        self.assertIn("\nbegin;\n", sql)
        self.assertIn("\ncommit;", sql)
        self.assertIn("public.crm_upsert_family('254712000001', 'Family A', NULL)", sql)
        self.assertIn("tracker import row", sql)
        # Family A: one row, Family B: three rows (B1 splits in two), Family D: two (continuation attached).
        self.assertEqual(sql.count("do $row$"), 1 + 3 + 2)
        self.assertIn("'254722000001'", sql)  # the tutor is found through the phone list

    def test_import_sql_skips_families_nobody_has_matched_and_lists_them(self):
        self.dry_run()
        sql = (self.out / "import.sql").read_text(encoding="utf-8")
        self.assertEqual(sql.count("do $row$"), 0)
        self.assertIn("Skipped", sql)
        self.assertIn("Family A", sql)

    def test_import_sql_checks_its_own_totals_before_committing(self):
        self.dry_run()
        self.fill_families()
        sql = (self.out / "import.sql").read_text(encoding="utf-8")
        self.assertIn("raise exception", sql.lower())
        self.assertIn("Reconciliation", sql)
        # Families A, B and D only: 21000 + 6000 + 5800 + 10500 + 10500 paid.
        self.assertIn("53800", sql)
        self.assertLess(sql.lower().index("reconciliation"), sql.lower().rindex("commit;"))

    def test_import_sql_is_safe_to_run_twice(self):
        self.dry_run()
        self.fill_families()
        sql = (self.out / "import.sql").read_text(encoding="utf-8")
        self.assertIn("if not exists (select 1 from public.session_packs where enrolment_id = e and notes = ", sql)

    # ------------------------------------------------------------------ the script on its own

    def test_runs_under_isolated_python_and_writes_both_files(self):
        result = subprocess.run(
            [sys.executable, "-I", str(SCRIPT), str(self.sheet), str(self.out), "--tutors", str(self.tutors)],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((self.out / "review.csv").exists())
        self.assertTrue((self.out / "import.sql").exists())


if __name__ == "__main__":
    unittest.main()

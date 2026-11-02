"""
Builds an import.sql from the invented tracker in scripts/crm-import/test_tracker_dry_run.py, so run.sh
can prove the generated SQL runs on the scratch database, reconciles, rolls back when it does not, and
adds nothing the second time. Also writes import_bad.sql, whose expected paid total is one shilling off.

    python3 -I make_tracker_import.py <out-dir>
"""
import contextlib
import csv
import importlib.util
import io
import pathlib
import re
import sys

here = pathlib.Path(__file__).resolve().parent
test_path = here.parent / "crm-import" / "test_tracker_dry_run.py"
spec = importlib.util.spec_from_file_location("test_tracker_dry_run", test_path)
fixture = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = fixture
spec.loader.exec_module(fixture)
tdr = fixture.tdr

out = pathlib.Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
sheet = out / "tracker.csv"
sheet.write_text("\n".join(["Title row", "", fixture.HEADER] + fixture.ROWS) + "\n", encoding="utf-8")
tutors = out / "tutors.csv"
tutors.write_text(fixture.TUTORS, encoding="utf-8")

with contextlib.redirect_stdout(io.StringIO()):
    tdr.main(["tracker_dry_run.py", str(sheet), str(out), "--tutors", str(tutors)])

# Numbers that no fixture in test_lessons.sql uses, so every family here is new.
phones = {"Family A": "0799000001", "Family B": "0799000002", "Family C": "0799000003", "Family D": "799000004", "Family E": "0799000005"}
with (out / "review.csv").open(newline="", encoding="utf-8") as handle:
    rows = list(csv.DictReader(handle))
for row in rows:
    row["family_phone"] = phones[row["parent"]]
    if row["kind"] == "continuation":
        row["decision"] = "attach"
with (out / "review.csv").open("w", newline="", encoding="utf-8") as handle:
    writer = csv.DictWriter(handle, fieldnames=tdr.REVIEW_COLUMNS)
    writer.writeheader()
    writer.writerows(rows)

with contextlib.redirect_stdout(io.StringIO()):
    tdr.main(["tracker_dry_run.py", str(out / "review.csv"), str(out), "--from-review"])

sql = (out / "import.sql").read_text(encoding="utf-8")
bad = re.sub(r"if v_paid <> (\d+)", lambda m: f"if v_paid <> {int(m.group(1)) + 1}", sql, count=1)
assert bad != sql, "could not find the reconciliation to break"
(out / "import_bad.sql").write_text(bad, encoding="utf-8")
print("wrote", out / "import.sql", "and", out / "import_bad.sql")

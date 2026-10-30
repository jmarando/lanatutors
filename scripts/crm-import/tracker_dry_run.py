#!/usr/bin/env python3
"""
Payment-tracker dry run for the Lana Tutors CRM (lessons slice).

Reads the team's multi-student payment tracker and writes two files into the output folder:

  review.csv   one row per enrolment line (child + subject + tutor): what was paid, the rate, the
               sessions paid and taken, the tutor's pay, flags for anything a person must look at,
               and empty columns to fill in by hand (family_phone or family_id, a decision).
  import.sql   SQL that loads the reviewed rows into enrolments and session packs, with the opening
               tutor-pay fields, in one transaction that checks its own totals before it commits.

Usage:
    python3 -I tracker_dry_run.py <tracker.xlsx|.csv> <out-dir> [--tutors tutors.csv]
                                  [--expect paid=..,taken=..,pay=..,outstanding=..] [--check]
    python3 -I tracker_dry_run.py <out-dir>/review.csv <out-dir> --from-review

`--from-review` rebuilds import.sql from a review.csv you have filled in. `--check` exits with 1 when
the totals differ from the targets (default: the audit's 110,925 paid, 59 taken, 66,535 tutor pay,
3,150 outstanding). Nothing here writes to the database; import.sql is run by hand, with the
user's go-ahead.

Only the Python standard library is used, so the script runs under `python3 -I` on any machine.
The sheet and the output folder hold personal data: keep both out of the repository.

Spec: docs/superpowers/specs/2026-10-28-crm-redesign-design.md, section 6.
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
import zipfile
from dataclasses import dataclass, field
from decimal import ROUND_FLOOR, ROUND_HALF_UP, Decimal, InvalidOperation
from pathlib import Path
from xml.etree import ElementTree as ET

# Tutors get 70% of the family's rate for each session taken. Keep in step with crm_tutor_share()
# in drizzle/migrations/0006_crm_lessons.sql.
TUTOR_SHARE = Decimal("0.70")

# The totals the audit took from the tracker on 28 Oct 2026.
TARGETS = {
    "paid": Decimal("110925"),
    "taken": Decimal("59"),
    "pay": Decimal("66535"),
    "outstanding": Decimal("3150"),
}

REVIEW_COLUMNS = [
    "source_row",
    "part",
    "kind",
    "parent",
    "family_phone",
    "family_id",
    "student",
    "subject",
    "tutor",
    "tutor_phone",
    "tutor_profile_id",
    "amount_kes",
    "reference",
    "sessions_paid",
    "rate_per_session",
    "sessions_taken",
    "tutor_pay_kes",
    "tutor_paid_kes",
    "tutor_reference",
    "tutor_status",
    "notes",
    "flags",
    "decision",
]

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "p": "http://schemas.openxmlformats.org/package/2006/relationships",
}

CENT = Decimal("0.01")
Rows = list  # of (sheet row number, [cell text, ...])


# ------------------------------------------------------------------ spreadsheet


def _cell_text(cell: ET.Element, shared: list[str]) -> str:
    kind = cell.get("t")
    if kind == "inlineStr":
        node = cell.find("m:is", NS)
        return "".join(t.text or "" for t in node.iter(f"{{{NS['m']}}}t")) if node is not None else ""
    value = cell.find("m:v", NS)
    if value is None or value.text is None:
        return ""
    if kind == "s":
        try:
            return shared[int(value.text)]
        except (ValueError, IndexError):
            return ""
    return value.text


def _read_sheet(xml: bytes, shared: list[str]) -> Rows:
    rows: Rows = []
    root = ET.fromstring(xml)
    for row in root.iter(f"{{{NS['m']}}}row"):
        values: list[str] = []
        column = 0
        for cell in row.findall("m:c", NS):
            letters = re.match(r"([A-Z]+)", cell.get("r") or "")
            if letters:
                target = 0
                for char in letters.group(1):
                    target = target * 26 + (ord(char) - 64)
                target -= 1
                while column < target:
                    values.append("")
                    column += 1
            values.append(_cell_text(cell, shared))
            column += 1
        number = int(row.get("r") or (rows[-1][0] + 1 if rows else 1))
        rows.append((number, values))
    return rows


def read_xlsx(path: Path) -> dict[str, Rows]:
    """Every worksheet of an .xlsx file by name, with the standard library. Formulas read as their last result."""
    with zipfile.ZipFile(path) as book:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in book.namelist():
            root = ET.fromstring(book.read("xl/sharedStrings.xml"))
            for si in root.findall("m:si", NS):
                shared.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))
        workbook = ET.fromstring(book.read("xl/workbook.xml"))
        rels = ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))
        targets = {rel.get("Id"): rel.get("Target") or "" for rel in rels.findall("p:Relationship", NS)}
        sheets: dict[str, Rows] = {}
        listing = workbook.find("m:sheets", NS)
        for sheet in listing if listing is not None else []:
            target = targets.get(sheet.get(f"{{{NS['r']}}}id") or "", "")
            member = target.lstrip("/") if target.startswith("/") else f"xl/{target}"
            if member in book.namelist():
                sheets[sheet.get("name") or member] = _read_sheet(book.read(member), shared)
        return sheets


def read_csv(path: Path) -> Rows:
    with Path(path).open(newline="", encoding="utf-8-sig") as handle:
        return [(number, row) for number, row in enumerate(csv.reader(handle), start=1)]


# ------------------------------------------------------------------ cleaning


def normalize_phone(value: str | None) -> str | None:
    """Mirror of the SQL crm_normalize_phone (international digits, or None)."""
    raw = (value or "").strip()
    if re.fullmatch(r"\d+(\.0+)?", raw):
        raw = raw.split(".")[0]
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("00"):
        digits = digits[2:]
    if len(digits) == 13 and digits.startswith("2540"):
        digits = "254" + digits[4:]
    if len(digits) < 9:
        return None
    if len(digits) == 10 and digits.startswith("0"):
        return "254" + digits[1:]
    if len(digits) == 9 and digits[0] in ("7", "1"):
        return "254" + digits
    return digits


def parse_number(text: str | None) -> Decimal | None:
    """'KES 5,800', 'kshs. 6,000', '3.5' and '21000' all read as numbers; blanks and words as None."""
    cleaned = (text or "").strip()
    if not cleaned:
        return None
    cleaned = re.sub(r"(?i)\bkshs?\b\.?|\bkes\b\.?", "", cleaned)
    cleaned = cleaned.replace(",", "").replace(" ", "").replace("/=", "")
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def fmt(value: Decimal | None) -> str:
    """21000 -> '21000', 3552.50 -> '3552.5'; empty for None."""
    if value is None:
        return ""
    text = format(value, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text or "0"


def thousands(value: Decimal) -> str:
    whole = format(value.quantize(CENT) if value != value.to_integral_value() else value.to_integral_value(), ",f")
    return whole


def tidy(text: str | None) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def norm_name(text: str | None) -> str:
    return tidy(re.sub(r"[^a-z0-9 ]+", " ", (text or "").lower()))


def norm_status(text: str | None) -> str:
    lowered = tidy(text).lower()
    if lowered == "paid":
        return "paid"
    return "partial" if "partial" in lowered else "pending"


# ------------------------------------------------------------------ reading the tracker

HEADERS = {
    "parent": lambda c: c == "parent",
    "student": lambda c: c == "student",
    "tutor": lambda c: c == "tutor",
    "subject": lambda c: c == "subject",
    "amount": lambda c: c.startswith("amount paid"),
    "reference": lambda c: c == "payment reference",
    "rate": lambda c: c.startswith("rate per session"),
    "sessions_paid": lambda c: c == "sessions paid",
    "sessions_taken": lambda c: c == "sessions taken",
    "tutor_pay": lambda c: c.startswith("tutor pay (") or c == "tutor pay",
    "tutor_reference": lambda c: c == "tutor payment reference",
    "tutor_status": lambda c: c == "tutor pay status",
    "notes": lambda c: c == "notes",
}


@dataclass
class TrackerData:
    lines: list[dict] = field(default_factory=list)
    tutors: list[tuple[str, str]] = field(default_factory=list)  # (name, international phone)


def _find_header(rows: Rows) -> tuple[int, dict[str, int]]:
    for index, (_, cells) in enumerate(rows[:20]):
        lowered = [tidy(c).lower() for c in cells]
        mapping: dict[str, int] = {}
        for column, cell in enumerate(lowered):
            for key, test in HEADERS.items():
                if key not in mapping and test(cell):
                    mapping[key] = column
                    break
        if {"parent", "student", "tutor", "subject", "amount"} <= set(mapping):
            return index, mapping
    raise SystemExit("Could not find the tracker's header row (Parent, Student, Tutor, Subject, Amount paid ...).")


def _read_tutors(rows: Rows) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    for _, cells in rows:
        filled = [tidy(c) for c in cells if tidy(c)]
        if len(filled) < 2:
            continue
        phone = normalize_phone(filled[1])
        if phone and not re.fullmatch(r"(?i)name|tutor|phone.*", filled[0]):
            found.append((filled[0], phone))
    return found


def read_tracker(path: str | Path, tutors_path: str | Path | None = None) -> TrackerData:
    path = Path(path)
    tutor_rows: Rows = []
    if path.suffix.lower() == ".csv":
        rows = read_csv(path)
    else:
        sheets = read_xlsx(path)
        pick = next((n for n in sheets if "tracker" in n.lower()), None) or next(
            (n for n in sheets if "payment" in n.lower()), None
        ) or next(iter(sheets))
        rows = sheets[pick]
        tutor_rows = next((r for n, r in sheets.items() if n.strip().lower() == "tutors"), [])
    if tutors_path:
        tutor_rows = read_csv(Path(tutors_path))

    header_index, columns = _find_header(rows)
    data = TrackerData(tutors=_read_tutors(tutor_rows))

    def cell(cells: list[str], key: str) -> str:
        column = columns.get(key)
        return tidy(cells[column]) if column is not None and column < len(cells) else ""

    parent = ""
    last_named: dict | None = None
    for number, cells in rows[header_index + 1 :]:
        if cell(cells, "parent"):
            parent = cell(cells, "parent")
            last_named = None
            continue
        identity = [cell(cells, k) for k in ("student", "tutor", "subject")]
        figures = [cell(cells, k) for k in ("amount", "reference", "rate", "sessions_paid", "sessions_taken")]
        if not any(identity) and not any(figures):
            continue
        flags: list[str] = []
        numbers: dict[str, Decimal | None] = {}
        for key in ("amount", "rate", "sessions_paid", "sessions_taken", "tutor_pay"):
            text = cell(cells, key)
            numbers[key] = parse_number(text)
            if text and numbers[key] is None:
                flags.append(f"could not read {key.replace('_', ' ')} '{text}'")
        named = any(identity)
        line = {
            "source_row": number,
            "kind": "line" if named else "continuation",
            "parent": parent,
            "student": identity[0],
            "tutor_text": identity[1],
            "subject_text": identity[2],
            "amount": numbers["amount"],
            "reference": cell(cells, "reference"),
            "rate": numbers["rate"],
            "sessions_paid": numbers["sessions_paid"],
            "sessions_taken": numbers["sessions_taken"],
            "tutor_pay_sheet": numbers["tutor_pay"],
            "tutor_reference": cell(cells, "tutor_reference"),
            "tutor_status": norm_status(cell(cells, "tutor_status")),
            "notes": cell(cells, "notes"),
            "flags": flags,
            "above": None,
        }
        if named:
            last_named = line
        else:
            line["above"] = last_named
        data.lines.append(line)
    return data


# ------------------------------------------------------------------ proposing the review


def allocate(total: Decimal, weights: list[Decimal], quantum: Decimal) -> list[Decimal]:
    """Share `total` by weight in whole `quantum` steps, largest remainder first, so the parts add up."""
    weight_sum = sum(weights)
    raw = [total * w / weight_sum for w in weights]
    parts = [(r / quantum).to_integral_value(ROUND_FLOOR) * quantum for r in raw]
    leftover = int(((total - sum(parts)) / quantum).to_integral_value())
    for index in sorted(range(len(raw)), key=lambda i: raw[i] - parts[i], reverse=True)[: max(leftover, 0)]:
        parts[index] += quantum
    return parts


def _subject_parts(text: str) -> list[tuple[str, Decimal]] | None:
    """'Maths(3), English(2)' -> [('Maths', 3), ('English', 2)]; None when the text is not in that shape."""
    if not re.fullmatch(r"\s*(?:[^,()]+\(\s*\d+(?:\.\d+)?\s*\)\s*,?\s*)+", text):
        return None
    return [(tidy(n), Decimal(c)) for n, c in re.findall(r"([^,()]+?)\s*\(\s*(\d+(?:\.\d+)?)\s*\)", text)]


def _tutor_names(text: str) -> list[str]:
    return [tidy(p) for p in re.split(r",|&|/|\band\b", text) if tidy(p)]


def match_tutor(name: str, tutors: list[tuple[str, str]]) -> tuple[str, str]:
    """(phone, flag): every word of the sheet's name must appear in exactly one person on the phone list."""
    words = set(norm_name(name).split())
    if not words:
        return "", ""
    hits = [(n, p) for n, p in tutors if words <= set(norm_name(n).split())]
    exact = [h for h in hits if norm_name(h[0]) == norm_name(name)]
    if len(exact) == 1:
        return exact[0][1], ""
    if len(hits) == 1:
        return hits[0][1], ""
    if len(hits) > 1:
        return "", f"tutor '{name}' matches {len(hits)} people in the phone list"
    return "", f"tutor not found in the phone list: '{name}'"


def propose(line: dict, tutors: list[tuple[str, str]]) -> list[dict]:
    flags = list(line["flags"])
    amount = line["amount"] or Decimal(0)
    taken = line["sessions_taken"] or Decimal(0)
    paid_sessions = line["sessions_paid"] or Decimal(0)
    rate = line["rate"]
    above = line["above"]

    student, subject_text, tutor_text = line["student"], line["subject_text"], line["tutor_text"]
    if line["kind"] == "continuation":
        if above:
            student, subject_text, tutor_text = above["student"], above["subject_text"], above["tutor_text"]
            flags.append("continuation: no student, tutor or subject, so it is proposed as another payment on the line above")
        else:
            flags.append("continuation with no line above it: say which child and subject it belongs to")

    if rate is None:
        rate = money(amount / paid_sessions) if amount and paid_sessions else Decimal(0)
        if amount and not paid_sessions and taken == 0:
            flags.append("no rate and no sessions: cannot price the pack")
    elif amount and paid_sessions and abs(rate - amount / paid_sessions) > CENT:
        flags.append(f"rate {fmt(rate)} typed over amount ÷ sessions ({fmt(money(amount / paid_sessions))})")

    if paid_sessions == 0 and (amount or taken):
        if taken > 0:
            paid_sessions = taken
            flags.append("sessions paid was blank: set to the sessions taken so the pack is valid")
        elif rate:
            paid_sessions = money(amount / rate)
            flags.append("sessions paid was blank: set to amount ÷ rate")
    if not amount and not taken and not paid_sessions:
        flags.append("no money or sessions on this line: the child and subject are kept, no pack")
    elif not amount and taken:
        flags.append("sessions taken but no payment on this line: its payment is on another line")
    if taken > paid_sessions and paid_sessions:
        flags.append(f"taken exceeds paid by {fmt(taken - paid_sessions)}: the family owes")
    if taken != taken.to_integral_value():
        flags.append(f"half sessions ({fmt(taken)} taken)")
    if line["tutor_status"] == "partial":
        flags.append("partially paid: the amount already sent is not in the sheet, so the whole line counts as outstanding")

    pay = money(rate * taken * TUTOR_SHARE)
    sheet_pay = line["tutor_pay_sheet"]
    if sheet_pay is not None and abs(sheet_pay - pay) > CENT:
        flags.append(f"tutor pay differs from the sheet (sheet {fmt(sheet_pay)}, rule {fmt(pay)})")
    if re.search(r"\?|please confirm|confirm", line["notes"], re.I):
        flags.append("the notes carry an open question")
    if not line["reference"] and amount:
        flags.append("no payment reference")

    # One row, or several when the subject text lists counts that add up to the sessions taken.
    parts = _subject_parts(subject_text) if line["kind"] == "line" else None
    tutors_listed = _tutor_names(tutor_text)
    multi_subject = bool(re.search(r"[,&(]|\band\b", subject_text))
    multi_tutor = len(tutors_listed) > 1
    split: list[tuple[str, Decimal, str]] | None = None
    if line["kind"] == "line" and (multi_subject or multi_tutor):
        if parts and len(parts) > 1 and sum(c for _, c in parts) == taken and len(tutors_listed) in (1, len(parts)):
            split = [
                (name, count, tutors_listed[i] if len(tutors_listed) == len(parts) else tutors_listed[0])
                for i, (name, count) in enumerate(parts)
            ]
            flags.append(f"split into {len(split)} lines by the counts in the subject text: check the tutor of each")
        elif parts and sum(c for _, c in parts) != taken:
            flags.append(
                f"subject counts add up to {fmt(sum(c for _, c in parts))} but the sheet says {fmt(taken)} taken: split by hand"
            )
        else:
            flags.append("several subjects or tutors without counts that fit: split by hand")

    pieces: list[tuple[str, str, Decimal, Decimal, Decimal]]  # subject, tutor, amount, sessions paid, taken
    if split:
        weights = [c for _, c, _ in split]
        amounts = allocate(amount, weights, CENT)
        paid_each = allocate(paid_sessions, weights, Decimal(1) if paid_sessions == paid_sessions.to_integral_value() else CENT)
        pieces = [(n, t, amounts[i], paid_each[i], weights[i]) for i, (n, _, t) in enumerate(split)]
    else:
        pieces = [(subject_text, tutor_text, amount, paid_sessions, taken)]

    rows: list[dict] = []
    for index, (subject, tutor, piece_amount, piece_paid, piece_taken) in enumerate(pieces, start=1):
        piece_pay = money(rate * piece_taken * TUTOR_SHARE)
        phone, tutor_flag = match_tutor(tutor, tutors) if len(_tutor_names(tutor)) <= 1 else ("", "")
        row_flags = list(flags) + ([tutor_flag] if tutor_flag else [])
        rows.append(
            {
                "source_row": str(line["source_row"]),
                "part": str(index),
                "kind": line["kind"],
                "parent": line["parent"],
                "family_phone": "",
                "family_id": "",
                "student": student,
                "subject": subject,
                "tutor": tutor,
                "tutor_phone": phone,
                "tutor_profile_id": "",
                "amount_kes": fmt(piece_amount),
                "reference": line["reference"],
                "sessions_paid": fmt(piece_paid),
                "rate_per_session": fmt(rate),
                "sessions_taken": fmt(piece_taken),
                "tutor_pay_kes": fmt(piece_pay),
                "tutor_paid_kes": fmt(piece_pay if line["tutor_status"] == "paid" else Decimal(0)),
                "tutor_reference": line["tutor_reference"],
                "tutor_status": line["tutor_status"],
                "notes": line["notes"],
                "flags": "; ".join(row_flags),
                "decision": "",
            }
        )
    return rows


# ------------------------------------------------------------------ totals


def _d(text: str | None) -> Decimal:
    return parse_number(text) or Decimal(0)


def is_held(row: dict) -> bool:
    """A continuation line waits for a person to say 'attach'."""
    return row.get("kind") == "continuation" and (row.get("decision") or "").strip().lower() != "attach"


def is_skipped(row: dict) -> bool:
    return (row.get("decision") or "").strip().lower() == "skip"


def counted(rows: list[dict]) -> list[dict]:
    return [r for r in rows if not is_skipped(r) and not is_held(r)]


def totals(rows: list[dict]) -> dict[str, Decimal]:
    out = {k: Decimal(0) for k in ("paid", "taken", "pay", "outstanding", "sessions_paid")}
    for row in counted(rows):
        out["paid"] += _d(row["amount_kes"])
        out["taken"] += _d(row["sessions_taken"])
        out["pay"] += _d(row["tutor_pay_kes"])
        out["outstanding"] += _d(row["tutor_pay_kes"]) - _d(row["tutor_paid_kes"])
        out["sessions_paid"] += _d(row["sessions_paid"])
    return out


# ------------------------------------------------------------------ import.sql


def sql_text(value: str | None) -> str:
    return "NULL" if value is None or value == "" else "'" + value.replace("'", "''") + "'"


def sql_num(value: str | None) -> str:
    return fmt(parse_number(value)) or "0"


def family_ref(row: dict) -> str | None:
    family_id = (row.get("family_id") or "").strip()
    if family_id:
        return f"f := {sql_text(family_id)}::uuid;"
    phone = normalize_phone(row.get("family_phone"))
    if phone:
        return f"f := public.crm_upsert_family({sql_text(phone)}, {sql_text(row['parent'])}, NULL);"
    return None


def tutor_expr(row: dict) -> str:
    if (row.get("tutor_profile_id") or "").strip():
        return f"{sql_text(row['tutor_profile_id'].strip())}::uuid"
    phone = normalize_phone(row.get("tutor_phone"))
    if phone:
        return (
            "(select tp.id from public.tutor_profiles tp join public.profiles p on p.id = tp.user_id "
            f"where public.crm_normalize_phone(p.phone_number) = {sql_text(phone)} order by tp.created_at limit 1)"
        )
    return "NULL::uuid"


def has_pack(row: dict) -> bool:
    return (_d(row["amount_kes"]) > 0 or _d(row["sessions_taken"]) > 0) and _d(row["sessions_paid"]) > 0


def marker(row: dict) -> str:
    return f"tracker import row {row['source_row']} part {row['part']}"


def build_import(rows: list[dict]) -> tuple[str, dict[str, Decimal], list[str]]:
    """The SQL, the totals it will write, and why some rows were left out."""
    blocks: list[str] = []
    skipped: list[str] = []
    written = {k: Decimal(0) for k in ("paid", "taken", "pay", "outstanding")}
    for row in rows:
        label = f"row {row['source_row']} part {row['part']} · {row['parent']} · {row['student']} · {row['subject']}"
        if is_skipped(row):
            skipped.append(f"{label}: decision is skip")
            continue
        if is_held(row):
            skipped.append(f"{label}: continuation line held for a decision (set decision to attach)")
            continue
        assign = family_ref(row)
        if assign is None:
            skipped.append(f"{label}: family not matched (fill family_phone or family_id)")
            continue
        if (_d(row["amount_kes"]) > 0 or _d(row["sessions_taken"]) > 0) and _d(row["sessions_paid"]) <= 0:
            skipped.append(f"{label}: money or sessions but no sessions paid, so no pack can be made")
            continue
        student, subject = row["student"], row["subject"] or "Lesson"
        lines = [
            f"-- {label}",
            "do $row$",
            "declare f uuid; t uuid; e uuid;",
            "begin",
            f"  {assign}",
            f"  t := {tutor_expr(row)};",
            "  select id into e from public.enrolments",
            "   where family_id = f",
            f"     and public.crm_norm_text(coalesce(student_name, '')) = public.crm_norm_text({sql_text(student) if student else sql_text('')})",
            f"     and public.crm_norm_text(subject) = public.crm_norm_text({sql_text(subject)})",
            "     and tutor_id is not distinct from t",
            "   order by created_at limit 1;",
            "  if e is null then",
            "    insert into public.enrolments (family_id, student_name, subject, tutor_id)",
            f"    values (f, {sql_text(student)}, {sql_text(subject)}, t) returning id into e;",
            "  end if;",
        ]
        if has_pack(row):
            pay, paid = _d(row["tutor_pay_kes"]), _d(row["tutor_paid_kes"])
            lines += [
                f"  if not exists (select 1 from public.session_packs where enrolment_id = e and notes = {sql_text(marker(row))}) then",
                "    insert into public.session_packs",
                "      (enrolment_id, amount_kes, reference, paid_on, sessions_bought, rate_per_session, sessions_used, notes)",
                f"    values (e, {sql_num(row['amount_kes'])}, {sql_text(row['reference'])}, NULL, {sql_num(row['sessions_paid'])},",
                f"            {sql_num(row['rate_per_session'])}, {sql_num(row['sessions_taken'])}, {sql_text(marker(row))});",
                "    update public.enrolments set",
                f"      opening_tutor_pay_kes = coalesce(opening_tutor_pay_kes, 0) + {fmt(pay) or '0'},",
                f"      opening_tutor_paid_kes = coalesce(opening_tutor_paid_kes, 0) + {fmt(paid) or '0'},",
                f"      opening_tutor_reference = nullif(concat_ws(', ', opening_tutor_reference, {sql_text(tidy(row['tutor_reference']))}), '')",
                "    where id = e;",
                "    update public.families set status = 'active' where id = f and status = 'prospect';",
                "  end if;",
            ]
            written["paid"] += _d(row["amount_kes"])
            written["taken"] += _d(row["sessions_taken"])
            written["pay"] += pay
            written["outstanding"] += pay - paid
        lines += ["end", "$row$;", ""]
        blocks.append("\n".join(lines))

    header = [
        "-- Generated by scripts/crm-import/tracker_dry_run.py from the payment tracker.",
        "-- Contains personal data: keep it out of the repository.",
        "-- Run once, in the Supabase SQL editor (or through the Lovable connector, with the user's go-ahead),",
        "-- AFTER drizzle/migrations/0006_crm_lessons.sql is applied and BEFORE anyone confirms a lesson for these families.",
        "-- One transaction: if the reconciliation at the end does not match the review, nothing is kept.",
        "begin;",
        "",
    ]
    check = [
        "-- Reconciliation: what this import wrote must equal what the review adds up to.",
        "do $check$",
        "declare v_paid numeric; v_used numeric; v_pay numeric; v_out numeric;",
        "begin",
        "  select coalesce(sum(amount_kes), 0), coalesce(sum(sessions_used), 0) into v_paid, v_used",
        "    from public.session_packs where notes like 'tracker import row %';",
        "  select coalesce(sum(opening_tutor_pay_kes), 0), coalesce(sum(opening_tutor_pay_kes - coalesce(opening_tutor_paid_kes, 0)), 0)",
        "    into v_pay, v_out from public.enrolments e",
        "    where exists (select 1 from public.session_packs p where p.enrolment_id = e.id and p.notes like 'tracker import row %');",
        f"  if v_paid <> {fmt(written['paid']) or '0'} or v_used <> {fmt(written['taken']) or '0'}"
        f" or v_pay <> {fmt(written['pay']) or '0'} or v_out <> {fmt(written['outstanding']) or '0'} then",
        "    raise exception 'Reconciliation failed: paid %, sessions taken %, tutor pay %, outstanding % "
        f"(expected {fmt(written['paid']) or '0'}, {fmt(written['taken']) or '0'}, {fmt(written['pay']) or '0'}, {fmt(written['outstanding']) or '0'})',",
        "      v_paid, v_used, v_pay, v_out;",
        "  end if;",
        "  raise notice 'Reconciliation ok: paid %, sessions taken %, tutor pay %, outstanding %', v_paid, v_used, v_pay, v_out;",
        "end",
        "$check$;",
        "",
        "commit;",
    ]
    trailer: list[str] = []
    if skipped:
        trailer = ["", "-- Skipped, needs a person first:"] + [f"--   {item}" for item in skipped]
    sql = "\n".join(header + blocks + check + trailer) + "\n"
    return sql, written, skipped


# ------------------------------------------------------------------ main


def _parse_expect(text: str) -> dict[str, Decimal]:
    out: dict[str, Decimal] = {}
    for part in text.split(","):
        key, _, value = part.partition("=")
        if key.strip() in TARGETS and parse_number(value) is not None:
            out[key.strip()] = parse_number(value)
    return out


def _report(rows: list[dict], expect: dict[str, Decimal], lines_read: int) -> bool:
    now = totals(rows)
    labels = [("paid", "paid (KES)"), ("taken", "sessions taken"), ("pay", "tutor pay (KES)"), ("outstanding", "tutor pay outstanding (KES)")]
    parents = sorted({r["parent"] for r in rows})
    print(f"{lines_read} lesson lines read under {len(parents)} parents; {len(rows)} rows in the review")
    print("Totals, counting the lines that are not held back:")
    differs = False
    for key, label in labels:
        gap = now[key] - expect[key]
        differs = differs or gap != 0
        print(f"  {label:<30} {thousands(now[key]):>10}   target {thousands(expect[key]):>10}   {'same' if gap == 0 else 'difference ' + thousands(gap)}")
    print(f"  sessions paid per the packs     {thousands(now['sessions_paid']):>10}   (blank 'sessions paid' cells are filled in so every pack is valid)")
    held = [r for r in rows if is_held(r) and not is_skipped(r)]
    if held:
        extra = totals([dict(r, decision="attach") for r in held])
        print(f"Held for a decision: {len(held)} continuation line(s), with no student, tutor or subject:")
        for r in held:
            print(
                f"  row {r['source_row']} ({r['parent']}): KES {thousands(_d(r['amount_kes']))} paid, "
                f"{fmt(_d(r['sessions_taken']))} taken, tutor pay KES {thousands(_d(r['tutor_pay_kes']))}"
            )
        both = {k: now[k] + extra[k] for k in ("paid", "taken", "pay", "outstanding")}
        print(
            "  Set decision to 'attach' in review.csv to add them to the line above; the totals then become "
            f"paid {thousands(both['paid'])}, taken {fmt(both['taken'])}, tutor pay {thousands(both['pay'])}, outstanding {thousands(both['outstanding'])}."
        )
    unmatched = sorted({r["parent"] for r in rows if family_ref(r) is None and not is_skipped(r)})
    if unmatched:
        print(f"Families to match by hand: {len(unmatched)} of {len(parents)} have no family_phone or family_id yet")
    flagged = sum(1 for r in rows if r["flags"])
    print(f"{flagged} rows carry a flag")
    print("RESULT: " + ("differs from the targets" if differs else "matches the targets"))
    return not differs


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(prog="tracker_dry_run.py", description="Payment-tracker dry run for the CRM")
    parser.add_argument("source", help="the tracker (.xlsx or .csv), or review.csv with --from-review")
    parser.add_argument("out_dir")
    parser.add_argument("--from-review", action="store_true", help="rebuild import.sql from a filled-in review.csv")
    parser.add_argument("--tutors", help="a CSV of tutor names and phones, when the workbook has no Tutors sheet")
    parser.add_argument("--expect", help="paid=..,taken=..,pay=..,outstanding=.. (default: the audit's totals)")
    parser.add_argument("--check", action="store_true", help="exit 1 when the totals differ from the targets")
    args = parser.parse_args(argv[1:])

    source, out_dir = Path(args.source), Path(args.out_dir)
    if not source.exists():
        print(f"No such file: {source}")
        return 2
    out_dir.mkdir(parents=True, exist_ok=True)
    expect = dict(TARGETS, **_parse_expect(args.expect or ""))

    if args.from_review:
        with source.open(newline="", encoding="utf-8") as handle:
            rows = [{col: (row.get(col) or "") for col in REVIEW_COLUMNS} for row in csv.DictReader(handle)]
        lines_read = len({r["source_row"] for r in rows})
    else:
        data = read_tracker(source, args.tutors)
        rows = [row for line in data.lines for row in propose(line, data.tutors)]
        lines_read = len(data.lines)
        with (out_dir / "review.csv").open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=REVIEW_COLUMNS)
            writer.writeheader()
            writer.writerows(rows)

    sql, written, skipped = build_import(rows)
    (out_dir / "import.sql").write_text(sql, encoding="utf-8")
    matches = _report(rows, expect, lines_read)
    importable = len(rows) - len(skipped)
    print(
        f"import.sql: {importable} of {len(rows)} rows ready (paid {thousands(written['paid'])}, "
        f"sessions taken {fmt(written['taken'])}, tutor pay {thousands(written['pay'])}, outstanding {thousands(written['outstanding'])}); "
        f"{len(skipped)} skipped and listed at its end"
    )
    print(f"wrote {out_dir / 'import.sql'}" + ("" if args.from_review else f" and {out_dir / 'review.csv'}"))
    return 1 if args.check and not matches else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

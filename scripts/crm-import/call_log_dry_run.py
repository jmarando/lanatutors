#!/usr/bin/env python3
"""
Call-log dry run for the Lana Tutors CRM.

Reads the team's "Client Call Tracking" sheet and writes two files into the
output folder:

  review.csv   one row per call, with the cleaned phone number, a proposed
               stage and next step, flags for anything a person must decide,
               and an empty `decision` column for the Resolved rows.
  import.sql   SQL that loads the review into the CRM through crm_upsert_family
               and crm_open_lead, with one lead per phone number. Rows that
               still need a decision are skipped and listed at the end.

Usage:
    python3 -I call_log_dry_run.py <call-log.xlsx|.csv> <out-dir> [--from-review]

`--from-review` rebuilds import.sql from an already-filled review.csv instead of
reading the spreadsheet again.

Only the Python standard library is used, so the script runs under `python3 -I`
on any machine. Nothing here writes to the database; import.sql is run by hand.

Spec: docs/superpowers/specs/2026-10-28-crm-redesign-design.md, section 6.
"""
from __future__ import annotations

import csv
import datetime as dt
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {
    "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

# The call log covers early September 2026 onwards. Dates outside this window are
# treated as a spreadsheet mistake and flagged for a person.
WINDOW_START = dt.date(2026, 8, 1)
WINDOW_END = dt.date(2026, 12, 31)

NAIROBI_OFFSET = "+03:00"

REVIEW_COLUMNS = [
    "phone",
    "phone_input",
    "parent_name",
    "call_date",
    "status",
    "proposed_stage",
    "next_step",
    "next_step_at",
    "needs_decision",
    "decision",
    "note",
    "flags",
]

STAGE_LABEL = {
    "new": "New",
    "contacted": "Contacted",
    "call_booked": "Call booked",
    "call_done": "Call done",
    "won": "Won",
    "lost": "Lost",
}


# ---------------------------------------------------------------- spreadsheet


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


def read_xlsx(path: Path) -> list[list[str]]:
    """Read the first worksheet of an .xlsx file with the standard library."""
    with zipfile.ZipFile(path) as book:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in book.namelist():
            root = ET.fromstring(book.read("xl/sharedStrings.xml"))
            for si in root.findall("m:si", NS):
                shared.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))

        sheet_name = "xl/worksheets/sheet1.xml"
        workbook = ET.fromstring(book.read("xl/workbook.xml"))
        sheets = workbook.find("m:sheets", NS)
        if sheets is not None and len(sheets) > 0:
            # Prefer a sheet named like a call log, otherwise the first one.
            chosen = None
            for index, sheet in enumerate(sheets, start=1):
                label = (sheet.get("name") or "").lower()
                if "call" in label:
                    chosen = index
                    break
            sheet_name = f"xl/worksheets/sheet{chosen or 1}.xml"

        rows: list[list[str]] = []
        root = ET.fromstring(book.read(sheet_name))
        for row in root.iter(f"{{{NS['m']}}}row"):
            values: list[str] = []
            column = 0
            for cell in row.findall("m:c", NS):
                ref = cell.get("r") or ""
                letters = re.match(r"([A-Z]+)", ref)
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
            rows.append(values)
    return rows


def read_csv(path: Path) -> list[list[str]]:
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return [row for row in csv.reader(handle)]


# ------------------------------------------------------------------- cleaning


def normalize_phone(value: str) -> str | None:
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


MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10,
    "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}


def excel_serial_to_date(value: float) -> dt.date:
    return dt.date(1899, 12, 30) + dt.timedelta(days=int(value))


def parse_date(value: str) -> tuple[dt.date | None, str]:
    """Read a date day-first. Returns the date and a flag when it is doubtful."""
    raw = (value or "").strip()
    if not raw:
        return None, "no date"
    if re.fullmatch(r"\d+(\.\d+)?", raw):
        number = float(raw)
        if 20000 <= number <= 80000:
            day = excel_serial_to_date(number)
            if not (WINDOW_START <= day <= WINDOW_END):
                return day, f"date {day.isoformat()} outside the sheet's period"
            return day, ""
        return None, f"unreadable date {raw!r}"

    iso = re.match(r"^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$", raw)
    if iso:
        try:
            day = dt.date(int(iso.group(1)), int(iso.group(2)), int(iso.group(3)))
        except ValueError:
            return None, f"impossible date {raw!r}"
        if not (WINDOW_START <= day <= WINDOW_END):
            return day, f"date {day.isoformat()} outside the sheet's period"
        return day, ""

    cleaned = re.sub(r"(\d+)(st|nd|rd|th)", r"\1", raw, flags=re.I)
    cleaned = cleaned.replace(",", " ").replace(".", "/").replace("-", "/")
    cleaned = re.sub(r"\s+", " ", cleaned).strip().lower()

    patterns = [
        (r"^(\d{1,2})/(\d{1,2})/(\d{4})$", "dmy"),
        (r"^(\d{1,2})/(\d{1,2})/(\d{2})$", "dmy2"),
        (r"^(\d{1,2}) ([a-z]+) (\d{4})$", "d_mon"),
        (r"^([a-z]+) (\d{1,2}) (\d{4})$", "mon_d"),
    ]
    for pattern, kind in patterns:
        match = re.match(pattern, cleaned)
        if not match:
            continue
        try:
            if kind == "dmy":
                day = dt.date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
            elif kind == "dmy2":
                day = dt.date(2000 + int(match.group(3)), int(match.group(2)), int(match.group(1)))
            elif kind == "d_mon":
                month = MONTHS.get(match.group(2)[:9])
                if not month:
                    return None, f"unknown month in {raw!r}"
                day = dt.date(int(match.group(3)), month, int(match.group(1)))
            else:
                month = MONTHS.get(match.group(1)[:9])
                if not month:
                    return None, f"unknown month in {raw!r}"
                day = dt.date(int(match.group(3)), month, int(match.group(2)))
        except ValueError:
            return None, f"impossible date {raw!r}"

        flags = []
        if not (WINDOW_START <= day <= WINDOW_END):
            flags.append(f"date {day.isoformat()} outside the sheet's period")
        if "/" in cleaned and int(match.group(1)) <= 12 and int(match.group(2)) <= 12:
            flags.append("day and month could be swapped")
        return day, "; ".join(flags)
    return None, f"unreadable date {raw!r}"


def yes(value: str) -> bool:
    return (value or "").strip().lower() in {"yes", "y", "true", "1"}


# ------------------------------------------------------------------ proposals


def propose(row: dict[str, str]) -> dict[str, str]:
    raw_phone = (row.get("phone") or "").strip()
    row["phone_input"] = raw_phone
    row["phone"] = normalize_phone(raw_phone) or raw_phone
    status = (row.get("status") or "").strip()
    note = (row.get("notes") or "").strip()
    lowered = status.lower()
    note_lower = note.lower()

    stage = "new"
    needs_decision = "no"
    if "resolved" in lowered or "closed" in lowered:
        stage = ""
        needs_decision = "yes"
    elif any(word in lowered for word in ("in progress", "escalated", "contacted", "interesting")):
        stage = "contacted"
    elif any(word in lowered for word in ("open", "no answer", "new", "pending")):
        stage = "new"

    # The notes say when the assessment call was actually booked or held.
    if stage in {"new", "contacted"}:
        if re.search(r"assessment (call )?(done|held|completed)|call (done|held|completed)", note_lower):
            stage = "call_done"
        elif re.search(r"(booked|scheduled).{0,20}(call|assessment)|(call|assessment).{0,20}(booked|scheduled)", note_lower):
            stage = "call_booked"

    day, date_flag = parse_date(row.get("date") or "")
    follow_day, follow_flag = parse_date(row.get("follow_up_date") or "")

    next_step = ""
    next_step_at = ""
    if needs_decision == "no":
        if yes(row.get("follow_up_needed") or "") and follow_day:
            next_step = "Follow up"
            next_step_at = f"{follow_day.isoformat()}T09:00:00{NAIROBI_OFFSET}"
        elif day:
            next_step = "Call the family" if stage == "new" else "Check in"
            next_step_at = f"{(day + dt.timedelta(days=1)).isoformat()}T09:00:00{NAIROBI_OFFSET}"

    flags = []
    if not normalize_phone(row.get("phone") or ""):
        flags.append("phone missing or too short")
    if date_flag:
        flags.append(date_flag)
    if follow_flag and follow_flag != "no date":
        flags.append(f"follow-up {follow_flag}")
    if needs_decision == "yes":
        flags.append("decision needed: won or lost")
    if not next_step and needs_decision == "no":
        flags.append("no next step proposed")

    row["proposed_stage"] = stage
    row["needs_decision"] = needs_decision
    row["next_step"] = next_step
    row["next_step_at"] = next_step_at
    row["call_date"] = day.isoformat() if day else ""
    row["flags"] = "; ".join(flags)
    return row


# ---------------------------------------------------------------------- input


HEADER_HINTS = {
    "date": ("date",),
    "parent_name": ("client", "name"),
    "phone": ("phone", "mobile", "number"),
    "notes": ("comment", "note"),
    "status": ("status",),
    "follow_up_needed": ("follow", "needed"),
    "follow_up_date": ("follow", "date"),
}


def find_header(rows: list[list[str]]) -> tuple[int, dict[str, int]]:
    for index, row in enumerate(rows[:15]):
        cells = [str(cell).strip().lower() for cell in row]
        joined = " | ".join(cells)
        if "phone" in joined and "status" in joined:
            mapping: dict[str, int] = {}
            for column, cell in enumerate(cells):
                if not cell:
                    continue
                if "follow" in cell and "date" in cell:
                    mapping.setdefault("follow_up_date", column)
                elif "follow" in cell:
                    mapping.setdefault("follow_up_needed", column)
                elif "phone" in cell or "mobile" in cell:
                    mapping.setdefault("phone", column)
                elif "status" in cell:
                    mapping.setdefault("status", column)
                elif "client" in cell or cell == "name":
                    mapping.setdefault("parent_name", column)
                elif "comment" in cell or "note" in cell:
                    mapping.setdefault("notes", column)
                elif "date" in cell:
                    mapping.setdefault("date", column)
            return index, mapping
    raise SystemExit("Could not find the header row (it needs at least Phone and Status).")


def read_rows(path: Path) -> list[dict[str, str]]:
    raw = read_csv(path) if path.suffix.lower() == ".csv" else read_xlsx(path)
    header_index, mapping = find_header(raw)
    out: list[dict[str, str]] = []
    for row in raw[header_index + 1:]:
        if not any(str(cell).strip() for cell in row):
            continue
        record = {key: str(row[column]).strip() if column < len(row) else "" for key, column in mapping.items()}
        record.setdefault("phone", "")
        record.setdefault("parent_name", "")
        record.setdefault("notes", "")
        record.setdefault("status", "")
        record.setdefault("date", "")
        record.setdefault("follow_up_needed", "")
        record.setdefault("follow_up_date", "")
        out.append(record)
    return out


# ----------------------------------------------------------------------- sql


def sql_text(value: str | None) -> str:
    if value is None or value == "":
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def sql_timestamp(value: str | None, fallback: str = "2026-09-01T10:00:00+03:00") -> str:
    return "timestamptz " + sql_text(value or fallback)


def build_import(rows: list[dict[str, str]]) -> str:
    """One block per phone: family, open lead, timeline entries, then the stage."""
    grouped: dict[str, list[dict[str, str]]] = {}
    skipped: list[str] = []
    for row in rows:
        phone = normalize_phone(row.get("phone") or "")
        if not phone:
            skipped.append(f"{row.get('parent_name', '')} — phone {row.get('phone', '')!r}")
            continue
        if row.get("needs_decision") == "yes" and (row.get("decision") or "").strip().lower() not in {"won", "lost"}:
            skipped.append(f"{row.get('parent_name', '')} — {phone} — resolved row with no decision")
            continue
        row["phone"] = phone
        grouped.setdefault(phone, []).append(row)

    lines = [
        "-- Generated by scripts/crm-import/call_log_dry_run.py.",
        "-- Run once, after drizzle/migrations/0004_crm_leads.sql, in the Supabase SQL editor.",
        "-- Review review.csv first. Rows without a decision are skipped (listed at the end).",
        "begin;",
        "",
    ]

    for phone, calls in grouped.items():
        calls.sort(key=lambda r: r.get("call_date") or "")
        first = calls[0]
        last = calls[-1]
        name = (last.get("parent_name") or first.get("parent_name") or "").strip()
        stage = (last.get("decision") or last.get("proposed_stage") or "new").strip().lower()
        if stage not in STAGE_LABEL:
            stage = "new"
        lost_reason = "" if stage != "lost" else "went_elsewhere"
        next_step = last.get("next_step") or ""
        next_step_at = last.get("next_step_at") or ""
        created_at = f"{first.get('call_date') or '2026-09-01'}T10:00:00{NAIROBI_OFFSET}"

        block = [
            f"-- {name or 'Unnamed'} · {phone} · {len(calls)} call(s)",
            "do $$",
            "declare",
            "  f uuid;",
            "  l uuid;",
            "begin",
            f"  f := public.crm_upsert_family({sql_text(phone)}, {sql_text(name)}, NULL);",
            "  l := public.crm_open_lead(",
            "    f, 'import', 'crm_import_call_log', " + sql_text(phone) + ",",
            f"    {sql_timestamp(created_at)});",
        ]
        for index, call in enumerate(calls, start=1):
            body = call.get("notes") or ""
            status = call.get("status") or ""
            meta_status = "no_answer" if "no answer" in status.lower() else "reached"
            at = f"{call.get('call_date') or '2026-09-01'}T10:00:00{NAIROBI_OFFSET}"
            meta = json.dumps({"source": "call_log", "outcome": meta_status, "status": status})
            source_id = f"{phone}:{call.get('call_date') or 'undated'}:{index}"
            block.append(
                "  insert into public.lead_activities "
                "(family_id, lead_id, kind, body, meta, occurred_at, source_table, source_id)\n"
                f"  values (f, l, 'call', {sql_text(body)}, {sql_text(meta)}::jsonb, "
                f"{sql_timestamp(at)}, 'crm_import_call_log', {sql_text(source_id)}) "
                "on conflict do nothing;"
            )
        if stage == "lost":
            block.append(
                f"  update public.leads set stage = 'lost', lost_reason = {sql_text(lost_reason)}, "
                f"lost_at = {sql_timestamp(created_at)}, next_step = NULL, next_step_at = NULL where id = l;"
            )
        else:
            block.append(
                "  update public.leads set stage = " + sql_text(stage) + ", next_step = "
                + sql_text(next_step or None) + ", next_step_at = "
                + (sql_timestamp(next_step_at) if next_step_at else "NULL")
                + " where id = l;"
            )
        block += ["end $$;", ""]
        lines.extend(block)

    lines.append("commit;")
    if skipped:
        lines.append("")
        lines.append("-- Skipped, needs a person first:")
        for item in skipped:
            lines.append(f"--   {item}")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------- main


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print(__doc__)
        return 2
    source = Path(argv[1])
    out_dir = Path(argv[2])
    from_review = "--from-review" in argv

    if not source.exists() and not from_review:
        print(f"No such file: {source}")
        return 2
    out_dir.mkdir(parents=True, exist_ok=True)

    if from_review:
        review_path = out_dir / "review.csv"
        if not review_path.exists():
            print(f"--from-review needs {review_path}")
            return 2
        with review_path.open(newline="", encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
        for row in rows:
            row.setdefault("decision", "")
    else:
        raw_rows = read_rows(source)
        rows = []
        seen: dict[str, int] = {}
        for raw in raw_rows:
            row = propose(dict(raw))
            phone = normalize_phone(row.get("phone") or "")
            if phone:
                seen[phone] = seen.get(phone, 0) + 1
                if seen[phone] > 1:
                    row["flags"] = "; ".join(
                        filter(None, [row.get("flags", ""), f"phone already seen ({seen[phone]} rows)"])
                    )
            row["decision"] = ""
            rows.append(row)

        review_path = out_dir / "review.csv"
        with review_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=REVIEW_COLUMNS, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)

    import_path = out_dir / "import.sql"
    import_path.write_text(build_import(rows), encoding="utf-8")
    review_path = out_dir / "review.csv"

    needs = sum(
        1
        for row in rows
        if row.get("needs_decision") == "yes"
        and (row.get("decision") or "").strip().lower() not in {"won", "lost"}
    )
    flagged = sum(1 for row in rows if row.get("flags"))
    print(f"{len(rows)} calls read")
    print(f"{needs} Resolved rows still need a Won or Lost decision")
    print(f"{flagged} rows carry a flag")
    if not from_review:
        print(f"wrote {review_path}")
    print(f"wrote {import_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

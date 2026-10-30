/**
 * Every write the lessons screens make to lesson reports lives here, so a tutor-facing screen can
 * reuse it later. The database does the arithmetic: when a report is saved it picks the oldest pack
 * with a session left and fixes the tutor's pay, and deleting a report gives the session back.
 */
import { crmDb } from "./crmTypes";
import type { LessonReport, LessonReportInsert, LessonReportUpdate } from "./crmTypes";
import { countsAsSession } from "./lessonsLogic";

export interface ConfirmResult {
  error: string | null;
  reports: LessonReport[];
  /** Lessons that count as a session but found no paid one to use: their tutor pay is not set yet. */
  unpriced: number;
}

/** Confirm one or more lessons. All of them are saved, or none. */
export async function confirmLessons(rows: LessonReportInsert[]): Promise<ConfirmResult> {
  const { data, error } = await crmDb.from("lesson_reports").insert(rows).select();
  const reports = (data ?? []) as unknown as LessonReport[];
  return {
    error: error?.message ?? null,
    reports,
    unpriced: reports.filter((r) => countsAsSession(r.attendance) && r.pack_id === null).length,
  };
}

/** Undo a confirmation: the lesson goes back to "Needs confirming" and its session to the pack. */
export async function undoConfirmation(reportId: string): Promise<string | null> {
  const { error } = await crmDb.from("lesson_reports").delete().eq("id", reportId);
  return error?.message ?? null;
}

/** Correct what was covered, the homework or the engagement score. Attendance cannot be edited. */
export async function saveReportNotes(
  reportId: string,
  notes: LessonReportUpdate,
): Promise<string | null> {
  const { error } = await crmDb.from("lesson_reports").update(notes).eq("id", reportId);
  return error?.message ?? null;
}

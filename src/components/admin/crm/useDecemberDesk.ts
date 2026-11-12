import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { pickProgram, type HolidayProgram } from "@/utils/holidayClasses";
import type { DeskNote } from "@/utils/decemberDesk";
import { crmDb } from "./crmTypes";
import { nairobiDate } from "./crmMeta";

export interface DeskClass {
  id: string;
  subject: string;
  curriculum: string;
  grade_levels: string[];
  time_slot: string;
  max_students: number;
  current_enrollment: number;
  status: string;
  tutor_id: string | null;
  meeting_link: string | null;
  tutor_name: string | null;
}

export interface DeskFamily {
  id: string;
  parent_name: string | null;
  phone: string | null;
  email: string | null;
  parent_profile_id: string | null;
}

export type DeskNoteRow = DeskNote & { families: DeskFamily | null };

export interface DeskData {
  program: HolidayProgram | null;
  classes: DeskClass[];
  notes: DeskNoteRow[];
}

const NOTE_LIMIT = 2000;
const EMPTY: DeskData = { program: null, classes: [], notes: [] };

async function readTutorNames(tutorIds: (string | null)[]): Promise<Map<string, string>> {
  const ids = [...new Set(tutorIds.filter((id): id is string => Boolean(id)))];
  const names = new Map<string, string>();
  if (ids.length === 0) return names;
  const { data: tutors, error } = await supabase.from("tutor_profiles").select("id, user_id").in("id", ids);
  if (error) throw error;
  const { data: people, error: peopleError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", (tutors ?? []).map((t) => t.user_id));
  if (peopleError) throw peopleError;
  for (const tutor of tutors ?? []) {
    const name = people?.find((p) => p.id === tutor.user_id)?.full_name;
    if (name) names.set(tutor.id, name);
  }
  return names;
}

/**
 * The December program, its classes and every `DEC26` timeline note. A failed read is an error, never an empty desk: the
 * page shows the error and no seat counts, so nothing reads as zero by mistake.
 */
export function useDecemberDesk() {
  const [data, setData] = useState<DeskData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data: programs, error: programError } = await supabase
        .from("intensive_programs")
        .select("id, name, description, start_date, end_date")
        .eq("is_active", true);
      if (programError) throw programError;
      const program = pickProgram(programs ?? [], nairobiDate());
      if (!program) {
        setData(EMPTY);
        setError(null);
        return;
      }

      const [classRes, noteRes] = await Promise.all([
        supabase
          .from("intensive_classes")
          .select("id, subject, curriculum, grade_levels, time_slot, max_students, current_enrollment, status, tutor_id, meeting_link")
          .eq("program_id", program.id)
          .in("status", ["active", "confirmed", "archived"]),
        crmDb
          .from("lead_activities")
          .select("id, family_id, body, occurred_at, created_at, families(id, parent_name, phone, email, parent_profile_id)")
          .eq("kind", "note")
          .ilike("body", "%DEC26%")
          .order("occurred_at", { ascending: true })
          .limit(NOTE_LIMIT),
      ]);
      if (classRes.error) throw classRes.error;
      if (noteRes.error) throw noteRes.error;
      const notes = (noteRes.data ?? []) as unknown as DeskNoteRow[];
      if (notes.length >= NOTE_LIMIT) throw new Error(`There are ${NOTE_LIMIT} or more December notes, more than the desk reads`);

      const rows = classRes.data ?? [];
      const tutorNames = await readTutorNames(rows.map((c) => c.tutor_id));
      setData({
        program,
        classes: rows.map((c) => ({ ...c, tutor_name: c.tutor_id ? (tutorNames.get(c.tutor_id) ?? null) : null })),
        notes,
      });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : ((e as { message?: string })?.message ?? "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

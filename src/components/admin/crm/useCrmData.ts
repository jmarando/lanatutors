import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { crmDb } from "./crmTypes";
import type {
  CrmSettings,
  Family,
  Lead,
  LeadActivity,
  LeadWithFamily,
  ListedTutor,
  TeamMember,
  WhatsAppConversation,
} from "./crmTypes";
import { OPEN_STAGES } from "./crmTypes";

const OPEN_STAGE_LIST = [...OPEN_STAGES];

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

function message(error: { message?: string } | null | undefined): string | null {
  return error?.message ?? null;
}

/** Every open lead, with its family joined in, newest activity first. */
export function useOpenLeads(): AsyncState<LeadWithFamily[]> {
  const [data, setData] = useState<LeadWithFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data: rows, error: err } = await crmDb
      .from("leads")
      .select("*, families(id, parent_name, phone, email, status)")
      .in("stage", OPEN_STAGE_LIST)
      .order("last_activity_at", { ascending: false })
      .limit(500);
    setError(message(err));
    setData((rows ?? []) as unknown as LeadWithFamily[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

/** Won and lost leads from the last `days`, for the Closed tab. */
export function useClosedLeads(days = 90): AsyncState<LeadWithFamily[]> {
  const [data, setData] = useState<LeadWithFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data: rows, error: err } = await crmDb
      .from("leads")
      .select("*, families(id, parent_name, phone, email, status)")
      .in("stage", ["won", "lost"])
      .gte("last_activity_at", since)
      .order("last_activity_at", { ascending: false })
      .limit(300);
    setError(message(err));
    setData((rows ?? []) as unknown as LeadWithFamily[]);
    setLoading(false);
  }, [days]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export interface FamilyBundle {
  family: Family | null;
  leads: Lead[];
  activities: LeadActivity[];
  conversation: WhatsAppConversation | null;
}

/** One family, all its leads, the timeline and the WhatsApp chat. */
export function useFamily(id: string | undefined): AsyncState<FamilyBundle> {
  const [data, setData] = useState<FamilyBundle>({
    family: null,
    leads: [],
    activities: [],
    conversation: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [familyRes, leadsRes, activitiesRes, conversationRes] = await Promise.all([
      crmDb.from("families").select("*").eq("id", id).maybeSingle(),
      crmDb.from("leads").select("*").eq("family_id", id).order("created_at", { ascending: false }),
      crmDb
        .from("lead_activities")
        .select("*")
        .eq("family_id", id)
        .order("occurred_at", { ascending: false })
        .limit(200),
      crmDb
        .from("whatsapp_conversations")
        .select("*")
        .eq("family_id", id)
        .maybeSingle(),
    ]);
    setError(
      message(familyRes.error) ??
        message(leadsRes.error) ??
        message(activitiesRes.error) ??
        message(conversationRes.error),
    );
    setData({
      family: (familyRes.data ?? null) as unknown as Family | null,
      leads: (leadsRes.data ?? []) as unknown as Lead[],
      activities: (activitiesRes.data ?? []) as unknown as LeadActivity[],
      conversation: (conversationRes.data ?? null) as unknown as WhatsAppConversation | null,
    });
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

/** Admins, for the owner and next-step-person pickers. */
export function useTeam(): { team: TeamMember[]; loading: boolean } {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await crmDb.rpc("crm_team_members");
      if (!active) return;
      if (!error) setTeam((data ?? []) as TeamMember[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { team, loading };
}

/** The CRM settings row: who new leads go to. */
export function useCrmSettings() {
  const [settings, setSettings] = useState<CrmSettings | null>(null);

  const reload = useCallback(async () => {
    const { data } = await crmDb.from("crm_settings").select("*").maybeSingle();
    setSettings((data ?? null) as unknown as CrmSettings | null);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { settings, reload };
}

/** Listed tutors, for the assessment call's recommended tutor. */
export function useListedTutors(): ListedTutor[] {
  const [tutors, setTutors] = useState<ListedTutor[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("tutor_profiles")
        .select("id, user_id")
        .eq("is_listed", true)
        .limit(300);
      if (!active || !data) return;
      const ids = data.map((t) => t.user_id).filter((v): v is string => Boolean(v));
      let names = new Map<string, string>();
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        names = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Tutor"]));
      }
      if (!active) return;
      setTutors(
        data.map((t) => ({
          id: t.id,
          name: (t.user_id && names.get(t.user_id)) || "Tutor",
        })),
      );
    })();
    return () => {
      active = false;
    };
  }, []);

  return tutors;
}

/** A short list of names for owner labels. */
export function useTeamNames() {
  const { team } = useTeam();
  return useMemo(() => new Map(team.map((m) => [m.user_id, m.full_name])), [team]);
}

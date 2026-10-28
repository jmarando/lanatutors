/**
 * Meta CRM (offline / system-generated) lead-stage events.
 *
 * Follows Meta's CRM implementation guide: as a lead moves through our funnel we
 * send a server-side event with action_source = "system_generated" and a
 * lead_event_source label, so Meta can optimise lead ads for quality, not volume.
 */
import { supabase } from "@/integrations/supabase/client";

export const LEAD_EVENT_SOURCE = "Lana Tutors CRM";

/** Our CRM funnel stages mapped to Meta CRM event names. */
export const CRM_EVENTS = {
  lead: "Lead",
  contacted: "Contacted",
  qualified: "QualifiedLead",
  scheduled: "AssessmentCallCompleted",
  converted: "ConvertedLead",
  disqualified: "DisqualifiedLead",
} as const;

export type CrmStage = keyof typeof CRM_EVENTS;

export interface CrmLead {
  /** Stable id of the record in our database — used for de-duplication. */
  recordId: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  /** Meta lead ads leadgen id, when the lead came from a Meta lead form. */
  leadId?: string | number | null;
  value?: number;
  currency?: string;
  customData?: Record<string, unknown>;
}

/** Send one CRM stage update to Meta's Conversions API. */
export async function sendCrmEvent(stage: CrmStage, lead: CrmLead) {
  const eventName = CRM_EVENTS[stage];
  try {
    const { error } = await supabase.functions.invoke("meta-capi", {
      body: {
        event_name: eventName,
        event_id: `crm-${stage}-${lead.recordId}`,
        action_source: "system_generated",
        lead_event_source: LEAD_EVENT_SOURCE,
        email: lead.email ?? undefined,
        phone: lead.phone ?? undefined,
        first_name: lead.firstName ?? undefined,
        last_name: lead.lastName ?? undefined,
        lead_id: lead.leadId ?? undefined,
        external_id: lead.recordId,
        custom_data: {
          lead_stage: stage,
          content_name: "Assessment Call",
          ...(lead.value != null ? { value: lead.value, currency: lead.currency ?? "KES" } : {}),
          ...(lead.customData ?? {}),
        },
      },
    });
    if (error) throw error;
  } catch (e) {
    // Tracking must never block CRM actions.
    console.error(`Meta CRM ${eventName} failed:`, e);
  }
}

/** Split a full name into first/last for Meta's matching fields. */
export function splitName(fullName?: string | null) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || undefined };
}

/** Map our consultation follow_up_status values onto CRM stages. */
export function stageFromFollowUpStatus(status: string): CrmStage | null {
  switch (status) {
    case "pending":
      return null;
    case "follow_up_sent":
      return "contacted";
    case "interested":
    case "qualified":
      return "qualified";
    case "converted":
      return "converted";
    case "not_interested":
    case "lost":
      return "disqualified";
    default:
      return null;
  }
}

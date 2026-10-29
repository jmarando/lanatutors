/**
 * Types for the CRM leads slice.
 *
 * `src/integrations/supabase/types.ts` is generated, so the new tables are typed
 * here until Lovable regenerates it. `crmDb` is the same authenticated client as
 * `supabase`, only with these tables in its type.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const OPEN_STAGES = ["new", "contacted", "call_booked", "call_done"] as const;

export type Stage = "new" | "contacted" | "call_booked" | "call_done" | "won" | "lost";

export type Channel =
  | "whatsapp"
  | "assessment_form"
  | "website_form"
  | "phone"
  | "email"
  | "referral"
  | "walk_in"
  | "import"
  | "other";

export type LostReason =
  | "price"
  | "timing"
  | "no_reply"
  | "not_a_fit"
  | "went_elsewhere"
  | "stale"
  | "other";

export type FamilyStatus = "prospect" | "active" | "paused" | "former";

export type ActivityKind =
  | "note"
  | "call"
  | "whatsapp"
  | "email"
  | "stage_change"
  | "assessment"
  | "system";

export type Family = {
  id: string;
  parent_name: string | null;
  phone: string | null;
  email: string | null;
  area: string | null;
  parent_profile_id: string | null;
  status: FamilyStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type Lead = {
  id: string;
  family_id: string;
  channel: Channel;
  source_table: string | null;
  source_id: string | null;
  stage: Stage;
  owner_id: string | null;
  next_step: string | null;
  next_step_at: string | null;
  next_step_owner_id: string | null;
  needs_reply: boolean;
  student_name: string | null;
  grade_level: string | null;
  curriculum: string | null;
  subjects: string[];
  mode: string | null;
  budget: string | null;
  urgency: string | null;
  assessment_at: string | null;
  assessment_outcome: string | null;
  recommended_tutor_id: string | null;
  quoted_rate_kes: number | null;
  quoted_package: string | null;
  lost_reason: LostReason | null;
  won_at: string | null;
  lost_at: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export type LeadActivity = {
  id: string;
  family_id: string;
  lead_id: string | null;
  kind: ActivityKind;
  body: string | null;
  meta: Record<string, unknown>;
  source_table: string | null;
  source_id: string | null;
  created_by: string | null;
  occurred_at: string;
  created_at: string;
}

export type CrmSettings = {
  id: boolean;
  default_owner_id: string | null;
  updated_at: string;
}

export interface TeamMember {
  user_id: string;
  full_name: string;
}

/** A lead with its family joined in, as the lists read it. */
export type LeadWithFamily = Lead & {
  families: Pick<Family, "id" | "parent_name" | "phone" | "email" | "status"> | null;
};

export interface WhatsAppMessage {
  role?: "user" | "model";
  content?: string;
  ts?: string;
  sent_by?: string;
}

export type WhatsAppConversation = {
  phone_number: string;
  profile_name: string | null;
  family_id: string | null;
  messages: WhatsAppMessage[];
  escalated: boolean;
  escalated_at: string | null;
  last_message_at: string | null;
}

export interface ListedTutor {
  id: string;
  name: string;
}

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type CrmDatabase = {
  public: {
    Tables: {
      families: Table<
        Family,
        Partial<Omit<Family, "id">> & { id?: string },
        Partial<Omit<Family, "id">>
      >;
      leads: Table<
        Lead,
        Partial<Omit<Lead, "id" | "created_at" | "updated_at">> & { family_id: string },
        Partial<Omit<Lead, "id" | "created_at" | "family_id">>
      >;
      lead_activities: Table<
        LeadActivity,
        Partial<Omit<LeadActivity, "id" | "created_at" | "occurred_at">> & { family_id: string },
        Partial<Omit<LeadActivity, "id" | "created_at" | "family_id">>
      >;
      crm_settings: Table<
        CrmSettings,
        Partial<CrmSettings> & { id: boolean },
        Partial<Omit<CrmSettings, "id">>
      >;
      whatsapp_conversations: Table<
        WhatsAppConversation & { updated_at: string },
        Partial<WhatsAppConversation> & { phone_number: string },
        Partial<WhatsAppConversation>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      crm_create_lead: {
        Args: {
          p_phone: string;
          p_parent_name: string;
          p_channel?: string;
          p_student_name?: string | null;
          p_grade_level?: string | null;
          p_curriculum?: string | null;
          p_subjects?: string[];
          p_note?: string | null;
          p_email?: string | null;
        };
        Returns: string;
      };
      crm_team_members: {
        Args: Record<string, never>;
        Returns: TeamMember[];
      };
      crm_set_default_owner: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** The authenticated client, typed for the CRM tables. */
export const crmDb = supabase as unknown as SupabaseClient<CrmDatabase>;

/** The columns the CRM screens are allowed to change. */
export type LeadUpdate = Partial<Omit<Lead, "id" | "family_id" | "created_at" | "updated_at">>;

/** Read one lead with its family joined in. */
export type LeadRow = LeadWithFamily;

/**
 * `consultation_bookings` gains a `family_id` column in the CRM migration. Until
 * Lovable regenerates the types, this narrow client reads just the meeting link.
 */
export type ConsultationBookingLite = {
  id: string;
  family_id: string | null;
  meeting_link: string | null;
};

type ConsultationDatabase = {
  public: {
    Tables: {
      consultation_bookings: {
        Row: ConsultationBookingLite;
        Insert: Partial<ConsultationBookingLite>;
        Update: Partial<ConsultationBookingLite>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const crmConsultations = supabase as unknown as SupabaseClient<ConsultationDatabase>;

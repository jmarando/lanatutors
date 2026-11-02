/**
 * Types for the CRM leads slice.
 *
 * `src/integrations/supabase/types.ts` is generated, so the new tables are typed
 * here until Lovable regenerates it. `crmDb` is the same authenticated client as
 * `supabase`, only with these tables in its type.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Attendance } from "./lessonsLogic";

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
  /** Cut-over: lessons that ended before this are history, not "Needs confirming". */
  lessons_from: string;
  updated_at: string;
}

export type EnrolmentStatus = "active" | "paused" | "ended";

/** One child, one subject and one tutor for a family: a line of the payment tracker. */
export type Enrolment = {
  id: string;
  family_id: string;
  student_name: string | null;
  student_id: string | null;
  subject: string;
  tutor_id: string | null;
  status: EnrolmentStatus;
  rate_per_session: number | null;
  opening_tutor_pay_kes: number | null;
  opening_tutor_paid_kes: number | null;
  opening_tutor_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** What a family prepaid for an enrolment. A top-up is a new pack. */
export type SessionPack = {
  id: string;
  enrolment_id: string;
  amount_kes: number;
  reference: string | null;
  /** Empty for packs imported from the tracker, which has no payment dates. */
  paid_on: string | null;
  sessions_bought: number;
  rate_per_session: number;
  sessions_used: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

/** The pack, the enrolment and the tutor's pay are filled in by the database when this is saved. */
export type LessonReport = {
  id: string;
  booking_id: string;
  enrolment_id: string | null;
  attendance: Attendance;
  covered: string | null;
  homework: string | null;
  engagement: number | null;
  tutor_pay_kes: number | null;
  pack_id: string | null;
  confirmed_by: string | null;
  confirmed_at: string;
  created_at: string;
}

export type LessonReportInsert = {
  booking_id: string;
  attendance: Attendance;
  covered?: string | null;
  homework?: string | null;
  engagement?: number | null;
}

export type LessonReportUpdate = {
  covered?: string | null;
  homework?: string | null;
  engagement?: number | null;
}

/** crm_enrolment_balances: sessions and credit per enrolment, with the family's names joined in. */
export type EnrolmentBalance = {
  enrolment_id: string;
  family_id: string;
  family_name: string | null;
  family_phone: string | null;
  student_name: string | null;
  subject: string;
  tutor_id: string | null;
  tutor_name: string | null;
  status: EnrolmentStatus;
  rate_per_session: number | null;
  packs: number;
  sessions_bought: number;
  sessions_used: number;
  sessions_left: number;
  amount_paid: number;
  /** Paid minus sessions used times the rate: negative means the family owes. */
  balance: number;
  /** Counted lessons confirmed before any pack could pay for them. */
  unpriced_lessons: number;
  last_lesson_at: string | null;
}

/** crm_lessons: every lesson with its names and, once confirmed, its report. */
export type CrmLesson = {
  booking_id: string;
  enrolment_id: string | null;
  family_id: string | null;
  family_name: string | null;
  family_phone: string | null;
  student_name: string | null;
  subject: string;
  tutor_user_id: string;
  tutor_profile_id: string | null;
  tutor_name: string;
  starts_at: string;
  ends_at: string;
  booking_status: string;
  class_type: string | null;
  report_id: string | null;
  attendance: Attendance | null;
  covered: string | null;
  homework: string | null;
  engagement: number | null;
  tutor_pay_kes: number | null;
  pack_id: string | null;
  confirmed_at: string | null;
  /** False for lessons that ended before the cut-over. */
  tracked: boolean;
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
      enrolments: Table<
        Enrolment,
        Partial<Omit<Enrolment, "id" | "created_at" | "updated_at">> & {
          family_id: string;
          subject: string;
        },
        Partial<Omit<Enrolment, "id" | "family_id" | "created_at" | "updated_at">>
      >;
      session_packs: Table<
        SessionPack,
        Partial<Omit<SessionPack, "id" | "created_at">> & {
          enrolment_id: string;
          amount_kes: number;
          sessions_bought: number;
        },
        Partial<Omit<SessionPack, "id" | "enrolment_id" | "created_at">>
      >;
      lesson_reports: Table<LessonReport, LessonReportInsert, LessonReportUpdate>;
    };
    Views: {
      crm_enrolment_balances: { Row: EnrolmentBalance; Relationships: [] };
      crm_lessons: { Row: CrmLesson; Relationships: [] };
    };
    Functions: {
      crm_record_payment: {
        Args: {
          p_enrolment_id: string;
          p_amount_kes: number;
          p_reference?: string | null;
          p_paid_on?: string | null;
          p_sessions_bought: number;
          p_rate_per_session?: number | null;
        };
        Returns: string;
      };
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

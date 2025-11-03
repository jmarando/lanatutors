export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          amount: number
          availability_slot_id: string
          balance_due: number | null
          class_type: string | null
          created_at: string | null
          deposit_paid: number | null
          id: string
          meeting_link: string | null
          notes: string | null
          package_purchase_id: string | null
          payment_option: string | null
          status: string | null
          student_id: string
          subject: string
          tutor_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          availability_slot_id: string
          balance_due?: number | null
          class_type?: string | null
          created_at?: string | null
          deposit_paid?: number | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          package_purchase_id?: string | null
          payment_option?: string | null
          status?: string | null
          student_id: string
          subject: string
          tutor_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          availability_slot_id?: string
          balance_due?: number | null
          class_type?: string | null
          created_at?: string | null
          deposit_paid?: number | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          package_purchase_id?: string | null
          payment_option?: string | null
          status?: string | null
          student_id?: string
          subject?: string
          tutor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_availability_slot_id_fkey"
            columns: ["availability_slot_id"]
            isOneToOne: false
            referencedRelation: "tutor_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_purchase_id_fkey"
            columns: ["package_purchase_id"]
            isOneToOne: false
            referencedRelation: "package_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_bookings: {
        Row: {
          additional_notes: string | null
          consultation_date: string
          consultation_outcome: string | null
          consultation_time: string
          converted_at: string | null
          converted_to_customer: boolean | null
          created_at: string | null
          email: string | null
          follow_up_sent_at: string | null
          follow_up_status: string | null
          grade_level: string
          id: string
          meeting_link: string | null
          next_action: string | null
          next_action_date: string | null
          parent_name: string
          phone_number: string
          preferred_mode: string
          recommended_subjects: string[] | null
          recommended_tutors: string[] | null
          status: string
          student_name: string
          subjects_interest: string[]
          updated_at: string | null
        }
        Insert: {
          additional_notes?: string | null
          consultation_date: string
          consultation_outcome?: string | null
          consultation_time: string
          converted_at?: string | null
          converted_to_customer?: boolean | null
          created_at?: string | null
          email?: string | null
          follow_up_sent_at?: string | null
          follow_up_status?: string | null
          grade_level: string
          id?: string
          meeting_link?: string | null
          next_action?: string | null
          next_action_date?: string | null
          parent_name: string
          phone_number: string
          preferred_mode: string
          recommended_subjects?: string[] | null
          recommended_tutors?: string[] | null
          status?: string
          student_name: string
          subjects_interest: string[]
          updated_at?: string | null
        }
        Update: {
          additional_notes?: string | null
          consultation_date?: string
          consultation_outcome?: string | null
          consultation_time?: string
          converted_at?: string | null
          converted_to_customer?: boolean | null
          created_at?: string | null
          email?: string | null
          follow_up_sent_at?: string | null
          follow_up_status?: string | null
          grade_level?: string
          id?: string
          meeting_link?: string | null
          next_action?: string | null
          next_action_date?: string | null
          parent_name?: string
          phone_number?: string
          preferred_mode?: string
          recommended_subjects?: string[] | null
          recommended_tutors?: string[] | null
          status?: string
          student_name?: string
          subjects_interest?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      expert_consultation_requests: {
        Row: {
          additional_notes: string | null
          assigned_expert_id: string | null
          created_at: string | null
          email: string
          grade_levels: string[]
          id: string
          number_of_children: number
          package_preferences: string | null
          parent_name: string
          phone_number: string
          preferred_contact_time: string | null
          scheduled_call_time: string | null
          status: string | null
          subjects_of_interest: string[]
          updated_at: string | null
        }
        Insert: {
          additional_notes?: string | null
          assigned_expert_id?: string | null
          created_at?: string | null
          email: string
          grade_levels: string[]
          id?: string
          number_of_children: number
          package_preferences?: string | null
          parent_name: string
          phone_number: string
          preferred_contact_time?: string | null
          scheduled_call_time?: string | null
          status?: string | null
          subjects_of_interest: string[]
          updated_at?: string | null
        }
        Update: {
          additional_notes?: string | null
          assigned_expert_id?: string | null
          created_at?: string | null
          email?: string
          grade_levels?: string[]
          id?: string
          number_of_children?: number
          package_preferences?: string | null
          parent_name?: string
          phone_number?: string
          preferred_contact_time?: string | null
          scheduled_call_time?: string | null
          status?: string | null
          subjects_of_interest?: string[]
          updated_at?: string | null
        }
        Relationships: []
      }
      learning_assessments: {
        Row: {
          assessment_responses: Json
          completed_at: string | null
          consultation_booking_id: string | null
          created_at: string | null
          grade_level: string
          id: string
          identified_gaps: string[] | null
          learning_level: string | null
          learning_style: string | null
          recommended_approach: string | null
          recommended_tutors: Json | null
          strengths: string[] | null
          student_email: string
          student_name: string
          subjects: string[]
          suggested_learning_path: string | null
          updated_at: string | null
        }
        Insert: {
          assessment_responses?: Json
          completed_at?: string | null
          consultation_booking_id?: string | null
          created_at?: string | null
          grade_level: string
          id?: string
          identified_gaps?: string[] | null
          learning_level?: string | null
          learning_style?: string | null
          recommended_approach?: string | null
          recommended_tutors?: Json | null
          strengths?: string[] | null
          student_email: string
          student_name: string
          subjects: string[]
          suggested_learning_path?: string | null
          updated_at?: string | null
        }
        Update: {
          assessment_responses?: Json
          completed_at?: string | null
          consultation_booking_id?: string | null
          created_at?: string | null
          grade_level?: string
          id?: string
          identified_gaps?: string[] | null
          learning_level?: string | null
          learning_style?: string | null
          recommended_approach?: string | null
          recommended_tutors?: Json | null
          strengths?: string[] | null
          student_email?: string
          student_name?: string
          subjects?: string[]
          suggested_learning_path?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_assessments_consultation_booking_id_fkey"
            columns: ["consultation_booking_id"]
            isOneToOne: false
            referencedRelation: "consultation_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      package_offers: {
        Row: {
          created_at: string | null
          curriculum: string[] | null
          description: string | null
          discount_percentage: number | null
          exam_type: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          max_students: number | null
          name: string
          package_type: Database["public"]["Enums"]["package_type"] | null
          session_count: number
          subjects: string[] | null
          total_price: number
          tutor_id: string
          updated_at: string | null
          validity_days: number | null
        }
        Insert: {
          created_at?: string | null
          curriculum?: string[] | null
          description?: string | null
          discount_percentage?: number | null
          exam_type?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          max_students?: number | null
          name: string
          package_type?: Database["public"]["Enums"]["package_type"] | null
          session_count: number
          subjects?: string[] | null
          total_price: number
          tutor_id: string
          updated_at?: string | null
          validity_days?: number | null
        }
        Update: {
          created_at?: string | null
          curriculum?: string[] | null
          description?: string | null
          discount_percentage?: number | null
          exam_type?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          max_students?: number | null
          name?: string
          package_type?: Database["public"]["Enums"]["package_type"] | null
          session_count?: number
          subjects?: string[] | null
          total_price?: number
          tutor_id?: string
          updated_at?: string | null
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "package_offers_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      package_purchases: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          package_offer_id: string | null
          payment_status: string | null
          sessions_remaining: number
          sessions_used: number | null
          student_id: string
          total_amount: number
          total_sessions: number
          tutor_id: string
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          package_offer_id?: string | null
          payment_status?: string | null
          sessions_remaining: number
          sessions_used?: number | null
          student_id: string
          total_amount: number
          total_sessions: number
          tutor_id: string
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          package_offer_id?: string | null
          payment_status?: string | null
          sessions_remaining?: number
          sessions_used?: number | null
          student_id?: string
          total_amount?: number
          total_sessions?: number
          tutor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_purchases_package_offer_id_fkey"
            columns: ["package_offer_id"]
            isOneToOne: false
            referencedRelation: "package_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_purchases_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      package_recommendations: {
        Row: {
          assessment_id: string | null
          consultation_booking_id: string | null
          created_at: string | null
          id: string
          reasoning: string | null
          recommended_packages: Json
          updated_at: string | null
        }
        Insert: {
          assessment_id?: string | null
          consultation_booking_id?: string | null
          created_at?: string | null
          id?: string
          reasoning?: string | null
          recommended_packages?: Json
          updated_at?: string | null
        }
        Update: {
          assessment_id?: string | null
          consultation_booking_id?: string | null
          created_at?: string | null
          id?: string
          reasoning?: string | null
          recommended_packages?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_recommendations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "learning_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_recommendations_consultation_booking_id_fkey"
            columns: ["consultation_booking_id"]
            isOneToOne: false
            referencedRelation: "consultation_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          checkout_request_id: string | null
          created_at: string | null
          id: string
          merchant_request_id: string | null
          mpesa_receipt_number: string | null
          payment_type: string
          phone_number: string
          reference_id: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          checkout_request_id?: string | null
          created_at?: string | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          payment_type: string
          phone_number: string
          reference_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          checkout_request_id?: string | null
          created_at?: string | null
          id?: string
          merchant_request_id?: string | null
          mpesa_receipt_number?: string | null
          payment_type?: string
          phone_number?: string
          reference_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          created_at: string | null
          curriculum: string | null
          full_name: string | null
          grade_level: string | null
          id: string
          learning_goals: string | null
          phone_number: string | null
          preferred_learning_style: string | null
          subjects_struggling: string[] | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string | null
          curriculum?: string | null
          full_name?: string | null
          grade_level?: string | null
          id: string
          learning_goals?: string | null
          phone_number?: string | null
          preferred_learning_style?: string | null
          subjects_struggling?: string[] | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string | null
          curriculum?: string | null
          full_name?: string | null
          grade_level?: string | null
          id?: string
          learning_goals?: string | null
          phone_number?: string | null
          preferred_learning_style?: string | null
          subjects_struggling?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recording_purchases: {
        Row: {
          amount: number | null
          class_id: string
          id: string
          purchased_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          class_id: string
          id?: string
          purchased_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          class_id?: string
          id?: string
          purchased_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recording_subscriptions: {
        Row: {
          amount: number | null
          created_at: string | null
          end_date: string | null
          id: string
          start_date: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          user_id?: string
        }
        Relationships: []
      }
      tutor_applications: {
        Row: {
          admin_notes: string | null
          agreed_to_terms: boolean
          cambridge_qualification: string | null
          created_at: string
          current_school: string
          cv_url: string | null
          email: string
          full_name: string
          id: string
          interview_meet_link: string | null
          interview_notes: string | null
          interview_scheduled_at: string | null
          phone_number: string
          status: string
          subjects: string[] | null
          teaching_level: string | null
          tsc_number: string | null
          updated_at: string
          user_id: string | null
          years_of_experience: number
        }
        Insert: {
          admin_notes?: string | null
          agreed_to_terms?: boolean
          cambridge_qualification?: string | null
          created_at?: string
          current_school: string
          cv_url?: string | null
          email: string
          full_name: string
          id?: string
          interview_meet_link?: string | null
          interview_notes?: string | null
          interview_scheduled_at?: string | null
          phone_number: string
          status?: string
          subjects?: string[] | null
          teaching_level?: string | null
          tsc_number?: string | null
          updated_at?: string
          user_id?: string | null
          years_of_experience: number
        }
        Update: {
          admin_notes?: string | null
          agreed_to_terms?: boolean
          cambridge_qualification?: string | null
          created_at?: string
          current_school?: string
          cv_url?: string | null
          email?: string
          full_name?: string
          id?: string
          interview_meet_link?: string | null
          interview_notes?: string | null
          interview_scheduled_at?: string | null
          phone_number?: string
          status?: string
          subjects?: string[] | null
          teaching_level?: string | null
          tsc_number?: string | null
          updated_at?: string
          user_id?: string | null
          years_of_experience?: number
        }
        Relationships: []
      }
      tutor_availability: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          is_booked: boolean | null
          start_time: string
          tutor_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          is_booked?: boolean | null
          start_time: string
          tutor_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          is_booked?: boolean | null
          start_time?: string
          tutor_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tutor_profiles: {
        Row: {
          availability: string | null
          bio: string | null
          created_at: string | null
          current_institution: string | null
          curriculum: string[] | null
          display_institution: boolean | null
          experience_years: number | null
          graduation_year: number | null
          hourly_rate: number | null
          id: string
          institution_years: number | null
          qualifications: string[] | null
          rating: number | null
          referees: Json | null
          services_offered: string[] | null
          specializations: string | null
          subjects: string[]
          teaching_experience: Json | null
          teaching_location: string | null
          teaching_mode: string[] | null
          total_reviews: number | null
          tutoring_experience: string | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
          why_students_love: string[] | null
        }
        Insert: {
          availability?: string | null
          bio?: string | null
          created_at?: string | null
          current_institution?: string | null
          curriculum?: string[] | null
          display_institution?: boolean | null
          experience_years?: number | null
          graduation_year?: number | null
          hourly_rate?: number | null
          id?: string
          institution_years?: number | null
          qualifications?: string[] | null
          rating?: number | null
          referees?: Json | null
          services_offered?: string[] | null
          specializations?: string | null
          subjects: string[]
          teaching_experience?: Json | null
          teaching_location?: string | null
          teaching_mode?: string[] | null
          total_reviews?: number | null
          tutoring_experience?: string | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
          why_students_love?: string[] | null
        }
        Update: {
          availability?: string | null
          bio?: string | null
          created_at?: string | null
          current_institution?: string | null
          curriculum?: string[] | null
          display_institution?: boolean | null
          experience_years?: number | null
          graduation_year?: number | null
          hourly_rate?: number | null
          id?: string
          institution_years?: number | null
          qualifications?: string[] | null
          rating?: number | null
          referees?: Json | null
          services_offered?: string[] | null
          specializations?: string | null
          subjects?: string[]
          teaching_experience?: Json | null
          teaching_location?: string | null
          teaching_mode?: string[] | null
          total_reviews?: number | null
          tutoring_experience?: string | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
          why_students_love?: string[] | null
        }
        Relationships: []
      }
      tutor_reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          is_approved: boolean | null
          is_moderated: boolean | null
          moderation_notes: string | null
          rating: number
          student_id: string
          tutor_id: string
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_moderated?: boolean | null
          moderation_notes?: string | null
          rating: number
          student_id: string
          tutor_id: string
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_moderated?: boolean | null
          moderation_notes?: string | null
          rating?: number
          student_id?: string
          tutor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutor_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_reviews_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_tutor_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          curriculum: string | null
          full_name: string | null
          id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_user_role: {
        Args: { _role: string; _user_id: string }
        Returns: undefined
      }
      has_recording_access: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "tutor" | "admin"
      package_type:
        | "single_subject"
        | "multi_subject"
        | "multi_child"
        | "exam_prep"
        | "custom"
      payment_status: "pending" | "completed" | "failed" | "cancelled"
      subscription_status: "active" | "expired" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "tutor", "admin"],
      package_type: [
        "single_subject",
        "multi_subject",
        "multi_child",
        "exam_prep",
        "custom",
      ],
      payment_status: ["pending", "completed", "failed", "cancelled"],
      subscription_status: ["active", "expired", "cancelled"],
    },
  },
} as const

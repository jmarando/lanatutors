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
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          published: boolean | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published?: boolean | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published?: boolean | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          amount: number
          amount_original_currency: number | null
          availability_slot_id: string
          balance_due: number | null
          booking_group_id: string | null
          class_type: string | null
          classroom_id: string | null
          classroom_link: string | null
          created_at: string | null
          currency: string | null
          deposit_paid: number | null
          exchange_rate: number | null
          id: string
          meeting_link: string | null
          notes: string | null
          package_purchase_id: string | null
          payment_option: string | null
          status: string | null
          student_id: string
          student_profile_id: string | null
          subject: string
          tutor_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          amount_original_currency?: number | null
          availability_slot_id: string
          balance_due?: number | null
          booking_group_id?: string | null
          class_type?: string | null
          classroom_id?: string | null
          classroom_link?: string | null
          created_at?: string | null
          currency?: string | null
          deposit_paid?: number | null
          exchange_rate?: number | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          package_purchase_id?: string | null
          payment_option?: string | null
          status?: string | null
          student_id: string
          student_profile_id?: string | null
          subject: string
          tutor_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          amount_original_currency?: number | null
          availability_slot_id?: string
          balance_due?: number | null
          booking_group_id?: string | null
          class_type?: string | null
          classroom_id?: string | null
          classroom_link?: string | null
          created_at?: string | null
          currency?: string | null
          deposit_paid?: number | null
          exchange_rate?: number | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          package_purchase_id?: string | null
          payment_option?: string | null
          status?: string | null
          student_id?: string
          student_profile_id?: string | null
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
          {
            foreignKeyName: "bookings_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      central_calendar_config: {
        Row: {
          google_email: string | null
          google_oauth_token: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          google_email?: string | null
          google_oauth_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          google_email?: string | null
          google_oauth_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
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
      curriculum_level_tier_assignments: {
        Row: {
          created_at: string
          curriculum: string
          id: string
          level: string
          tier_id: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          curriculum: string
          id?: string
          level: string
          tier_id: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          curriculum?: string
          id?: string
          level?: string
          tier_id?: string
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_level_tier_assignments_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tutor_pricing_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_level_tier_assignments_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_level_tier_assignments_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: string
          id: string
          rate: number
          target_currency: string
          updated_at: string | null
        }
        Insert: {
          base_currency?: string
          id?: string
          rate: number
          target_currency: string
          updated_at?: string | null
        }
        Update: {
          base_currency?: string
          id?: string
          rate?: number
          target_currency?: string
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
      group_class_attendance: {
        Row: {
          attended: boolean | null
          created_at: string | null
          group_class_id: string
          id: string
          joined_at: string | null
          left_at: string | null
          notes: string | null
          session_date: string
          student_id: string
          tutor_id: string | null
        }
        Insert: {
          attended?: boolean | null
          created_at?: string | null
          group_class_id: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          notes?: string | null
          session_date: string
          student_id: string
          tutor_id?: string | null
        }
        Update: {
          attended?: boolean | null
          created_at?: string | null
          group_class_id?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          notes?: string | null
          session_date?: string
          student_id?: string
          tutor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_class_attendance_group_class_id_fkey"
            columns: ["group_class_id"]
            isOneToOne: false
            referencedRelation: "group_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_class_attendance_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_class_attendance_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      group_class_enrollments: {
        Row: {
          amount_paid: number
          created_at: string | null
          enrollment_type: string | null
          expires_at: string | null
          group_class_id: string
          id: string
          payment_status: string | null
          sessions_attended: number | null
          starts_at: string
          status: string | null
          student_id: string
          student_profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          enrollment_type?: string | null
          expires_at?: string | null
          group_class_id: string
          id?: string
          payment_status?: string | null
          sessions_attended?: number | null
          starts_at: string
          status?: string | null
          student_id: string
          student_profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          enrollment_type?: string | null
          expires_at?: string | null
          group_class_id?: string
          id?: string
          payment_status?: string | null
          sessions_attended?: number | null
          starts_at?: string
          status?: string | null
          student_id?: string
          student_profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_class_enrollments_group_class_id_fkey"
            columns: ["group_class_id"]
            isOneToOne: false
            referencedRelation: "group_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_class_enrollments_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      group_class_tutor_assignments: {
        Row: {
          assigned_days: string[] | null
          created_at: string | null
          group_class_id: string
          id: string
          is_primary: boolean | null
          status: string | null
          tutor_id: string
        }
        Insert: {
          assigned_days?: string[] | null
          created_at?: string | null
          group_class_id: string
          id?: string
          is_primary?: boolean | null
          status?: string | null
          tutor_id: string
        }
        Update: {
          assigned_days?: string[] | null
          created_at?: string | null
          group_class_id?: string
          id?: string
          is_primary?: boolean | null
          status?: string | null
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_class_tutor_assignments_group_class_id_fkey"
            columns: ["group_class_id"]
            isOneToOne: false
            referencedRelation: "group_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_class_tutor_assignments_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_class_tutor_assignments_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      group_classes: {
        Row: {
          classroom_id: string | null
          created_at: string | null
          current_enrollment: number | null
          curriculum: string
          day_of_week: string
          description: string | null
          end_time: string
          grade_level: string
          hourly_rate: number | null
          id: string
          max_students: number | null
          meeting_link: string | null
          start_time: string
          status: string | null
          subject: string
          timezone: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          classroom_id?: string | null
          created_at?: string | null
          current_enrollment?: number | null
          curriculum: string
          day_of_week: string
          description?: string | null
          end_time: string
          grade_level: string
          hourly_rate?: number | null
          id?: string
          max_students?: number | null
          meeting_link?: string | null
          start_time: string
          status?: string | null
          subject: string
          timezone?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          classroom_id?: string | null
          created_at?: string | null
          current_enrollment?: number | null
          curriculum?: string
          day_of_week?: string
          description?: string | null
          end_time?: string
          grade_level?: string
          hourly_rate?: number | null
          id?: string
          max_students?: number | null
          meeting_link?: string | null
          start_time?: string
          status?: string | null
          subject?: string
          timezone?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      holiday_packages: {
        Row: {
          candidate_levels: string[]
          created_at: string | null
          curriculum: string
          ends_at: string
          holiday_period: string
          id: string
          is_active: boolean | null
          starts_at: string
          updated_at: string | null
          year: number
        }
        Insert: {
          candidate_levels: string[]
          created_at?: string | null
          curriculum: string
          ends_at: string
          holiday_period: string
          id?: string
          is_active?: boolean | null
          starts_at: string
          updated_at?: string | null
          year: number
        }
        Update: {
          candidate_levels?: string[]
          created_at?: string | null
          curriculum?: string
          ends_at?: string
          holiday_period?: string
          id?: string
          is_active?: boolean | null
          starts_at?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      intensive_classes: {
        Row: {
          created_at: string | null
          current_enrollment: number
          curriculum: string
          description: string | null
          focus_topics: string | null
          grade_levels: string[]
          id: string
          max_students: number
          meeting_link: string | null
          program_id: string
          session_topics: Json | null
          status: string
          subject: string
          time_slot: string
          tutor_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_enrollment?: number
          curriculum: string
          description?: string | null
          focus_topics?: string | null
          grade_levels: string[]
          id?: string
          max_students?: number
          meeting_link?: string | null
          program_id: string
          session_topics?: Json | null
          status?: string
          subject: string
          time_slot: string
          tutor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_enrollment?: number
          curriculum?: string
          description?: string | null
          focus_topics?: string | null
          grade_levels?: string[]
          id?: string
          max_students?: number
          meeting_link?: string | null
          program_id?: string
          session_topics?: Json | null
          status?: string
          subject?: string
          time_slot?: string
          tutor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intensive_classes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "intensive_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intensive_classes_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intensive_classes_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      intensive_enrollments: {
        Row: {
          created_at: string | null
          enrolled_class_ids: string[]
          id: string
          payment_status: string
          pesapal_order_tracking_id: string | null
          program_id: string
          student_id: string
          student_profile_id: string | null
          total_amount: number
          total_subjects: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enrolled_class_ids: string[]
          id?: string
          payment_status?: string
          pesapal_order_tracking_id?: string | null
          program_id: string
          student_id: string
          student_profile_id?: string | null
          total_amount: number
          total_subjects: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enrolled_class_ids?: string[]
          id?: string
          payment_status?: string
          pesapal_order_tracking_id?: string | null
          program_id?: string
          student_id?: string
          student_profile_id?: string | null
          total_amount?: number
          total_subjects?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intensive_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "intensive_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intensive_enrollments_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      intensive_programs: {
        Row: {
          break_duration_minutes: number
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean
          name: string
          session_duration_minutes: number
          start_date: string
          updated_at: string | null
        }
        Insert: {
          break_duration_minutes?: number
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          session_duration_minutes?: number
          start_date: string
          updated_at?: string | null
        }
        Update: {
          break_duration_minutes?: number
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          session_duration_minutes?: number
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      learning_plans: {
        Row: {
          created_at: string | null
          discount_applied: number | null
          expires_at: string | null
          id: string
          inquiry_id: string | null
          notes: string | null
          status: string | null
          student_id: string | null
          subjects: Json
          title: string
          total_price: number
          total_sessions: number
          tutor_id: string
          updated_at: string | null
          validity_days: number | null
        }
        Insert: {
          created_at?: string | null
          discount_applied?: number | null
          expires_at?: string | null
          id?: string
          inquiry_id?: string | null
          notes?: string | null
          status?: string | null
          student_id?: string | null
          subjects?: Json
          title: string
          total_price: number
          total_sessions: number
          tutor_id: string
          updated_at?: string | null
          validity_days?: number | null
        }
        Update: {
          created_at?: string | null
          discount_applied?: number | null
          expires_at?: string | null
          id?: string
          inquiry_id?: string | null
          notes?: string | null
          status?: string | null
          student_id?: string | null
          subjects?: Json
          title?: string
          total_price?: number
          total_sessions?: number
          tutor_id?: string
          updated_at?: string | null
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_plans_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "tutor_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plans_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plans_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles_public"
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
          {
            foreignKeyName: "package_offers_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      package_purchases: {
        Row: {
          amount_original_currency: number | null
          amount_paid: number | null
          created_at: string | null
          currency: string | null
          exchange_rate: number | null
          expires_at: string | null
          id: string
          metadata: Json | null
          package_offer_id: string | null
          payment_status: string | null
          sessions_remaining: number
          sessions_used: number | null
          student_id: string
          student_profile_id: string | null
          total_amount: number
          total_sessions: number
          tutor_id: string
          updated_at: string | null
        }
        Insert: {
          amount_original_currency?: number | null
          amount_paid?: number | null
          created_at?: string | null
          currency?: string | null
          exchange_rate?: number | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          package_offer_id?: string | null
          payment_status?: string | null
          sessions_remaining: number
          sessions_used?: number | null
          student_id: string
          student_profile_id?: string | null
          total_amount: number
          total_sessions: number
          tutor_id: string
          updated_at?: string | null
        }
        Update: {
          amount_original_currency?: number | null
          amount_paid?: number | null
          created_at?: string | null
          currency?: string | null
          exchange_rate?: number | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          package_offer_id?: string | null
          payment_status?: string | null
          sessions_remaining?: number
          sessions_used?: number | null
          student_id?: string
          student_profile_id?: string | null
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
            foreignKeyName: "package_purchases_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_purchases_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_purchases_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles_public"
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
            foreignKeyName: "package_recommendations_consultation_booking_id_fkey"
            columns: ["consultation_booking_id"]
            isOneToOne: false
            referencedRelation: "consultation_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      package_subject_allocations: {
        Row: {
          created_at: string | null
          id: string
          package_purchase_id: string
          sessions_allocated: number
          sessions_remaining: number
          sessions_used: number
          status: string
          subject: string
          tutor_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          package_purchase_id: string
          sessions_allocated: number
          sessions_remaining: number
          sessions_used?: number
          status?: string
          subject: string
          tutor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          package_purchase_id?: string
          sessions_allocated?: number
          sessions_remaining?: number
          sessions_used?: number
          status?: string
          subject?: string
          tutor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_subject_allocations_package_purchase_id_fkey"
            columns: ["package_purchase_id"]
            isOneToOne: false
            referencedRelation: "package_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_subject_allocations_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_subject_allocations_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          amount_original_currency: number | null
          created_at: string | null
          currency: string | null
          exchange_rate: number | null
          id: string
          payment_type: string
          pesapal_confirmation_code: string | null
          pesapal_merchant_reference: string | null
          pesapal_order_tracking_id: string | null
          pesapal_payment_method: string | null
          phone_number: string
          redirect_url: string | null
          reference_id: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          amount_original_currency?: number | null
          created_at?: string | null
          currency?: string | null
          exchange_rate?: number | null
          id?: string
          payment_type: string
          pesapal_confirmation_code?: string | null
          pesapal_merchant_reference?: string | null
          pesapal_order_tracking_id?: string | null
          pesapal_payment_method?: string | null
          phone_number: string
          redirect_url?: string | null
          reference_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          amount_original_currency?: number | null
          created_at?: string | null
          currency?: string | null
          exchange_rate?: number | null
          id?: string
          payment_type?: string
          pesapal_confirmation_code?: string | null
          pesapal_merchant_reference?: string | null
          pesapal_order_tracking_id?: string | null
          pesapal_payment_method?: string | null
          phone_number?: string
          redirect_url?: string | null
          reference_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string | null
          age: number | null
          avatar_url: string | null
          created_at: string | null
          curriculum: string | null
          full_name: string | null
          grade_level: string | null
          id: string
          learning_goals: string | null
          must_reset_password: boolean
          phone_number: string | null
          preferred_currency: string | null
          preferred_learning_style: string | null
          subjects_struggling: string[] | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          account_type?: string | null
          age?: number | null
          avatar_url?: string | null
          created_at?: string | null
          curriculum?: string | null
          full_name?: string | null
          grade_level?: string | null
          id: string
          learning_goals?: string | null
          must_reset_password?: boolean
          phone_number?: string | null
          preferred_currency?: string | null
          preferred_learning_style?: string | null
          subjects_struggling?: string[] | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          account_type?: string | null
          age?: number | null
          avatar_url?: string | null
          created_at?: string | null
          curriculum?: string | null
          full_name?: string | null
          grade_level?: string | null
          id?: string
          learning_goals?: string | null
          must_reset_password?: boolean
          phone_number?: string | null
          preferred_currency?: string | null
          preferred_learning_style?: string | null
          subjects_struggling?: string[] | null
          timezone?: string | null
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
      student_progress: {
        Row: {
          created_at: string | null
          id: string
          last_updated: string | null
          notes: string | null
          progress_percentage: number
          student_id: string
          subject: string
          total_sessions: number | null
          tutor_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          notes?: string | null
          progress_percentage?: number
          student_id: string
          subject: string
          total_sessions?: number | null
          tutor_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_updated?: string | null
          notes?: string | null
          progress_percentage?: number
          student_id?: string
          subject?: string
          total_sessions?: number | null
          tutor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "public_tutor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "public_tutor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          age: number | null
          avatar_url: string | null
          created_at: string | null
          curriculum: string
          email: string | null
          full_name: string
          grade_level: string
          id: string
          learning_goals: string | null
          parent_id: string
          subjects_of_interest: string[] | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string | null
          curriculum: string
          email?: string | null
          full_name: string
          grade_level: string
          id?: string
          learning_goals?: string | null
          parent_id: string
          subjects_of_interest?: string[] | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          created_at?: string | null
          curriculum?: string
          email?: string | null
          full_name?: string
          grade_level?: string
          id?: string
          learning_goals?: string | null
          parent_id?: string
          subjects_of_interest?: string[] | null
          updated_at?: string | null
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
          slot_type: string | null
          start_time: string
          tutor_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          is_booked?: boolean | null
          slot_type?: string | null
          start_time: string
          tutor_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          is_booked?: boolean | null
          slot_type?: string | null
          start_time?: string
          tutor_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tutor_inquiries: {
        Row: {
          available_time_per_week: string | null
          created_at: string | null
          current_challenges: string | null
          curriculum: string | null
          desired_duration_weeks: number | null
          grade_level: string
          id: string
          parent_email: string
          parent_id: string | null
          parent_name: string
          parent_phone: string | null
          preferred_contact: string | null
          preferred_sessions: number | null
          status: string | null
          student_name: string
          subjects_needed: string[]
          tutor_id: string
          updated_at: string | null
        }
        Insert: {
          available_time_per_week?: string | null
          created_at?: string | null
          current_challenges?: string | null
          curriculum?: string | null
          desired_duration_weeks?: number | null
          grade_level: string
          id?: string
          parent_email: string
          parent_id?: string | null
          parent_name: string
          parent_phone?: string | null
          preferred_contact?: string | null
          preferred_sessions?: number | null
          status?: string | null
          student_name: string
          subjects_needed: string[]
          tutor_id: string
          updated_at?: string | null
        }
        Update: {
          available_time_per_week?: string | null
          created_at?: string | null
          current_challenges?: string | null
          curriculum?: string | null
          desired_duration_weeks?: number | null
          grade_level?: string
          id?: string
          parent_email?: string
          parent_id?: string | null
          parent_name?: string
          parent_phone?: string | null
          preferred_contact?: string | null
          preferred_sessions?: number | null
          status?: string | null
          student_name?: string
          subjects_needed?: string[]
          tutor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutor_inquiries_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_inquiries_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_pricing_tiers: {
        Row: {
          created_at: string
          id: string
          online_hourly_rate: number
          tier_name: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          online_hourly_rate: number
          tier_name: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          online_hourly_rate?: number
          tier_name?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_pricing_tiers_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_pricing_tiers_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_profiles: {
        Row: {
          availability: string | null
          bio: string | null
          calendar_sync_enabled: boolean | null
          created_at: string | null
          current_institution: string | null
          curriculum: string[] | null
          diaspora_friendly: boolean | null
          display_institution: boolean | null
          education: Json | null
          email: string | null
          experience_years: number | null
          gender: string | null
          google_calendar_connected: boolean | null
          google_calendar_email: string | null
          google_oauth_token: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          graduation_year: number | null
          hourly_rate: number | null
          id: string
          institution_years: number | null
          profile_slug: string | null
          qualifications: string[] | null
          rating: number | null
          referees: Json | null
          services_offered: string[] | null
          specializations: string | null
          subjects: string[]
          teaching_experience: Json | null
          teaching_levels: string[] | null
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
          calendar_sync_enabled?: boolean | null
          created_at?: string | null
          current_institution?: string | null
          curriculum?: string[] | null
          diaspora_friendly?: boolean | null
          display_institution?: boolean | null
          education?: Json | null
          email?: string | null
          experience_years?: number | null
          gender?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_email?: string | null
          google_oauth_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          graduation_year?: number | null
          hourly_rate?: number | null
          id?: string
          institution_years?: number | null
          profile_slug?: string | null
          qualifications?: string[] | null
          rating?: number | null
          referees?: Json | null
          services_offered?: string[] | null
          specializations?: string | null
          subjects: string[]
          teaching_experience?: Json | null
          teaching_levels?: string[] | null
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
          calendar_sync_enabled?: boolean | null
          created_at?: string | null
          current_institution?: string | null
          curriculum?: string[] | null
          diaspora_friendly?: boolean | null
          display_institution?: boolean | null
          education?: Json | null
          email?: string | null
          experience_years?: number | null
          gender?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_email?: string | null
          google_oauth_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          graduation_year?: number | null
          hourly_rate?: number | null
          id?: string
          institution_years?: number | null
          profile_slug?: string | null
          qualifications?: string[] | null
          rating?: number | null
          referees?: Json | null
          services_offered?: string[] | null
          specializations?: string | null
          subjects?: string[]
          teaching_experience?: Json | null
          teaching_levels?: string[] | null
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
          {
            foreignKeyName: "tutor_reviews_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutor_profiles_public"
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
      tutor_profiles_public: {
        Row: {
          availability: string | null
          bio: string | null
          created_at: string | null
          current_institution: string | null
          curriculum: string[] | null
          diaspora_friendly: boolean | null
          display_institution: boolean | null
          education: Json | null
          experience_years: number | null
          gender: string | null
          graduation_year: number | null
          hourly_rate: number | null
          id: string | null
          institution_years: number | null
          profile_slug: string | null
          qualifications: string[] | null
          rating: number | null
          services_offered: string[] | null
          specializations: string | null
          subjects: string[] | null
          teaching_experience: Json | null
          teaching_levels: string[] | null
          teaching_location: string | null
          teaching_mode: string[] | null
          total_reviews: number | null
          tutoring_experience: string | null
          user_id: string | null
          verified: boolean | null
          why_students_love: string[] | null
        }
        Insert: {
          availability?: string | null
          bio?: string | null
          created_at?: string | null
          current_institution?: string | null
          curriculum?: string[] | null
          diaspora_friendly?: boolean | null
          display_institution?: boolean | null
          education?: Json | null
          experience_years?: number | null
          gender?: string | null
          graduation_year?: number | null
          hourly_rate?: number | null
          id?: string | null
          institution_years?: number | null
          profile_slug?: string | null
          qualifications?: string[] | null
          rating?: number | null
          services_offered?: string[] | null
          specializations?: string | null
          subjects?: string[] | null
          teaching_experience?: Json | null
          teaching_levels?: string[] | null
          teaching_location?: string | null
          teaching_mode?: string[] | null
          total_reviews?: number | null
          tutoring_experience?: string | null
          user_id?: string | null
          verified?: boolean | null
          why_students_love?: string[] | null
        }
        Update: {
          availability?: string | null
          bio?: string | null
          created_at?: string | null
          current_institution?: string | null
          curriculum?: string[] | null
          diaspora_friendly?: boolean | null
          display_institution?: boolean | null
          education?: Json | null
          experience_years?: number | null
          gender?: string | null
          graduation_year?: number | null
          hourly_rate?: number | null
          id?: string | null
          institution_years?: number | null
          profile_slug?: string | null
          qualifications?: string[] | null
          rating?: number | null
          services_offered?: string[] | null
          specializations?: string | null
          subjects?: string[] | null
          teaching_experience?: Json | null
          teaching_levels?: string[] | null
          teaching_location?: string | null
          teaching_mode?: string[] | null
          total_reviews?: number | null
          tutoring_experience?: string | null
          user_id?: string | null
          verified?: boolean | null
          why_students_love?: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_user_role: {
        Args: { _role: string; _user_id: string }
        Returns: undefined
      }
      generate_tutor_slug: {
        Args: { full_name: string; tutor_id: string }
        Returns: string
      }
      get_public_tutor_profiles: {
        Args: never
        Returns: {
          availability: string
          avatar_url: string
          bio: string
          created_at: string
          current_institution: string
          curriculum: string[]
          diaspora_friendly: boolean
          display_institution: boolean
          education: Json
          experience_years: number
          full_name: string
          gender: string
          graduation_year: number
          hourly_rate: number
          id: string
          institution_years: number
          profile_slug: string
          qualifications: string[]
          rating: number
          services_offered: string[]
          specializations: string
          subjects: string[]
          teaching_experience: Json
          teaching_levels: string[]
          teaching_location: string
          teaching_mode: string[]
          total_reviews: number
          tutoring_experience: string
          user_id: string
          verified: boolean
          why_students_love: string[]
        }[]
      }
      get_user_email: { Args: { _user_id: string }; Returns: string }
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
        | "holiday_revision"
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
        "holiday_revision",
      ],
      payment_status: ["pending", "completed", "failed", "cancelled"],
      subscription_status: ["active", "expired", "cancelled"],
    },
  },
} as const

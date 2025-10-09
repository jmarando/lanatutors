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
      tutor_profiles: {
        Row: {
          availability: string | null
          bio: string | null
          created_at: string | null
          curriculum: string[] | null
          experience_years: number | null
          hourly_rate: number
          id: string
          qualifications: string[] | null
          rating: number | null
          subjects: string[]
          total_reviews: number | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          availability?: string | null
          bio?: string | null
          created_at?: string | null
          curriculum?: string[] | null
          experience_years?: number | null
          hourly_rate: number
          id?: string
          qualifications?: string[] | null
          rating?: number | null
          subjects: string[]
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          availability?: string | null
          bio?: string | null
          created_at?: string | null
          curriculum?: string[] | null
          experience_years?: number | null
          hourly_rate?: number
          id?: string
          qualifications?: string[] | null
          rating?: number | null
          subjects?: string[]
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
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
      [_ in never]: never
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
      payment_status: ["pending", "completed", "failed", "cancelled"],
      subscription_status: ["active", "expired", "cancelled"],
    },
  },
} as const

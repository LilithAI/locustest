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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bar_ai_generations: {
        Row: {
          area_of_law_hint:
            | Database["public"]["Enums"]["bar_area_of_law"]
            | null
          challenges_created: number
          completion_tokens: number | null
          created_at: string
          difficulty_hint: Database["public"]["Enums"]["bar_difficulty"] | null
          duration_ms: number | null
          error_message: string | null
          generation_type: string
          id: string
          model: string
          outcome: string
          prompt_tokens: number | null
          question_type_hint:
            | Database["public"]["Enums"]["bar_question_type"]
            | null
          requested_by: string
          source_id: string | null
        }
        Insert: {
          area_of_law_hint?:
            | Database["public"]["Enums"]["bar_area_of_law"]
            | null
          challenges_created?: number
          completion_tokens?: number | null
          created_at?: string
          difficulty_hint?: Database["public"]["Enums"]["bar_difficulty"] | null
          duration_ms?: number | null
          error_message?: string | null
          generation_type: string
          id?: string
          model: string
          outcome: string
          prompt_tokens?: number | null
          question_type_hint?:
            | Database["public"]["Enums"]["bar_question_type"]
            | null
          requested_by: string
          source_id?: string | null
        }
        Update: {
          area_of_law_hint?:
            | Database["public"]["Enums"]["bar_area_of_law"]
            | null
          challenges_created?: number
          completion_tokens?: number | null
          created_at?: string
          difficulty_hint?: Database["public"]["Enums"]["bar_difficulty"] | null
          duration_ms?: number | null
          error_message?: string | null
          generation_type?: string
          id?: string
          model?: string
          outcome?: string
          prompt_tokens?: number | null
          question_type_hint?:
            | Database["public"]["Enums"]["bar_question_type"]
            | null
          requested_by?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bar_ai_generations_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_ai_generations_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "bar_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_attempts: {
        Row: {
          attempted_at: string
          challenge_id: string
          id: string
          is_correct: boolean
          points_awarded: number
          submitted_answer: Json
          time_taken_seconds: number | null
          user_id: string
        }
        Insert: {
          attempted_at?: string
          challenge_id: string
          id?: string
          is_correct: boolean
          points_awarded?: number
          submitted_answer: Json
          time_taken_seconds?: number | null
          user_id: string
        }
        Update: {
          attempted_at?: string
          challenge_id?: string
          id?: string
          is_correct?: boolean
          points_awarded?: number
          submitted_answer?: Json
          time_taken_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_attempts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "bar_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_attempts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "bar_challenges_student"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_challenges: {
        Row: {
          ai_generation_id: string | null
          approved_at: string | null
          approved_by: string | null
          area_of_law: Database["public"]["Enums"]["bar_area_of_law"]
          created_at: string
          created_by: string
          difficulty: Database["public"]["Enums"]["bar_difficulty"]
          explanation: string | null
          grading_config: Json
          id: string
          payload: Json
          points_base: number
          prompt: string
          question_type: Database["public"]["Enums"]["bar_question_type"]
          rejection_reason: string | null
          source_citation: string | null
          source_id: string | null
          source_page: number | null
          status: Database["public"]["Enums"]["bar_challenge_status"]
          title: string
          updated_at: string
        }
        Insert: {
          ai_generation_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          area_of_law: Database["public"]["Enums"]["bar_area_of_law"]
          created_at?: string
          created_by: string
          difficulty: Database["public"]["Enums"]["bar_difficulty"]
          explanation?: string | null
          grading_config?: Json
          id?: string
          payload?: Json
          points_base: number
          prompt: string
          question_type: Database["public"]["Enums"]["bar_question_type"]
          rejection_reason?: string | null
          source_citation?: string | null
          source_id?: string | null
          source_page?: number | null
          status?: Database["public"]["Enums"]["bar_challenge_status"]
          title: string
          updated_at?: string
        }
        Update: {
          ai_generation_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          area_of_law?: Database["public"]["Enums"]["bar_area_of_law"]
          created_at?: string
          created_by?: string
          difficulty?: Database["public"]["Enums"]["bar_difficulty"]
          explanation?: string | null
          grading_config?: Json
          id?: string
          payload?: Json
          points_base?: number
          prompt?: string
          question_type?: Database["public"]["Enums"]["bar_question_type"]
          rejection_reason?: string | null
          source_citation?: string | null
          source_id?: string | null
          source_page?: number | null
          status?: Database["public"]["Enums"]["bar_challenge_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_challenges_ai_generation_id_fkey"
            columns: ["ai_generation_id"]
            isOneToOne: false
            referencedRelation: "bar_ai_generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_challenges_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bar_challenges_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "bar_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_daily_attempts: {
        Row: {
          attempt_count: number
          attempt_date: string
          id: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          attempt_date: string
          id?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          attempt_date?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_daily_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_rit_messages: {
        Row: {
          attempt_id: string
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          attempt_id: string
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          attempt_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_rit_messages_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "bar_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_sources: {
        Row: {
          created_at: string
          description: string | null
          id: string
          license: Database["public"]["Enums"]["bar_source_license"]
          source_type: Database["public"]["Enums"]["bar_source_type"]
          storage_path: string | null
          title: string
          topic_prompt: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          license?: Database["public"]["Enums"]["bar_source_license"]
          source_type: Database["public"]["Enums"]["bar_source_type"]
          storage_path?: string | null
          title: string
          topic_prompt?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          license?: Database["public"]["Enums"]["bar_source_license"]
          source_type?: Database["public"]["Enums"]["bar_source_type"]
          storage_path?: string | null
          title?: string
          topic_prompt?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_sources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_user_colleges: {
        Row: {
          college_display: string
          college_normalized: string
          updated_at: string
          user_id: string
        }
        Insert: {
          college_display: string
          college_normalized: string
          updated_at?: string
          user_id: string
        }
        Update: {
          college_display?: string
          college_normalized?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_user_colleges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_user_stats: {
        Row: {
          accuracy_pct: number
          correct_attempts: number
          current_streak: number
          designation: Database["public"]["Enums"]["bar_designation"]
          last_attempt_at: string | null
          longest_streak: number
          total_attempts: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy_pct?: number
          correct_attempts?: number
          current_streak?: number
          designation?: Database["public"]["Enums"]["bar_designation"]
          last_attempt_at?: string | null
          longest_streak?: number
          total_attempts?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy_pct?: number
          correct_attempts?: number
          current_streak?: number
          designation?: Database["public"]["Enums"]["bar_designation"]
          last_attempt_at?: string | null
          longest_streak?: number
          total_attempts?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bar_user_stats_by_area: {
        Row: {
          area_of_law: Database["public"]["Enums"]["bar_area_of_law"]
          correct_attempts: number
          id: string
          total_attempts: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          area_of_law: Database["public"]["Enums"]["bar_area_of_law"]
          correct_attempts?: number
          id?: string
          total_attempts?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          area_of_law?: Database["public"]["Enums"]["bar_area_of_law"]
          correct_attempts?: number
          id?: string
          total_attempts?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bar_user_stats_by_area_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_votes: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_internships: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          firm_name: string
          id: string
          role: string
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          firm_name: string
          id?: string
          role: string
          start_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          firm_name?: string
          id?: string
          role?: string
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_internships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_moots: {
        Row: {
          competition_name: string
          created_at: string
          id: string
          result: Database["public"]["Enums"]["moot_result"]
          role: Database["public"]["Enums"]["moot_role"]
          user_id: string
          year: number
        }
        Insert: {
          competition_name: string
          created_at?: string
          id?: string
          result: Database["public"]["Enums"]["moot_result"]
          role: Database["public"]["Enums"]["moot_role"]
          user_id: string
          year: number
        }
        Update: {
          competition_name?: string
          created_at?: string
          id?: string
          result?: Database["public"]["Enums"]["moot_result"]
          role?: Database["public"]["Enums"]["moot_role"]
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "profile_moots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_publications: {
        Row: {
          created_at: string
          id: string
          publication_date: string
          publisher: string
          title: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          publication_date: string
          publisher: string
          title: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          publication_date?: string
          publisher?: string
          title?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_publications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bar_leaderboard_opt_out: boolean
          bio: string | null
          cgpa: number | null
          college: string | null
          created_at: string
          cv_uploaded_at: string | null
          cv_url: string | null
          degree: Database["public"]["Enums"]["degree_type"] | null
          display_name: string | null
          graduation_year: number | null
          id: string
          subjects_of_interest: string[]
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bar_leaderboard_opt_out?: boolean
          bio?: string | null
          cgpa?: number | null
          college?: string | null
          created_at?: string
          cv_uploaded_at?: string | null
          cv_url?: string | null
          degree?: Database["public"]["Enums"]["degree_type"] | null
          display_name?: string | null
          graduation_year?: number | null
          id: string
          subjects_of_interest?: string[]
          username: string
        }
        Update: {
          avatar_url?: string | null
          bar_leaderboard_opt_out?: boolean
          bio?: string | null
          cgpa?: number | null
          college?: string | null
          created_at?: string
          cv_uploaded_at?: string | null
          cv_url?: string | null
          degree?: Database["public"]["Enums"]["degree_type"] | null
          display_name?: string | null
          graduation_year?: number | null
          id?: string
          subjects_of_interest?: string[]
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visit_counter: {
        Row: {
          count: number
          id: number
        }
        Insert: {
          count?: number
          id?: number
        }
        Update: {
          count?: number
          id?: number
        }
        Relationships: []
      }
      waitlist_submissions: {
        Row: {
          created_at: string
          data: Json
          email: string
          id: string
          type: string
        }
        Insert: {
          created_at?: string
          data?: Json
          email: string
          id?: string
          type: string
        }
        Update: {
          created_at?: string
          data?: Json
          email?: string
          id?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      bar_challenges_student: {
        Row: {
          area_of_law: Database["public"]["Enums"]["bar_area_of_law"] | null
          created_at: string | null
          difficulty: Database["public"]["Enums"]["bar_difficulty"] | null
          id: string | null
          payload: Json | null
          points_base: number | null
          prompt: string | null
          question_type: Database["public"]["Enums"]["bar_question_type"] | null
          source_citation: string | null
          source_page: number | null
          status: Database["public"]["Enums"]["bar_challenge_status"] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          area_of_law?: Database["public"]["Enums"]["bar_area_of_law"] | null
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["bar_difficulty"] | null
          id?: string | null
          payload?: never
          points_base?: number | null
          prompt?: string | null
          question_type?:
            | Database["public"]["Enums"]["bar_question_type"]
            | null
          source_citation?: string | null
          source_page?: number | null
          status?: Database["public"]["Enums"]["bar_challenge_status"] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          area_of_law?: Database["public"]["Enums"]["bar_area_of_law"] | null
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["bar_difficulty"] | null
          id?: string | null
          payload?: never
          points_base?: number | null
          prompt?: string | null
          question_type?:
            | Database["public"]["Enums"]["bar_question_type"]
            | null
          source_citation?: string | null
          source_page?: number | null
          status?: Database["public"]["Enums"]["bar_challenge_status"] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bar_weekly_stats: {
        Row: {
          user_id: string | null
          weekly_accuracy_pct: number | null
          weekly_attempts: number | null
          weekly_correct: number | null
          weekly_points: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bar_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_email_by_username: { Args: { p_username: string }; Returns: string }
      get_feature_vote_counts: {
        Args: never
        Returns: {
          feature_key: string
          vote_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_visit_count: { Args: never; Returns: number }
      is_admin: { Args: { uid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      bar_area_of_law:
        | "constitutional"
        | "criminal"
        | "contract"
        | "torts"
        | "corporate"
        | "ip"
        | "labour"
        | "tax"
        | "evidence"
        | "procedure"
        | "family"
        | "property"
        | "administrative"
        | "international"
        | "jurisprudence"
        | "environmental"
        | "other"
      bar_audience: "student" | "firm" | "institution"
      bar_challenge_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "archived"
      bar_designation:
        | "trainee"
        | "junior_associate"
        | "associate"
        | "senior_associate"
        | "partner"
        | "senior_partner"
        | "silk"
      bar_difficulty: "easy" | "medium" | "hard"
      bar_question_type:
        | "mcq"
        | "issue_spotter"
        | "speed_round"
        | "jurisdiction"
        | "document_review"
        | "brief_builder"
        | "ethics"
        | "client_counseling"
      bar_source_license:
        | "public_domain"
        | "licensed"
        | "fair_use_claim"
        | "user_submitted"
        | "other"
      bar_source_type: "pdf_extraction" | "topic_prompt" | "manual"
      degree_type:
        | "BA LLB"
        | "BBA LLB"
        | "BCom LLB"
        | "LLB (3yr)"
        | "LLM"
        | "Other"
      moot_result:
        | "winner"
        | "runner_up"
        | "semi_finalist"
        | "quarter_finalist"
        | "participant"
      moot_role: "speaker" | "researcher" | "both"
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
      app_role: ["admin", "moderator", "user"],
      bar_area_of_law: [
        "constitutional",
        "criminal",
        "contract",
        "torts",
        "corporate",
        "ip",
        "labour",
        "tax",
        "evidence",
        "procedure",
        "family",
        "property",
        "administrative",
        "international",
        "jurisprudence",
        "environmental",
        "other",
      ],
      bar_audience: ["student", "firm", "institution"],
      bar_challenge_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "archived",
      ],
      bar_designation: [
        "trainee",
        "junior_associate",
        "associate",
        "senior_associate",
        "partner",
        "senior_partner",
        "silk",
      ],
      bar_difficulty: ["easy", "medium", "hard"],
      bar_question_type: [
        "mcq",
        "issue_spotter",
        "speed_round",
        "jurisdiction",
        "document_review",
        "brief_builder",
        "ethics",
        "client_counseling",
      ],
      bar_source_license: [
        "public_domain",
        "licensed",
        "fair_use_claim",
        "user_submitted",
        "other",
      ],
      bar_source_type: ["pdf_extraction", "topic_prompt", "manual"],
      degree_type: [
        "BA LLB",
        "BBA LLB",
        "BCom LLB",
        "LLB (3yr)",
        "LLM",
        "Other",
      ],
      moot_result: [
        "winner",
        "runner_up",
        "semi_finalist",
        "quarter_finalist",
        "participant",
      ],
      moot_role: ["speaker", "researcher", "both"],
    },
  },
} as const

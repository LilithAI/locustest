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
      analytics_events: {
        Row: {
          anon_id: string | null
          country: string | null
          created_at: string
          device: string | null
          event: string
          id: string
          ip_hash: string | null
          path: string | null
          props: Json
          referrer: string | null
          session_id: string | null
          user_id: string | null
          utm: Json
        }
        Insert: {
          anon_id?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          event: string
          id?: string
          ip_hash?: string | null
          path?: string | null
          props?: Json
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
          utm?: Json
        }
        Update: {
          anon_id?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          event?: string
          id?: string
          ip_hash?: string | null
          path?: string | null
          props?: Json
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
          utm?: Json
        }
        Relationships: []
      }
      analytics_salt: {
        Row: {
          created_at: string
          day: string
          salt: string
        }
        Insert: {
          created_at?: string
          day: string
          salt?: string
        }
        Update: {
          created_at?: string
          day?: string
          salt?: string
        }
        Relationships: []
      }
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
      beta_feedback: {
        Row: {
          created_at: string
          general_notes: string | null
          id: string
          overall_score: number | null
          responses: Json
          tester_code: string | null
          tester_email: string | null
          tester_id: string | null
          tester_name: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          general_notes?: string | null
          id?: string
          overall_score?: number | null
          responses?: Json
          tester_code?: string | null
          tester_email?: string | null
          tester_id?: string | null
          tester_name: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          general_notes?: string | null
          id?: string
          overall_score?: number | null
          responses?: Json
          tester_code?: string | null
          tester_email?: string | null
          tester_id?: string | null
          tester_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beta_feedback_tester_id_fkey"
            columns: ["tester_id"]
            isOneToOne: false
            referencedRelation: "beta_testers"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_feedback_round2: {
        Row: {
          created_at: string
          general_notes: string | null
          id: string
          nps_score: number | null
          responses: Json
          tester_email: string | null
          tester_id: string | null
          tester_name: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          general_notes?: string | null
          id?: string
          nps_score?: number | null
          responses?: Json
          tester_email?: string | null
          tester_id?: string | null
          tester_name: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          general_notes?: string | null
          id?: string
          nps_score?: number | null
          responses?: Json
          tester_email?: string | null
          tester_id?: string | null
          tester_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      beta_testers: {
        Row: {
          claimed_at: string
          code: string | null
          created_at: string
          display_name: string
          email: string | null
          feedback_id: string | null
          id: string
          intro_line_index: number
          is_public: boolean
          personal_note: string | null
          round2_submitted_at: string | null
          slot_number: number
          submitted_at: string | null
          user_id: string | null
        }
        Insert: {
          claimed_at?: string
          code?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          feedback_id?: string | null
          id?: string
          intro_line_index?: number
          is_public?: boolean
          personal_note?: string | null
          round2_submitted_at?: string | null
          slot_number: number
          submitted_at?: string | null
          user_id?: string | null
        }
        Update: {
          claimed_at?: string
          code?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          feedback_id?: string | null
          id?: string
          intro_line_index?: number
          is_public?: boolean
          personal_note?: string | null
          round2_submitted_at?: string | null
          slot_number?: number
          submitted_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cfps: {
        Row: {
          co_authorship_allowed: boolean
          contact_email: string | null
          created_at: string
          created_by: string
          description: string | null
          eligibility: string | null
          expires_at: string
          id: string
          notified_at: string | null
          peer_reviewed: boolean
          posted_at: string
          publication_name: string
          publication_type: Database["public"]["Enums"]["cfp_publication_type"]
          source_credit: string | null
          status: Database["public"]["Enums"]["opp_status"]
          submission_deadline: string
          submission_fee: string | null
          submission_url: string | null
          theme: string | null
          updated_at: string
          word_limit_max: number | null
          word_limit_min: number | null
        }
        Insert: {
          co_authorship_allowed?: boolean
          contact_email?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          eligibility?: string | null
          expires_at: string
          id?: string
          notified_at?: string | null
          peer_reviewed?: boolean
          posted_at?: string
          publication_name: string
          publication_type?: Database["public"]["Enums"]["cfp_publication_type"]
          source_credit?: string | null
          status?: Database["public"]["Enums"]["opp_status"]
          submission_deadline: string
          submission_fee?: string | null
          submission_url?: string | null
          theme?: string | null
          updated_at?: string
          word_limit_max?: number | null
          word_limit_min?: number | null
        }
        Update: {
          co_authorship_allowed?: boolean
          contact_email?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          eligibility?: string | null
          expires_at?: string
          id?: string
          notified_at?: string | null
          peer_reviewed?: boolean
          posted_at?: string
          publication_name?: string
          publication_type?: Database["public"]["Enums"]["cfp_publication_type"]
          source_credit?: string | null
          status?: Database["public"]["Enums"]["opp_status"]
          submission_deadline?: string
          submission_fee?: string | null
          submission_url?: string | null
          theme?: string | null
          updated_at?: string
          word_limit_max?: number | null
          word_limit_min?: number | null
        }
        Relationships: []
      }
      competitions: {
        Row: {
          application_url: string | null
          category: Database["public"]["Enums"]["competition_category"]
          created_at: string
          created_by: string
          deadline: string
          description: string | null
          eligibility: string | null
          event_date: string | null
          expires_at: string
          fee: string | null
          id: string
          mode: Database["public"]["Enums"]["event_mode"] | null
          notified_at: string | null
          organiser: string
          posted_at: string
          prize_or_stipend: string | null
          source_credit: string | null
          status: Database["public"]["Enums"]["opp_status"]
          title: string
          updated_at: string
        }
        Insert: {
          application_url?: string | null
          category?: Database["public"]["Enums"]["competition_category"]
          created_at?: string
          created_by: string
          deadline: string
          description?: string | null
          eligibility?: string | null
          event_date?: string | null
          expires_at: string
          fee?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["event_mode"] | null
          notified_at?: string | null
          organiser: string
          posted_at?: string
          prize_or_stipend?: string | null
          source_credit?: string | null
          status?: Database["public"]["Enums"]["opp_status"]
          title: string
          updated_at?: string
        }
        Update: {
          application_url?: string | null
          category?: Database["public"]["Enums"]["competition_category"]
          created_at?: string
          created_by?: string
          deadline?: string
          description?: string | null
          eligibility?: string | null
          event_date?: string | null
          expires_at?: string
          fee?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["event_mode"] | null
          notified_at?: string | null
          organiser?: string
          posted_at?: string
          prize_or_stipend?: string | null
          source_credit?: string | null
          status?: Database["public"]["Enums"]["opp_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cv_analyses: {
        Row: {
          analysis: Json
          completion_tokens: number | null
          created_at: string
          cv_storage_path: string
          duration_ms: number | null
          id: string
          model: string
          overall_score: number
          prompt_tokens: number | null
          user_id: string
          verdict: string
        }
        Insert: {
          analysis?: Json
          completion_tokens?: number | null
          created_at?: string
          cv_storage_path: string
          duration_ms?: number | null
          id?: string
          model: string
          overall_score: number
          prompt_tokens?: number | null
          user_id: string
          verdict: string
        }
        Update: {
          analysis?: Json
          completion_tokens?: number | null
          created_at?: string
          cv_storage_path?: string
          duration_ms?: number | null
          id?: string
          model?: string
          overall_score?: number
          prompt_tokens?: number | null
          user_id?: string
          verdict?: string
        }
        Relationships: []
      }
      email_send_dedupe: {
        Row: {
          dedupe_key: string | null
          id: string
          last_sent_at: string
          recipient_email: string
          send_count: number
          template_name: string
        }
        Insert: {
          dedupe_key?: string | null
          id?: string
          last_sent_at?: string
          recipient_email: string
          send_count?: number
          template_name: string
        }
        Update: {
          dedupe_key?: string | null
          id?: string
          last_sent_at?: string
          recipient_email?: string
          send_count?: number
          template_name?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_stream_unsubscribes: {
        Row: {
          created_at: string
          email: string
          id: string
          stream: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stream: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stream?: string
        }
        Relationships: []
      }
      email_suppression: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
          template_scope: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
          template_scope?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
          template_scope?: string | null
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          template_scope: string | null
          token: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          template_scope?: string | null
          token: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          template_scope?: string | null
          token?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      firm_careers_sources: {
        Row: {
          active: boolean
          country: string
          created_at: string
          firm_name: string | null
          firm_slug: string | null
          id: string
          last_error: string | null
          last_scraped_at: string | null
          last_status: string | null
          last_success_at: string | null
          name: string | null
          notes: string | null
          pipeline_status: Database["public"]["Enums"]["vacancy_source_status"]
          scrape_count: number
          scrape_frequency: Database["public"]["Enums"]["vacancy_scrape_frequency"]
          selector_hints: Json | null
          source_type: Database["public"]["Enums"]["vacancy_source_type"]
          tier: Database["public"]["Enums"]["vacancy_source_tier"]
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          country?: string
          created_at?: string
          firm_name?: string | null
          firm_slug?: string | null
          id?: string
          last_error?: string | null
          last_scraped_at?: string | null
          last_status?: string | null
          last_success_at?: string | null
          name?: string | null
          notes?: string | null
          pipeline_status?: Database["public"]["Enums"]["vacancy_source_status"]
          scrape_count?: number
          scrape_frequency?: Database["public"]["Enums"]["vacancy_scrape_frequency"]
          selector_hints?: Json | null
          source_type?: Database["public"]["Enums"]["vacancy_source_type"]
          tier?: Database["public"]["Enums"]["vacancy_source_tier"]
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          country?: string
          created_at?: string
          firm_name?: string | null
          firm_slug?: string | null
          id?: string
          last_error?: string | null
          last_scraped_at?: string | null
          last_status?: string | null
          last_success_at?: string | null
          name?: string | null
          notes?: string | null
          pipeline_status?: Database["public"]["Enums"]["vacancy_source_status"]
          scrape_count?: number
          scrape_frequency?: Database["public"]["Enums"]["vacancy_scrape_frequency"]
          selector_hints?: Json | null
          source_type?: Database["public"]["Enums"]["vacancy_source_type"]
          tier?: Database["public"]["Enums"]["vacancy_source_tier"]
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      firm_chat_logs: {
        Row: {
          anon_id: string | null
          answer: string | null
          created_at: string
          firm_slug: string
          id: string
          question: string
          user_id: string | null
        }
        Insert: {
          anon_id?: string | null
          answer?: string | null
          created_at?: string
          firm_slug: string
          id?: string
          question: string
          user_id?: string | null
        }
        Update: {
          anon_id?: string | null
          answer?: string | null
          created_at?: string
          firm_slug?: string
          id?: string
          question?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firm_chat_logs_firm_slug_fkey"
            columns: ["firm_slug"]
            isOneToOne: false
            referencedRelation: "firm_profiles"
            referencedColumns: ["firm_slug"]
          },
        ]
      }
      firm_comparable_index: {
        Row: {
          comparable_slug: string
          computed_at: string
          firm_slug: string
          same_city: boolean
          same_tier: boolean
          shared_practice_areas: number
          similarity_score: number
        }
        Insert: {
          comparable_slug: string
          computed_at?: string
          firm_slug: string
          same_city?: boolean
          same_tier?: boolean
          shared_practice_areas?: number
          similarity_score: number
        }
        Update: {
          comparable_slug?: string
          computed_at?: string
          firm_slug?: string
          same_city?: boolean
          same_tier?: boolean
          shared_practice_areas?: number
          similarity_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "firm_comparable_index_comparable_slug_fkey"
            columns: ["comparable_slug"]
            isOneToOne: false
            referencedRelation: "firm_profiles"
            referencedColumns: ["firm_slug"]
          },
          {
            foreignKeyName: "firm_comparable_index_firm_slug_fkey"
            columns: ["firm_slug"]
            isOneToOne: false
            referencedRelation: "firm_profiles"
            referencedColumns: ["firm_slug"]
          },
        ]
      }
      firm_news_mentions: {
        Row: {
          created_at: string
          excerpt: string | null
          firm_slug: string
          id: string
          mention_type: Database["public"]["Enums"]["firm_news_mention_type"]
          published_at: string
          source: Database["public"]["Enums"]["firm_news_source"]
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          excerpt?: string | null
          firm_slug: string
          id?: string
          mention_type?: Database["public"]["Enums"]["firm_news_mention_type"]
          published_at: string
          source?: Database["public"]["Enums"]["firm_news_source"]
          title: string
          url: string
        }
        Update: {
          created_at?: string
          excerpt?: string | null
          firm_slug?: string
          id?: string
          mention_type?: Database["public"]["Enums"]["firm_news_mention_type"]
          published_at?: string
          source?: Database["public"]["Enums"]["firm_news_source"]
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_news_mentions_firm_slug_fkey"
            columns: ["firm_slug"]
            isOneToOne: false
            referencedRelation: "firm_profiles"
            referencedColumns: ["firm_slug"]
          },
        ]
      }
      firm_offices: {
        Row: {
          address: string | null
          city: string
          created_at: string
          email: string | null
          firm_slug: string
          headcount: number | null
          id: string
          is_hq: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          email?: string | null
          firm_slug: string
          headcount?: number | null
          id?: string
          is_hq?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          email?: string | null
          firm_slug?: string
          headcount?: number | null
          id?: string
          is_hq?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_offices_firm_slug_fkey"
            columns: ["firm_slug"]
            isOneToOne: false
            referencedRelation: "firm_profiles"
            referencedColumns: ["firm_slug"]
          },
        ]
      }
      firm_practice_areas: {
        Row: {
          area: string
          created_at: string
          depth_score: number | null
          firm_slug: string
          id: string
          is_signature: boolean
          partner_count: number | null
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          depth_score?: number | null
          firm_slug: string
          id?: string
          is_signature?: boolean
          partner_count?: number | null
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          depth_score?: number | null
          firm_slug?: string
          id?: string
          is_signature?: boolean
          partner_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_practice_areas_firm_slug_fkey"
            columns: ["firm_slug"]
            isOneToOne: false
            referencedRelation: "firm_profiles"
            referencedColumns: ["firm_slug"]
          },
        ]
      }
      firm_profiles: {
        Row: {
          careers_email: string | null
          careers_url: string | null
          created_at: string
          description: string | null
          firm_name: string
          firm_slug: string
          founded_year: number | null
          general_email: string | null
          growth_signal_90d: Database["public"]["Enums"]["firm_growth_signal"]
          headcount_band:
            | Database["public"]["Enums"]["firm_headcount_band"]
            | null
          hiring_velocity: number | null
          hq_city: string | null
          instagram_url: string | null
          intelligence_completeness_score: number
          last_scraped_at: string | null
          linkedin_url: string | null
          locus_take: string | null
          news_last_updated_at: string | null
          office_addresses: Json
          office_count: number | null
          offices: string[]
          offices_last_updated_at: string | null
          partner_associate_ratio: number | null
          partner_count: number | null
          phone_main: string | null
          practice_areas: string[]
          practice_areas_last_updated_at: string | null
          press_email: string | null
          scrape_status: string | null
          tagline: string | null
          team_last_updated_at: string | null
          team_members: Json
          team_page_url: string | null
          tier: Database["public"]["Enums"]["firm_tier"]
          total_lawyers: number | null
          twitter_url: string | null
          updated_at: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          careers_email?: string | null
          careers_url?: string | null
          created_at?: string
          description?: string | null
          firm_name: string
          firm_slug: string
          founded_year?: number | null
          general_email?: string | null
          growth_signal_90d?: Database["public"]["Enums"]["firm_growth_signal"]
          headcount_band?:
            | Database["public"]["Enums"]["firm_headcount_band"]
            | null
          hiring_velocity?: number | null
          hq_city?: string | null
          instagram_url?: string | null
          intelligence_completeness_score?: number
          last_scraped_at?: string | null
          linkedin_url?: string | null
          locus_take?: string | null
          news_last_updated_at?: string | null
          office_addresses?: Json
          office_count?: number | null
          offices?: string[]
          offices_last_updated_at?: string | null
          partner_associate_ratio?: number | null
          partner_count?: number | null
          phone_main?: string | null
          practice_areas?: string[]
          practice_areas_last_updated_at?: string | null
          press_email?: string | null
          scrape_status?: string | null
          tagline?: string | null
          team_last_updated_at?: string | null
          team_members?: Json
          team_page_url?: string | null
          tier?: Database["public"]["Enums"]["firm_tier"]
          total_lawyers?: number | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          careers_email?: string | null
          careers_url?: string | null
          created_at?: string
          description?: string | null
          firm_name?: string
          firm_slug?: string
          founded_year?: number | null
          general_email?: string | null
          growth_signal_90d?: Database["public"]["Enums"]["firm_growth_signal"]
          headcount_band?:
            | Database["public"]["Enums"]["firm_headcount_band"]
            | null
          hiring_velocity?: number | null
          hq_city?: string | null
          instagram_url?: string | null
          intelligence_completeness_score?: number
          last_scraped_at?: string | null
          linkedin_url?: string | null
          locus_take?: string | null
          news_last_updated_at?: string | null
          office_addresses?: Json
          office_count?: number | null
          offices?: string[]
          offices_last_updated_at?: string | null
          partner_associate_ratio?: number | null
          partner_count?: number | null
          phone_main?: string | null
          practice_areas?: string[]
          practice_areas_last_updated_at?: string | null
          press_email?: string | null
          scrape_status?: string | null
          tagline?: string | null
          team_last_updated_at?: string | null
          team_members?: Json
          team_page_url?: string | null
          tier?: Database["public"]["Enums"]["firm_tier"]
          total_lawyers?: number | null
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      firm_rankings: {
        Row: {
          band_or_tier: string
          created_at: string
          firm_slug: string
          id: string
          practice_area: string | null
          ranking_source: Database["public"]["Enums"]["firm_ranking_source"]
          year: number
        }
        Insert: {
          band_or_tier: string
          created_at?: string
          firm_slug: string
          id?: string
          practice_area?: string | null
          ranking_source: Database["public"]["Enums"]["firm_ranking_source"]
          year: number
        }
        Update: {
          band_or_tier?: string
          created_at?: string
          firm_slug?: string
          id?: string
          practice_area?: string | null
          ranking_source?: Database["public"]["Enums"]["firm_ranking_source"]
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "firm_rankings_firm_slug_fkey"
            columns: ["firm_slug"]
            isOneToOne: false
            referencedRelation: "firm_profiles"
            referencedColumns: ["firm_slug"]
          },
        ]
      }
      firm_suggestions: {
        Row: {
          admin_note: string | null
          created_at: string
          current_value: string | null
          evidence: string | null
          field: string
          firm_city_snapshot: string | null
          firm_id: string
          firm_name_snapshot: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggested_value: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          current_value?: string | null
          evidence?: string | null
          field: string
          firm_city_snapshot?: string | null
          firm_id: string
          firm_name_snapshot: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_value: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          current_value?: string | null
          evidence?: string | null
          field?: string
          firm_city_snapshot?: string | null
          firm_id?: string
          firm_name_snapshot?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_value?: string
          user_id?: string | null
        }
        Relationships: []
      }
      firm_team_members: {
        Row: {
          created_at: string
          firm_slug: string
          first_seen_at: string
          id: string
          image_url: string | null
          last_seen_at: string
          name: string
          practice_area: string | null
          profile_url: string | null
          seniority: Database["public"]["Enums"]["firm_seniority"]
          status: Database["public"]["Enums"]["firm_team_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          firm_slug: string
          first_seen_at?: string
          id?: string
          image_url?: string | null
          last_seen_at?: string
          name: string
          practice_area?: string | null
          profile_url?: string | null
          seniority?: Database["public"]["Enums"]["firm_seniority"]
          status?: Database["public"]["Enums"]["firm_team_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          firm_slug?: string
          first_seen_at?: string
          id?: string
          image_url?: string | null
          last_seen_at?: string
          name?: string
          practice_area?: string | null
          profile_url?: string | null
          seniority?: Database["public"]["Enums"]["firm_seniority"]
          status?: Database["public"]["Enums"]["firm_team_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_team_members_firm_slug_fkey"
            columns: ["firm_slug"]
            isOneToOne: false
            referencedRelation: "firm_profiles"
            referencedColumns: ["firm_slug"]
          },
        ]
      }
      firm_team_movements: {
        Row: {
          detected_at: string
          firm_slug: string
          id: string
          member_name: string
          movement_type: Database["public"]["Enums"]["firm_movement_type"]
          next_firm: string | null
          prior_firm: string | null
        }
        Insert: {
          detected_at?: string
          firm_slug: string
          id?: string
          member_name: string
          movement_type: Database["public"]["Enums"]["firm_movement_type"]
          next_firm?: string | null
          prior_firm?: string | null
        }
        Update: {
          detected_at?: string
          firm_slug?: string
          id?: string
          member_name?: string
          movement_type?: Database["public"]["Enums"]["firm_movement_type"]
          next_firm?: string | null
          prior_firm?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "firm_team_movements_firm_slug_fkey"
            columns: ["firm_slug"]
            isOneToOne: false
            referencedRelation: "firm_profiles"
            referencedColumns: ["firm_slug"]
          },
        ]
      }
      firm_team_snapshots: {
        Row: {
          firm_slug: string
          id: string
          members: Json
          snapshot_at: string
        }
        Insert: {
          firm_slug: string
          id?: string
          members?: Json
          snapshot_at?: string
        }
        Update: {
          firm_slug?: string
          id?: string
          members?: Json
          snapshot_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_team_snapshots_firm_slug_fkey"
            columns: ["firm_slug"]
            isOneToOne: false
            referencedRelation: "firm_profiles"
            referencedColumns: ["firm_slug"]
          },
        ]
      }
      moots: {
        Row: {
          area_of_law: string | null
          competition_name: string
          created_at: string
          created_by: string
          description: string | null
          edition: string | null
          eligibility: string | null
          event_end_date: string | null
          event_start_date: string | null
          expires_at: string
          id: string
          mode: Database["public"]["Enums"]["event_mode"]
          notified_at: string | null
          organiser: string
          posted_at: string
          prize_pool: string | null
          registration_deadline: string
          registration_url: string | null
          source_credit: string | null
          status: Database["public"]["Enums"]["opp_status"]
          updated_at: string
          venue: string | null
        }
        Insert: {
          area_of_law?: string | null
          competition_name: string
          created_at?: string
          created_by: string
          description?: string | null
          edition?: string | null
          eligibility?: string | null
          event_end_date?: string | null
          event_start_date?: string | null
          expires_at: string
          id?: string
          mode?: Database["public"]["Enums"]["event_mode"]
          notified_at?: string | null
          organiser: string
          posted_at?: string
          prize_pool?: string | null
          registration_deadline: string
          registration_url?: string | null
          source_credit?: string | null
          status?: Database["public"]["Enums"]["opp_status"]
          updated_at?: string
          venue?: string | null
        }
        Update: {
          area_of_law?: string | null
          competition_name?: string
          created_at?: string
          created_by?: string
          description?: string | null
          edition?: string | null
          eligibility?: string | null
          event_end_date?: string | null
          event_start_date?: string | null
          expires_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["event_mode"]
          notified_at?: string | null
          organiser?: string
          posted_at?: string
          prize_pool?: string | null
          registration_deadline?: string
          registration_url?: string | null
          source_credit?: string | null
          status?: Database["public"]["Enums"]["opp_status"]
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          entity_id: string | null
          id: string
          recipient_email: string
          sent_at: string
          stream: string
          user_id: string | null
        }
        Insert: {
          entity_id?: string | null
          id?: string
          recipient_email: string
          sent_at?: string
          stream: string
          user_id?: string | null
        }
        Update: {
          entity_id?: string | null
          id?: string
          recipient_email?: string
          sent_at?: string
          stream?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pipeline_failures: {
        Row: {
          context: Json | null
          created_at: string
          error_message: string
          id: string
          pipeline: string
          step: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          error_message: string
          id?: string
          pipeline: string
          step: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          error_message?: string
          id?: string
          pipeline?: string
          step?: string
        }
        Relationships: []
      }
      profile_applications: {
        Row: {
          applied_on: string
          created_at: string
          firm_name_snapshot: string
          id: string
          method: Database["public"]["Enums"]["application_method"]
          notes: string | null
          role: string
          status: Database["public"]["Enums"]["application_status"]
          status_updated_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_on: string
          created_at?: string
          firm_name_snapshot: string
          id?: string
          method?: Database["public"]["Enums"]["application_method"]
          notes?: string | null
          role: string
          status?: Database["public"]["Enums"]["application_status"]
          status_updated_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_on?: string
          created_at?: string
          firm_name_snapshot?: string
          id?: string
          method?: Database["public"]["Enums"]["application_method"]
          notes?: string | null
          role?: string
          status?: Database["public"]["Enums"]["application_status"]
          status_updated_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      profile_playbook_progress: {
        Row: {
          completed_at: string | null
          guide_slug: string
          last_read_at: string
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          guide_slug: string
          last_read_at?: string
          started_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          guide_slug?: string
          last_read_at?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
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
          applications_count: number
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
          open_to_opportunities: boolean
          subjects_of_interest: string[]
          target_locations: string[]
          target_practice_areas: string[]
          target_tiers: string[]
          username: string
        }
        Insert: {
          applications_count?: number
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
          open_to_opportunities?: boolean
          subjects_of_interest?: string[]
          target_locations?: string[]
          target_practice_areas?: string[]
          target_tiers?: string[]
          username: string
        }
        Update: {
          applications_count?: number
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
          open_to_opportunities?: boolean
          subjects_of_interest?: string[]
          target_locations?: string[]
          target_practice_areas?: string[]
          target_tiers?: string[]
          username?: string
        }
        Relationships: []
      }
      scrape_runs: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          raw_log: string | null
          source_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["scrape_run_status"]
          triggered_by: string
          vacancies_found: number
          vacancies_marked_stale: number
          vacancies_new: number
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          raw_log?: string | null
          source_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["scrape_run_status"]
          triggered_by?: string
          vacancies_found?: number
          vacancies_marked_stale?: number
          vacancies_new?: number
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          raw_log?: string | null
          source_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["scrape_run_status"]
          triggered_by?: string
          vacancies_found?: number
          vacancies_marked_stale?: number
          vacancies_new?: number
        }
        Relationships: [
          {
            foreignKeyName: "scrape_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "firm_careers_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      update_broadcasts: {
        Row: {
          body_html: string | null
          body_markdown: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          id: string
          metadata: Json
          preheader: string | null
          recipient_count: number
          sent_at: string
          sent_by: string
          status: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          body_markdown: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          metadata?: Json
          preheader?: string | null
          recipient_count?: number
          sent_at?: string
          sent_by: string
          status?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          body_markdown?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          metadata?: Json
          preheader?: string | null
          recipient_count?: number
          sent_at?: string
          sent_by?: string
          status?: string | null
          subject?: string
          updated_at?: string
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
      vacancies: {
        Row: {
          application_email: string | null
          application_mode: Database["public"]["Enums"]["vacancy_application_mode"]
          application_url: string | null
          created_at: string
          created_by: string
          description: string | null
          eligibility: string | null
          expires_at: string
          firm_name: string
          id: string
          location: string | null
          opportunity_type: Database["public"]["Enums"]["vacancy_opportunity_type"]
          posted_at: string
          practice_area: string | null
          role: string
          source_credit: string | null
          status: Database["public"]["Enums"]["vacancy_status"]
          stipend: string | null
          task_brief: string | null
          tier: Database["public"]["Enums"]["vacancy_tier"] | null
          updated_at: string
        }
        Insert: {
          application_email?: string | null
          application_mode?: Database["public"]["Enums"]["vacancy_application_mode"]
          application_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          eligibility?: string | null
          expires_at: string
          firm_name: string
          id?: string
          location?: string | null
          opportunity_type?: Database["public"]["Enums"]["vacancy_opportunity_type"]
          posted_at?: string
          practice_area?: string | null
          role: string
          source_credit?: string | null
          status?: Database["public"]["Enums"]["vacancy_status"]
          stipend?: string | null
          task_brief?: string | null
          tier?: Database["public"]["Enums"]["vacancy_tier"] | null
          updated_at?: string
        }
        Update: {
          application_email?: string | null
          application_mode?: Database["public"]["Enums"]["vacancy_application_mode"]
          application_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          eligibility?: string | null
          expires_at?: string
          firm_name?: string
          id?: string
          location?: string | null
          opportunity_type?: Database["public"]["Enums"]["vacancy_opportunity_type"]
          posted_at?: string
          practice_area?: string | null
          role?: string
          source_credit?: string | null
          status?: Database["public"]["Enums"]["vacancy_status"]
          stipend?: string | null
          task_brief?: string | null
          tier?: Database["public"]["Enums"]["vacancy_tier"] | null
          updated_at?: string
        }
        Relationships: []
      }
      vacancy_review_queue: {
        Row: {
          admin_notes: string | null
          ai_extracted: Json
          application_mode:
            | Database["public"]["Enums"]["vacancy_application_mode_pipeline"]
            | null
          application_subject: string | null
          application_target: string | null
          consecutive_misses: number
          created_at: string
          dedupe_hash: string
          description_excerpt: string | null
          description_full: string | null
          discovered_at: string
          duplicate_of: string | null
          eligibility_confidence: number | null
          eligibility_india: Database["public"]["Enums"]["vacancy_eligibility_india"]
          eligibility_reason: string | null
          first_seen_at: string
          id: string
          is_published: boolean
          is_remote: boolean
          last_seen_at: string
          lifecycle_status: Database["public"]["Enums"]["vacancy_lifecycle_status"]
          location: string | null
          manual_eligibility_override: boolean
          notes: string | null
          pqe_max: number | null
          pqe_min: number | null
          practice_area: string | null
          promoted_vacancy_id: string | null
          raw_text: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role_title: string | null
          role_type: Database["public"]["Enums"]["vacancy_role_type"] | null
          source: Database["public"]["Enums"]["vacancy_queue_source"]
          source_deadline: string | null
          source_firm: string | null
          source_id: string | null
          source_posted_date: string | null
          source_title: string | null
          source_url: string
          status: Database["public"]["Enums"]["vacancy_queue_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          ai_extracted?: Json
          application_mode?:
            | Database["public"]["Enums"]["vacancy_application_mode_pipeline"]
            | null
          application_subject?: string | null
          application_target?: string | null
          consecutive_misses?: number
          created_at?: string
          dedupe_hash: string
          description_excerpt?: string | null
          description_full?: string | null
          discovered_at?: string
          duplicate_of?: string | null
          eligibility_confidence?: number | null
          eligibility_india?: Database["public"]["Enums"]["vacancy_eligibility_india"]
          eligibility_reason?: string | null
          first_seen_at?: string
          id?: string
          is_published?: boolean
          is_remote?: boolean
          last_seen_at?: string
          lifecycle_status?: Database["public"]["Enums"]["vacancy_lifecycle_status"]
          location?: string | null
          manual_eligibility_override?: boolean
          notes?: string | null
          pqe_max?: number | null
          pqe_min?: number | null
          practice_area?: string | null
          promoted_vacancy_id?: string | null
          raw_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_title?: string | null
          role_type?: Database["public"]["Enums"]["vacancy_role_type"] | null
          source: Database["public"]["Enums"]["vacancy_queue_source"]
          source_deadline?: string | null
          source_firm?: string | null
          source_id?: string | null
          source_posted_date?: string | null
          source_title?: string | null
          source_url: string
          status?: Database["public"]["Enums"]["vacancy_queue_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          ai_extracted?: Json
          application_mode?:
            | Database["public"]["Enums"]["vacancy_application_mode_pipeline"]
            | null
          application_subject?: string | null
          application_target?: string | null
          consecutive_misses?: number
          created_at?: string
          dedupe_hash?: string
          description_excerpt?: string | null
          description_full?: string | null
          discovered_at?: string
          duplicate_of?: string | null
          eligibility_confidence?: number | null
          eligibility_india?: Database["public"]["Enums"]["vacancy_eligibility_india"]
          eligibility_reason?: string | null
          first_seen_at?: string
          id?: string
          is_published?: boolean
          is_remote?: boolean
          last_seen_at?: string
          lifecycle_status?: Database["public"]["Enums"]["vacancy_lifecycle_status"]
          location?: string | null
          manual_eligibility_override?: boolean
          notes?: string | null
          pqe_max?: number | null
          pqe_min?: number | null
          practice_area?: string | null
          promoted_vacancy_id?: string | null
          raw_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role_title?: string | null
          role_type?: Database["public"]["Enums"]["vacancy_role_type"] | null
          source?: Database["public"]["Enums"]["vacancy_queue_source"]
          source_deadline?: string | null
          source_firm?: string | null
          source_id?: string | null
          source_posted_date?: string | null
          source_title?: string | null
          source_url?: string
          status?: Database["public"]["Enums"]["vacancy_queue_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacancy_review_queue_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "firm_careers_sources"
            referencedColumns: ["id"]
          },
        ]
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
      profile_applications_needing_nudge: {
        Row: {
          applied_on: string | null
          created_at: string | null
          firm_name_snapshot: string | null
          id: string | null
          method: Database["public"]["Enums"]["application_method"] | null
          notes: string | null
          role: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          status_updated_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          applied_on?: string | null
          created_at?: string | null
          firm_name_snapshot?: string | null
          id?: string | null
          method?: Database["public"]["Enums"]["application_method"] | null
          notes?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          status_updated_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          applied_on?: string | null
          created_at?: string | null
          firm_name_snapshot?: string | null
          id?: string | null
          method?: Database["public"]["Enums"]["application_method"] | null
          notes?: string | null
          role?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          status_updated_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      analytics_devices: {
        Args: { p_hours?: number }
        Returns: {
          device: string
          sessions: number
        }[]
      }
      analytics_install_funnel: { Args: { p_days?: number }; Returns: Json }
      analytics_recent: {
        Args: { p_limit?: number }
        Returns: {
          anon_id: string
          created_at: string
          event: string
          id: string
          path: string
          props: Json
          user_id: string
        }[]
      }
      analytics_summary: { Args: { p_hours?: number }; Returns: Json }
      analytics_timeseries: {
        Args: { p_days?: number }
        Returns: {
          dau: number
          day: string
          page_views: number
          signups: number
        }[]
      }
      analytics_top_paths: {
        Args: { p_hours?: number; p_limit?: number }
        Returns: {
          path: string
          uniques: number
          views: number
        }[]
      }
      analytics_top_referrers: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          referrer: string
          sessions: number
        }[]
      }
      bar_browse_challenges: {
        Args: {
          p_area?: string
          p_diff?: string
          p_limit?: number
          p_offset?: number
          p_sort?: string
          p_type?: string
        }
        Returns: Json
      }
      claim_beta_slot: {
        Args: {
          p_email: string
          p_is_public: boolean
          p_name: string
          p_user_id: string
        }
        Returns: {
          claimed_at: string
          code: string | null
          created_at: string
          display_name: string
          email: string | null
          feedback_id: string | null
          id: string
          intro_line_index: number
          is_public: boolean
          personal_note: string | null
          round2_submitted_at: string | null
          slot_number: number
          submitted_at: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "beta_testers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_analytics_salt: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      find_round2_tester: {
        Args: { p_email: string }
        Returns: {
          display_name: string
          email: string
          id: string
          round2_submitted_at: string
          submitted_at: string
        }[]
      }
      find_user_for_admin: {
        Args: { p_query: string }
        Returns: {
          display_name: string
          email: string
          id: string
          roles: string[]
          username: string
        }[]
      }
      get_app_dashboard: { Args: { p_user_id: string }; Returns: Json }
      get_bar_dashboard: { Args: { p_user_id: string }; Returns: Json }
      get_beta_tester_self: {
        Args: { p_id: string }
        Returns: {
          claimed_at: string
          code: string | null
          created_at: string
          display_name: string
          email: string | null
          feedback_id: string | null
          id: string
          intro_line_index: number
          is_public: boolean
          personal_note: string | null
          round2_submitted_at: string | null
          slot_number: number
          submitted_at: string | null
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "beta_testers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_beta_tester_totals: {
        Args: never
        Returns: {
          total_claimed: number
          total_submitted: number
        }[]
      }
      get_email_by_username: { Args: { p_username: string }; Returns: string }
      get_feature_vote_counts: {
        Args: never
        Returns: {
          feature_key: string
          vote_count: number
        }[]
      }
      get_own_cv_ref: {
        Args: never
        Returns: {
          cv_uploaded_at: string
          cv_url: string
        }[]
      }
      get_profile_activity: {
        Args: { p_user_id: string }
        Returns: {
          activity_date: string
          application_count: number
          bar_count: number
          total_count: number
        }[]
      }
      get_public_profile: { Args: { p_username: string }; Returns: Json }
      grant_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      has_admin_scope: {
        Args: { scope: Database["public"]["Enums"]["app_role"]; uid: string }
        Returns: boolean
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
      list_admins: {
        Args: never
        Returns: {
          display_name: string
          email: string
          id: string
          is_self: boolean
          roles: string[]
          username: string
        }[]
      }
      mark_beta_tester_round2_submitted: {
        Args: { p_id: string }
        Returns: undefined
      }
      mark_beta_tester_submitted: { Args: { p_id: string }; Returns: undefined }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      opportunities_lifecycle_tick: { Args: never; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      revoke_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      vacancies_lifecycle_tick: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "opportunities_admin"
        | "waitlist_admin"
        | "bar_admin"
        | "broadcast_admin"
      application_method:
        | "email"
        | "form"
        | "referral"
        | "in_person"
        | "linkedin"
        | "other"
        | "external"
      application_status:
        | "sent"
        | "acknowledged"
        | "interview_scheduled"
        | "interviewed"
        | "offer"
        | "rejected"
        | "accepted"
        | "withdrawn"
        | "no_response"
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
      cfp_publication_type: "journal" | "blog" | "magazine" | "book" | "other"
      competition_category:
        | "essay"
        | "quiz"
        | "debate"
        | "negotiation"
        | "adr"
        | "hackathon"
        | "fellowship"
        | "scholarship"
        | "conference"
        | "workshop"
        | "other"
      degree_type:
        | "BA LLB"
        | "BBA LLB"
        | "BCom LLB"
        | "LLB (3yr)"
        | "LLM"
        | "Other"
      event_mode: "offline" | "online" | "hybrid"
      firm_growth_signal: "growing" | "stable" | "shrinking" | "unknown"
      firm_headcount_band:
        | "micro"
        | "boutique_size"
        | "mid"
        | "large"
        | "big_law"
      firm_movement_type: "joined" | "departed"
      firm_news_mention_type:
        | "deal"
        | "award"
        | "lateral"
        | "ranking"
        | "article"
        | "other"
      firm_news_source:
        | "bar_bench"
        | "livelaw"
        | "scc"
        | "business_standard"
        | "et"
        | "other"
      firm_ranking_source:
        | "chambers"
        | "legal500"
        | "rsg"
        | "iflr1000"
        | "asialaw"
      firm_seniority:
        | "partner"
        | "counsel"
        | "principal_associate"
        | "senior_associate"
        | "associate"
        | "of_counsel"
        | "other"
      firm_team_status: "active" | "departed"
      firm_tier: "tier_1" | "tier_2" | "tier_3" | "boutique" | "untiered"
      moot_result:
        | "winner"
        | "runner_up"
        | "semi_finalist"
        | "quarter_finalist"
        | "participant"
      moot_role: "speaker" | "researcher" | "both"
      opp_status: "live" | "archived"
      scrape_run_status: "success" | "partial" | "failed" | "running"
      vacancy_application_mode: "email" | "external_url"
      vacancy_application_mode_pipeline:
        | "external_url"
        | "email"
        | "onsite_form"
        | "ats_redirect"
        | "unclear"
      vacancy_eligibility_india:
        | "eligible"
        | "ambiguous"
        | "ineligible"
        | "unknown"
      vacancy_lifecycle_status: "active" | "stale" | "expired"
      vacancy_opportunity_type: "internship" | "job"
      vacancy_queue_source: "lawctopus" | "linkedin" | "firm_careers" | "manual"
      vacancy_queue_status: "pending" | "approved" | "rejected" | "duplicate"
      vacancy_role_type:
        | "lateral_hire"
        | "internship"
        | "retainership"
        | "graduate_trainee"
        | "fellowship"
        | "consultant"
        | "support_staff"
        | "other"
      vacancy_scrape_frequency: "daily" | "weekly" | "biweekly" | "monthly"
      vacancy_source_status: "active" | "paused" | "broken"
      vacancy_source_tier: "tier_1" | "tier_2" | "tier_3" | "untiered"
      vacancy_source_type:
        | "indian_law_firm"
        | "intl_law_firm"
        | "un_agency"
        | "intl_court"
        | "ifi"
        | "indian_govt"
        | "indian_regulator"
        | "psu"
        | "big4"
        | "corporate_indian"
        | "corporate_mnc"
        | "ngo"
        | "legal_tech"
        | "other"
      vacancy_status: "live" | "archived" | "deleted"
      vacancy_tier:
        | "tier_1"
        | "tier_2"
        | "tier_3"
        | "boutique"
        | "in_house"
        | "psu"
        | "big_4"
        | "other"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "opportunities_admin",
        "waitlist_admin",
        "bar_admin",
        "broadcast_admin",
      ],
      application_method: [
        "email",
        "form",
        "referral",
        "in_person",
        "linkedin",
        "other",
        "external",
      ],
      application_status: [
        "sent",
        "acknowledged",
        "interview_scheduled",
        "interviewed",
        "offer",
        "rejected",
        "accepted",
        "withdrawn",
        "no_response",
      ],
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
      cfp_publication_type: ["journal", "blog", "magazine", "book", "other"],
      competition_category: [
        "essay",
        "quiz",
        "debate",
        "negotiation",
        "adr",
        "hackathon",
        "fellowship",
        "scholarship",
        "conference",
        "workshop",
        "other",
      ],
      degree_type: [
        "BA LLB",
        "BBA LLB",
        "BCom LLB",
        "LLB (3yr)",
        "LLM",
        "Other",
      ],
      event_mode: ["offline", "online", "hybrid"],
      firm_growth_signal: ["growing", "stable", "shrinking", "unknown"],
      firm_headcount_band: [
        "micro",
        "boutique_size",
        "mid",
        "large",
        "big_law",
      ],
      firm_movement_type: ["joined", "departed"],
      firm_news_mention_type: [
        "deal",
        "award",
        "lateral",
        "ranking",
        "article",
        "other",
      ],
      firm_news_source: [
        "bar_bench",
        "livelaw",
        "scc",
        "business_standard",
        "et",
        "other",
      ],
      firm_ranking_source: [
        "chambers",
        "legal500",
        "rsg",
        "iflr1000",
        "asialaw",
      ],
      firm_seniority: [
        "partner",
        "counsel",
        "principal_associate",
        "senior_associate",
        "associate",
        "of_counsel",
        "other",
      ],
      firm_team_status: ["active", "departed"],
      firm_tier: ["tier_1", "tier_2", "tier_3", "boutique", "untiered"],
      moot_result: [
        "winner",
        "runner_up",
        "semi_finalist",
        "quarter_finalist",
        "participant",
      ],
      moot_role: ["speaker", "researcher", "both"],
      opp_status: ["live", "archived"],
      scrape_run_status: ["success", "partial", "failed", "running"],
      vacancy_application_mode: ["email", "external_url"],
      vacancy_application_mode_pipeline: [
        "external_url",
        "email",
        "onsite_form",
        "ats_redirect",
        "unclear",
      ],
      vacancy_eligibility_india: [
        "eligible",
        "ambiguous",
        "ineligible",
        "unknown",
      ],
      vacancy_lifecycle_status: ["active", "stale", "expired"],
      vacancy_opportunity_type: ["internship", "job"],
      vacancy_queue_source: ["lawctopus", "linkedin", "firm_careers", "manual"],
      vacancy_queue_status: ["pending", "approved", "rejected", "duplicate"],
      vacancy_role_type: [
        "lateral_hire",
        "internship",
        "retainership",
        "graduate_trainee",
        "fellowship",
        "consultant",
        "support_staff",
        "other",
      ],
      vacancy_scrape_frequency: ["daily", "weekly", "biweekly", "monthly"],
      vacancy_source_status: ["active", "paused", "broken"],
      vacancy_source_tier: ["tier_1", "tier_2", "tier_3", "untiered"],
      vacancy_source_type: [
        "indian_law_firm",
        "intl_law_firm",
        "un_agency",
        "intl_court",
        "ifi",
        "indian_govt",
        "indian_regulator",
        "psu",
        "big4",
        "corporate_indian",
        "corporate_mnc",
        "ngo",
        "legal_tech",
        "other",
      ],
      vacancy_status: ["live", "archived", "deleted"],
      vacancy_tier: [
        "tier_1",
        "tier_2",
        "tier_3",
        "boutique",
        "in_house",
        "psu",
        "big_4",
        "other",
      ],
    },
  },
} as const

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
      _backup_virtual_monologue_en_v1: {
        Row: {
          backed_up_at: string | null
          id: string | null
          slug: string | null
          virtual_monologue_en: string | null
        }
        Insert: {
          backed_up_at?: string | null
          id?: string | null
          slug?: string | null
          virtual_monologue_en?: string | null
        }
        Update: {
          backed_up_at?: string | null
          id?: string | null
          slug?: string | null
          virtual_monologue_en?: string | null
        }
        Relationships: []
      }
      _backup_virtual_monologue_ko_v1: {
        Row: {
          backed_up_at: string | null
          id: string | null
          slug: string | null
          virtual_monologue: string | null
        }
        Insert: {
          backed_up_at?: string | null
          id?: string | null
          slug?: string | null
          virtual_monologue?: string | null
        }
        Update: {
          backed_up_at?: string | null
          id?: string | null
          slug?: string | null
          virtual_monologue?: string | null
        }
        Relationships: []
      }
      academy_lesson_progress: {
        Row: {
          category_id: string
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          last_studied_at: string
          lesson_id: string
          sub_category_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          last_studied_at?: string
          lesson_id: string
          sub_category_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          last_studied_at?: string
          lesson_id?: string
          sub_category_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_progress_accounts_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action_type: string
          content_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          action_type: string
          content_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          action_type?: string
          content_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_accounts_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      api_key_usage: {
        Row: {
          action_type: string
          api_key_id: string | null
          created_at: string | null
          error_code: string | null
          id: string
          success: boolean
        }
        Insert: {
          action_type: string
          api_key_id?: string | null
          created_at?: string | null
          error_code?: string | null
          id?: string
          success?: boolean
        }
        Update: {
          action_type?: string
          api_key_id?: string | null
          created_at?: string | null
          error_code?: string | null
          id?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          google_id: string | null
          id: string
          memo: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          google_id?: string | null
          id?: string
          memo?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          google_id?: string | null
          id?: string
          memo?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      blind_game_scores: {
        Row: {
          id: string
          played_at: string | null
          score: number
          streak: number
          user_id: string
        }
        Insert: {
          id?: string
          played_at?: string | null
          score: number
          streak: number
          user_id: string
        }
        Update: {
          id?: string
          played_at?: string | null
          score?: number
          streak?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blind_scores_accounts_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_accounts_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_accounts_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      board_comments: {
        Row: {
          author_id: string
          board_type: Database["public"]["Enums"]["board_type"]
          content: string
          created_at: string | null
          id: string
          locale: string
          post_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          board_type: Database["public"]["Enums"]["board_type"]
          content: string
          created_at?: string | null
          id?: string
          locale?: string
          post_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          board_type?: Database["public"]["Enums"]["board_type"]
          content?: string
          created_at?: string | null
          id?: string
          locale?: string
          post_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_comments_accounts_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_content_research_findings: {
        Row: {
          content_id: string | null
          content_type: string
          created_at: string
          creator: string | null
          decision: string
          evidence_summary: string | null
          id: string
          rejection_reason: string | null
          run_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content_id?: string | null
          content_type: string
          created_at?: string
          creator?: string | null
          decision?: string
          evidence_summary?: string | null
          id?: string
          rejection_reason?: string | null
          run_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content_id?: string | null
          content_type?: string
          created_at?: string
          creator?: string | null
          decision?: string
          evidence_summary?: string | null
          id?: string
          rejection_reason?: string | null
          run_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "celeb_content_research_findings_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celeb_content_research_findings_scope_fkey"
            columns: ["run_id", "content_type"]
            isOneToOne: false
            referencedRelation: "celeb_content_research_scopes"
            referencedColumns: ["run_id", "content_type"]
          },
        ]
      }
      celeb_content_research_runs: {
        Row: {
          batch_key: string
          celeb_id: string
          completed_at: string | null
          created_at: string
          homonym_notes: string | null
          id: string
          name_variants: string[]
          researcher_id: string | null
          researcher_label: string
          started_at: string
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          batch_key: string
          celeb_id: string
          completed_at?: string | null
          created_at?: string
          homonym_notes?: string | null
          id?: string
          name_variants: string[]
          researcher_id?: string | null
          researcher_label: string
          started_at?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          batch_key?: string
          celeb_id?: string
          completed_at?: string | null
          created_at?: string
          homonym_notes?: string | null
          id?: string
          name_variants?: string[]
          researcher_id?: string | null
          researcher_label?: string
          started_at?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ccrr_celeb_celebs_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ccrr_researcher_accounts_fkey"
            columns: ["researcher_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_content_research_scopes: {
        Row: {
          completed_at: string | null
          content_type: string
          created_at: string
          run_id: string
          search_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          content_type: string
          created_at?: string
          run_id: string
          search_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          content_type?: string
          created_at?: string
          run_id?: string
          search_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "celeb_content_research_scopes_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "celeb_content_research_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_content_research_sources: {
        Row: {
          access_status: string
          checked_at: string
          content_type: string
          created_at: string
          finding_id: string | null
          id: string
          notes: string | null
          run_id: string
          source_kind: string
          source_tier: string
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          access_status?: string
          checked_at?: string
          content_type: string
          created_at?: string
          finding_id?: string | null
          id?: string
          notes?: string | null
          run_id: string
          source_kind: string
          source_tier: string
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          access_status?: string
          checked_at?: string
          content_type?: string
          created_at?: string
          finding_id?: string | null
          id?: string
          notes?: string | null
          run_id?: string
          source_kind?: string
          source_tier?: string
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "celeb_content_research_sources_finding_fkey"
            columns: ["finding_id", "run_id", "content_type"]
            isOneToOne: false
            referencedRelation: "celeb_content_research_findings"
            referencedColumns: ["id", "run_id", "content_type"]
          },
          {
            foreignKeyName: "celeb_content_research_sources_scope_fkey"
            columns: ["run_id", "content_type"]
            isOneToOne: false
            referencedRelation: "celeb_content_research_scopes"
            referencedColumns: ["run_id", "content_type"]
          },
        ]
      }
      celeb_contents: {
        Row: {
          celeb_id: string
          completed_at: string | null
          content_id: string
          contributor_id_snapshot: string | null
          contributor_member_id: string | null
          contributor_name_snapshot: string | null
          created_at: string
          id: string
          is_pinned: boolean | null
          is_recommended: boolean | null
          is_spoiler: boolean | null
          pinned_at: string | null
          rating: number | null
          review: string | null
          review_en: string | null
          review_presets: string[] | null
          source_url: string | null
          status: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_type"] | null
        }
        Insert: {
          celeb_id: string
          completed_at?: string | null
          content_id: string
          contributor_id_snapshot?: string | null
          contributor_member_id?: string | null
          contributor_name_snapshot?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          is_recommended?: boolean | null
          is_spoiler?: boolean | null
          pinned_at?: string | null
          rating?: number | null
          review?: string | null
          review_en?: string | null
          review_presets?: string[] | null
          source_url?: string | null
          status: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_type"] | null
        }
        Update: {
          celeb_id?: string
          completed_at?: string | null
          content_id?: string
          contributor_id_snapshot?: string | null
          contributor_member_id?: string | null
          contributor_name_snapshot?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          is_recommended?: boolean | null
          is_spoiler?: boolean | null
          pinned_at?: string | null
          rating?: number | null
          review?: string | null
          review_en?: string | null
          review_presets?: string[] | null
          source_url?: string | null
          status?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "celeb_contents_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celeb_contents_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celeb_contents_contributor_member_id_fkey"
            columns: ["contributor_member_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_dialogues: {
        Row: {
          celeb_id: string
          created_at: string | null
          lines: Json
          lines_en: Json | null
          updated_at: string | null
        }
        Insert: {
          celeb_id: string
          created_at?: string | null
          lines?: Json
          lines_en?: Json | null
          updated_at?: string | null
        }
        Update: {
          celeb_id?: string
          created_at?: string | null
          lines?: Json
          lines_en?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celeb_dialogues_celebs_fkey"
            columns: ["celeb_id"]
            isOneToOne: true
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_explanations: {
        Row: {
          created_at: string
          interpretive_text: string
          interpretive_text_en: string | null
          interpretive_title: string
          interpretive_title_en: string | null
          plain_text: string
          plain_text_en: string | null
          profile_id: string
          published_at: string | null
          review_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          interpretive_text: string
          interpretive_text_en?: string | null
          interpretive_title: string
          interpretive_title_en?: string | null
          plain_text: string
          plain_text_en?: string | null
          profile_id: string
          published_at?: string | null
          review_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          interpretive_text?: string
          interpretive_text_en?: string | null
          interpretive_title?: string
          interpretive_title_en?: string | null
          plain_text?: string
          plain_text_en?: string | null
          profile_id?: string
          published_at?: string | null
          review_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "celeb_explanations_celebs_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_guestbook_entries: {
        Row: {
          author_member_id: string
          celeb_id: string
          content: string
          created_at: string | null
          id: string
          is_private: boolean | null
          is_read: boolean | null
          updated_at: string | null
        }
        Insert: {
          author_member_id: string
          celeb_id: string
          content: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          is_read?: boolean | null
          updated_at?: string | null
        }
        Update: {
          author_member_id?: string
          celeb_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          is_read?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celeb_guestbook_entries_author_member_id_fkey"
            columns: ["author_member_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celeb_guestbook_entries_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_influence: {
        Row: {
          celeb_id: string
          created_at: string | null
          cultural: number | null
          cultural_exp: string | null
          cultural_exp_en: string | null
          economic: number | null
          economic_exp: string | null
          economic_exp_en: string | null
          id: string
          political: number | null
          political_exp: string | null
          political_exp_en: string | null
          social: number | null
          social_exp: string | null
          social_exp_en: string | null
          strategic: number | null
          strategic_exp: string | null
          strategic_exp_en: string | null
          tech: number | null
          tech_exp: string | null
          tech_exp_en: string | null
          total_score: number | null
          transhistoricity: number | null
          transhistoricity_exp: string | null
          transhistoricity_exp_en: string | null
          updated_at: string | null
        }
        Insert: {
          celeb_id: string
          created_at?: string | null
          cultural?: number | null
          cultural_exp?: string | null
          cultural_exp_en?: string | null
          economic?: number | null
          economic_exp?: string | null
          economic_exp_en?: string | null
          id?: string
          political?: number | null
          political_exp?: string | null
          political_exp_en?: string | null
          social?: number | null
          social_exp?: string | null
          social_exp_en?: string | null
          strategic?: number | null
          strategic_exp?: string | null
          strategic_exp_en?: string | null
          tech?: number | null
          tech_exp?: string | null
          tech_exp_en?: string | null
          total_score?: number | null
          transhistoricity?: number | null
          transhistoricity_exp?: string | null
          transhistoricity_exp_en?: string | null
          updated_at?: string | null
        }
        Update: {
          celeb_id?: string
          created_at?: string | null
          cultural?: number | null
          cultural_exp?: string | null
          cultural_exp_en?: string | null
          economic?: number | null
          economic_exp?: string | null
          economic_exp_en?: string | null
          id?: string
          political?: number | null
          political_exp?: string | null
          political_exp_en?: string | null
          social?: number | null
          social_exp?: string | null
          social_exp_en?: string | null
          strategic?: number | null
          strategic_exp?: string | null
          strategic_exp_en?: string | null
          tech?: number | null
          tech_exp?: string | null
          tech_exp_en?: string | null
          total_score?: number | null
          transhistoricity?: number | null
          transhistoricity_exp?: string | null
          transhistoricity_exp_en?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celeb_influence_celebs_fkey"
            columns: ["celeb_id"]
            isOneToOne: true
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_metrics: {
        Row: {
          celeb_id: string
          content_count: number | null
          follower_count: number | null
          updated_at: string | null
        }
        Insert: {
          celeb_id: string
          content_count?: number | null
          follower_count?: number | null
          updated_at?: string | null
        }
        Update: {
          celeb_id?: string
          content_count?: number | null
          follower_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celeb_metrics_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: true
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_music_candidates: {
        Row: {
          artist: string | null
          celeb_id: string
          content_id: string | null
          created_at: string
          evidence: string | null
          id: string
          reject_reason: string | null
          source_url: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          artist?: string | null
          celeb_id: string
          content_id?: string | null
          created_at?: string
          evidence?: string | null
          id?: string
          reject_reason?: string | null
          source_url: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          artist?: string | null
          celeb_id?: string
          content_id?: string | null
          created_at?: string
          evidence?: string | null
          id?: string
          reject_reason?: string | null
          source_url?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "celeb_music_candidates_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cmc_celeb_celebs_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_persona: {
        Row: {
          benevolence: number
          cautious_bold: number
          celeb_id: string
          charm: number
          command: number
          conservative_progressive: number
          courage: number
          created_at: string | null
          diligence: number
          fairness: number
          humility: number
          id: string
          individual_social: number
          intellect: number
          loyalty: number
          martial: number
          persona: Json
          pessimism_optimism: number
          reflection: number
          temperance: number
          updated_at: string | null
        }
        Insert: {
          benevolence?: number
          cautious_bold?: number
          celeb_id: string
          charm?: number
          command?: number
          conservative_progressive?: number
          courage?: number
          created_at?: string | null
          diligence?: number
          fairness?: number
          humility?: number
          id?: string
          individual_social?: number
          intellect?: number
          loyalty?: number
          martial?: number
          persona: Json
          pessimism_optimism?: number
          reflection?: number
          temperance?: number
          updated_at?: string | null
        }
        Update: {
          benevolence?: number
          cautious_bold?: number
          celeb_id?: string
          charm?: number
          command?: number
          conservative_progressive?: number
          courage?: number
          created_at?: string | null
          diligence?: number
          fairness?: number
          humility?: number
          id?: string
          individual_social?: number
          intellect?: number
          loyalty?: number
          martial?: number
          persona?: Json
          pessimism_optimism?: number
          reflection?: number
          temperance?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celeb_persona_celebs_fkey"
            columns: ["celeb_id"]
            isOneToOne: true
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_relations: {
        Row: {
          created_at: string
          from_id: string
          id: string
          label_en: string | null
          label_ko: string | null
          note: string | null
          note_en: string | null
          rel_group: string
          rel_type: string
          source: string
          to_id: string
        }
        Insert: {
          created_at?: string
          from_id: string
          id?: string
          label_en?: string | null
          label_ko?: string | null
          note?: string | null
          note_en?: string | null
          rel_group: string
          rel_type: string
          source?: string
          to_id: string
        }
        Update: {
          created_at?: string
          from_id?: string
          id?: string
          label_en?: string | null
          label_ko?: string | null
          note?: string | null
          note_en?: string | null
          rel_group?: string
          rel_type?: string
          source?: string
          to_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "celeb_relations_from_celebs_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celeb_relations_to_celebs_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_relations_external: {
        Row: {
          created_at: string
          from_id: string
          id: string
          image_url: string | null
          name_en: string | null
          name_ko: string | null
          note: string | null
          note_en: string | null
          qid: string
          rel_group: string
          rel_type: string
          source: string
        }
        Insert: {
          created_at?: string
          from_id: string
          id?: string
          image_url?: string | null
          name_en?: string | null
          name_ko?: string | null
          note?: string | null
          note_en?: string | null
          qid: string
          rel_group?: string
          rel_type: string
          source?: string
        }
        Update: {
          created_at?: string
          from_id?: string
          id?: string
          image_url?: string | null
          name_en?: string | null
          name_ko?: string | null
          note?: string | null
          note_en?: string | null
          qid?: string
          rel_group?: string
          rel_type?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "celeb_rel_external_celebs_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_tag_assignments: {
        Row: {
          assigned_at: string | null
          celeb_id: string
          faction_image_url: string | null
          hidden: boolean
          id: string
          long_desc: string | null
          long_desc_en: string | null
          quote: string | null
          quote_en: string | null
          short_desc: string | null
          short_desc_en: string | null
          sort_order: number | null
          spotlight_image_url: string | null
          tag_id: string
        }
        Insert: {
          assigned_at?: string | null
          celeb_id: string
          faction_image_url?: string | null
          hidden?: boolean
          id?: string
          long_desc?: string | null
          long_desc_en?: string | null
          quote?: string | null
          quote_en?: string | null
          short_desc?: string | null
          short_desc_en?: string | null
          sort_order?: number | null
          spotlight_image_url?: string | null
          tag_id: string
        }
        Update: {
          assigned_at?: string | null
          celeb_id?: string
          faction_image_url?: string | null
          hidden?: boolean
          id?: string
          long_desc?: string | null
          long_desc_en?: string | null
          quote?: string | null
          quote_en?: string | null
          short_desc?: string | null
          short_desc_en?: string | null
          sort_order?: number | null
          spotlight_image_url?: string | null
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "celeb_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "celeb_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celeb_tags_celebs_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_tags: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          description_en: string | null
          end_date: string | null
          id: string
          is_featured: boolean | null
          is_fiction: boolean
          name: string
          name_en: string | null
          parent_id: string | null
          slug: string | null
          sort_order: number | null
          start_date: string | null
          team_images: Json
          theme_music: Json | null
          updated_at: string | null
          youtube_videos: Json | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          description_en?: string | null
          end_date?: string | null
          id?: string
          is_featured?: boolean | null
          is_fiction?: boolean
          name: string
          name_en?: string | null
          parent_id?: string | null
          slug?: string | null
          sort_order?: number | null
          start_date?: string | null
          team_images?: Json
          theme_music?: Json | null
          updated_at?: string | null
          youtube_videos?: Json | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          description_en?: string | null
          end_date?: string | null
          id?: string
          is_featured?: boolean | null
          is_fiction?: boolean
          name?: string
          name_en?: string | null
          parent_id?: string | null
          slug?: string | null
          sort_order?: number | null
          start_date?: string | null
          team_images?: Json
          theme_music?: Json | null
          updated_at?: string | null
          youtube_videos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "celeb_tags_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "celeb_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_task_queue: {
        Row: {
          attempt_count: number
          celeb_id: string
          claimed_at: string | null
          claimed_by: string | null
          completed_at: string | null
          created_at: string
          last_error: string | null
          lease_expires_at: string | null
          payload: Json
          priority: number
          status: string
          task_type: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          celeb_id: string
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string
          last_error?: string | null
          lease_expires_at?: string | null
          payload?: Json
          priority?: number
          status?: string
          task_type: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          celeb_id?: string
          claimed_at?: string | null
          claimed_by?: string | null
          completed_at?: string | null
          created_at?: string
          last_error?: string | null
          lease_expires_at?: string | null
          payload?: Json
          priority?: number
          status?: string
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "celeb_task_queue_celebs_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_timeline_events: {
        Row: {
          celeb_id: string
          created_at: string
          day: number | null
          description: string | null
          description_en: string | null
          id: string
          kind: string
          lat: number | null
          lng: number | null
          month: number | null
          place_name: string | null
          place_name_en: string | null
          place_qid: string | null
          sequence_label: string | null
          sequence_label_en: string | null
          sort_order: number
          source: string
          source_url: string | null
          title: string
          title_en: string | null
          updated_at: string
          year: number | null
          year_end: number | null
        }
        Insert: {
          celeb_id: string
          created_at?: string
          day?: number | null
          description?: string | null
          description_en?: string | null
          id?: string
          kind?: string
          lat?: number | null
          lng?: number | null
          month?: number | null
          place_name?: string | null
          place_name_en?: string | null
          place_qid?: string | null
          sequence_label?: string | null
          sequence_label_en?: string | null
          sort_order?: number
          source?: string
          source_url?: string | null
          title: string
          title_en?: string | null
          updated_at?: string
          year?: number | null
          year_end?: number | null
        }
        Update: {
          celeb_id?: string
          created_at?: string
          day?: number | null
          description?: string | null
          description_en?: string | null
          id?: string
          kind?: string
          lat?: number | null
          lng?: number | null
          month?: number | null
          place_name?: string | null
          place_name_en?: string | null
          place_qid?: string | null
          sequence_label?: string | null
          sequence_label_en?: string | null
          sort_order?: number
          source?: string
          source_url?: string | null
          title?: string
          title_en?: string | null
          updated_at?: string
          year?: number | null
          year_end?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "celeb_timeline_celebs_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_views_daily: {
        Row: {
          celeb_id: string
          view_date: string
          views: number
        }
        Insert: {
          celeb_id: string
          view_date: string
          views?: number
        }
        Update: {
          celeb_id?: string
          view_date?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "celeb_views_celebs_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
        ]
      }
      celebs: {
        Row: {
          avatar_url: string | null
          bio: string | null
          bio_en: string | null
          birth_date: string | null
          celeb_tier: string
          claimed_by_member_id: string | null
          consumption_philosophy: string | null
          consumption_philosophy_en: string | null
          content_research_confirmed_empty_at: string | null
          content_research_status: string
          content_research_updated_at: string | null
          created_at: string
          cultural_journey: string | null
          cultural_journey_en: string | null
          death_date: string | null
          gender: boolean | null
          has_voice: boolean
          id: string
          is_verified: boolean | null
          nationality: string | null
          nickname: string
          nickname_en: string | null
          portrait_caption: string | null
          portrait_caption_en: string | null
          portrait_url: string | null
          profession: string | null
          publication_status: string
          slug: string | null
          slug_suffix: string | null
          speech_tone: string | null
          title: string | null
          title_en: string | null
          updated_at: string | null
          view_count: number
          virtual_monologue: string | null
          virtual_monologue_en: string | null
          virtual_monologue_locked_at: string | null
          voice_id_en: string | null
          voice_id_ko: string | null
          voice_speed: number
          voice_v: number
          wikidata_qid: string | null
          youtube_videos: Json | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          bio_en?: string | null
          birth_date?: string | null
          celeb_tier?: string
          claimed_by_member_id?: string | null
          consumption_philosophy?: string | null
          consumption_philosophy_en?: string | null
          content_research_confirmed_empty_at?: string | null
          content_research_status?: string
          content_research_updated_at?: string | null
          created_at?: string
          cultural_journey?: string | null
          cultural_journey_en?: string | null
          death_date?: string | null
          gender?: boolean | null
          has_voice?: boolean
          id: string
          is_verified?: boolean | null
          nationality?: string | null
          nickname: string
          nickname_en?: string | null
          portrait_caption?: string | null
          portrait_caption_en?: string | null
          portrait_url?: string | null
          profession?: string | null
          publication_status?: string
          slug?: string | null
          slug_suffix?: string | null
          speech_tone?: string | null
          title?: string | null
          title_en?: string | null
          updated_at?: string | null
          view_count?: number
          virtual_monologue?: string | null
          virtual_monologue_en?: string | null
          virtual_monologue_locked_at?: string | null
          voice_id_en?: string | null
          voice_id_ko?: string | null
          voice_speed?: number
          voice_v?: number
          wikidata_qid?: string | null
          youtube_videos?: Json | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          bio_en?: string | null
          birth_date?: string | null
          celeb_tier?: string
          claimed_by_member_id?: string | null
          consumption_philosophy?: string | null
          consumption_philosophy_en?: string | null
          content_research_confirmed_empty_at?: string | null
          content_research_status?: string
          content_research_updated_at?: string | null
          created_at?: string
          cultural_journey?: string | null
          cultural_journey_en?: string | null
          death_date?: string | null
          gender?: boolean | null
          has_voice?: boolean
          id?: string
          is_verified?: boolean | null
          nationality?: string | null
          nickname?: string
          nickname_en?: string | null
          portrait_caption?: string | null
          portrait_caption_en?: string | null
          portrait_url?: string | null
          profession?: string | null
          publication_status?: string
          slug?: string | null
          slug_suffix?: string | null
          speech_tone?: string | null
          title?: string | null
          title_en?: string | null
          updated_at?: string | null
          view_count?: number
          virtual_monologue?: string | null
          virtual_monologue_en?: string | null
          virtual_monologue_locked_at?: string | null
          voice_id_en?: string | null
          voice_id_ko?: string | null
          voice_speed?: number
          voice_v?: number
          wikidata_qid?: string | null
          youtube_videos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "celebs_claimed_by_member_id_fkey"
            columns: ["claimed_by_member_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_locales: {
        Row: {
          affiliate_url: Json | null
          content_id: string
          created_at: string | null
          creator: string | null
          description: string | null
          isbn: string | null
          locale: string
          publisher: string | null
          sources: Json | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          affiliate_url?: Json | null
          content_id: string
          created_at?: string | null
          creator?: string | null
          description?: string | null
          isbn?: string | null
          locale: string
          publisher?: string | null
          sources?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          affiliate_url?: Json | null
          content_id?: string
          created_at?: string | null
          creator?: string | null
          description?: string | null
          isbn?: string | null
          locale?: string
          publisher?: string | null
          sources?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "content_locales_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      content_recommendations: {
        Row: {
          created_at: string | null
          id: string
          member_content_id: string
          message: string | null
          receiver_id: string
          responded_at: string | null
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_content_id: string
          message?: string | null
          receiver_id: string
          responded_at?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          member_content_id?: string
          message?: string | null
          receiver_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_recommendations_member_content_id_fkey"
            columns: ["member_content_id"]
            isOneToOne: false
            referencedRelation: "member_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_receiver_accounts_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_sender_accounts_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          celeb_count: number
          created_at: string
          external_id: string | null
          external_source: string | null
          id: string
          member_count: number
          metadata: Json | null
          record_count: number
          release_date: string | null
          subtype: string | null
          type: string
        }
        Insert: {
          celeb_count?: number
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          member_count?: number
          metadata?: Json | null
          record_count?: number
          release_date?: string | null
          subtype?: string | null
          type: string
        }
        Update: {
          celeb_count?: number
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          member_count?: number
          metadata?: Json | null
          record_count?: number
          release_date?: string | null
          subtype?: string | null
          type?: string
        }
        Relationships: []
      }
      curated_list_items: {
        Row: {
          content_id: string | null
          created_at: string
          hidden: boolean
          id: string
          list_id: string
          note: string | null
          note_en: string | null
          rank: number | null
          raw_creator: string | null
          raw_title: string
          sort_order: number
          updated_at: string
          year: number | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          hidden?: boolean
          id?: string
          list_id: string
          note?: string | null
          note_en?: string | null
          rank?: number | null
          raw_creator?: string | null
          raw_title: string
          sort_order?: number
          updated_at?: string
          year?: number | null
        }
        Update: {
          content_id?: string | null
          created_at?: string
          hidden?: boolean
          id?: string
          list_id?: string
          note?: string | null
          note_en?: string | null
          rank?: number | null
          raw_creator?: string | null
          raw_title?: string
          sort_order?: number
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "curated_list_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curated_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "curated_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      curated_lists: {
        Row: {
          content_type: string
          cover_image_url: string | null
          created_at: string
          curator_id: string
          description: string | null
          description_en: string | null
          edition: string | null
          id: string
          is_annual: boolean
          is_featured: boolean
          is_ranked: boolean
          method: string | null
          method_en: string | null
          published_year: number | null
          series_key: string | null
          slug: string
          sort_order: number
          source_url: string
          title: string
          title_en: string | null
          topics: string[]
          updated_at: string
        }
        Insert: {
          content_type?: string
          cover_image_url?: string | null
          created_at?: string
          curator_id: string
          description?: string | null
          description_en?: string | null
          edition?: string | null
          id?: string
          is_annual?: boolean
          is_featured?: boolean
          is_ranked?: boolean
          method?: string | null
          method_en?: string | null
          published_year?: number | null
          series_key?: string | null
          slug: string
          sort_order?: number
          source_url: string
          title: string
          title_en?: string | null
          topics?: string[]
          updated_at?: string
        }
        Update: {
          content_type?: string
          cover_image_url?: string | null
          created_at?: string
          curator_id?: string
          description?: string | null
          description_en?: string | null
          edition?: string | null
          id?: string
          is_annual?: boolean
          is_featured?: boolean
          is_ranked?: boolean
          method?: string | null
          method_en?: string | null
          published_year?: number | null
          series_key?: string | null
          slug?: string
          sort_order?: number
          source_url?: string
          title?: string
          title_en?: string | null
          topics?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "curated_lists_curator_id_fkey"
            columns: ["curator_id"]
            isOneToOne: false
            referencedRelation: "curators"
            referencedColumns: ["id"]
          },
        ]
      }
      curators: {
        Row: {
          country: string | null
          created_at: string
          description: string | null
          description_en: string | null
          founded_year: number | null
          homepage_url: string | null
          id: string
          is_featured: boolean
          kind: string
          logo_url: string | null
          name: string
          name_en: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          founded_year?: number | null
          homepage_url?: string | null
          id?: string
          is_featured?: boolean
          kind: string
          logo_url?: string | null
          name: string
          name_en?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          founded_year?: number | null
          homepage_url?: string | null
          id?: string
          is_featured?: boolean
          kind?: string
          logo_url?: string | null
          name?: string
          name_en?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_figures: {
        Row: {
          celeb_id: string
          created_at: string | null
          date: string
          news_count: number | null
          source: string
        }
        Insert: {
          celeb_id: string
          created_at?: string | null
          date: string
          news_count?: number | null
          source?: string
        }
        Update: {
          celeb_id?: string
          created_at?: string | null
          date?: string
          news_count?: number | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_figures_celebs_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
        ]
      }
      discourse_episodes: {
        Row: {
          created_at: string
          data: Json
          folder: string
          id: string
          logline: string | null
          logline_en: string | null
          longform_layout: Json | null
          notice: string | null
          notice_en: string | null
          registered: boolean
          sort_order: number
          status: string
          title: string
          title_en: string | null
          topic: string | null
          topic_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          folder: string
          id?: string
          logline?: string | null
          logline_en?: string | null
          longform_layout?: Json | null
          notice?: string | null
          notice_en?: string | null
          registered?: boolean
          sort_order?: number
          status?: string
          title: string
          title_en?: string | null
          topic?: string | null
          topic_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          folder?: string
          id?: string
          logline?: string | null
          logline_en?: string | null
          longform_layout?: Json | null
          notice?: string | null
          notice_en?: string | null
          registered?: boolean
          sort_order?: number
          status?: string
          title?: string
          title_en?: string | null
          topic?: string | null
          topic_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      discourse_speakers: {
        Row: {
          celeb_id: string
          color: string | null
          data: Json
          disabled: boolean
          episode_id: string
          epithet: string | null
          epithet_duration: number | null
          epithet_en: string | null
          era: string | null
          id: string
          image: string | null
          lines: string[] | null
          lines_en: string[] | null
          living: boolean
          mythical: boolean
          name: string
          name_en: string | null
          position: number
          slug: string | null
        }
        Insert: {
          celeb_id: string
          color?: string | null
          data?: Json
          disabled?: boolean
          episode_id: string
          epithet?: string | null
          epithet_duration?: number | null
          epithet_en?: string | null
          era?: string | null
          id?: string
          image?: string | null
          lines?: string[] | null
          lines_en?: string[] | null
          living?: boolean
          mythical?: boolean
          name: string
          name_en?: string | null
          position: number
          slug?: string | null
        }
        Update: {
          celeb_id?: string
          color?: string | null
          data?: Json
          disabled?: boolean
          episode_id?: string
          epithet?: string | null
          epithet_duration?: number | null
          epithet_en?: string | null
          era?: string | null
          id?: string
          image?: string | null
          lines?: string[] | null
          lines_en?: string[] | null
          living?: boolean
          mythical?: boolean
          name?: string
          name_en?: string | null
          position?: number
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discourse_speakers_celebs_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discourse_speakers_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "discourse_episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      discourse_turns: {
        Row: {
          chunks: string[] | null
          chunks_en: string[] | null
          data: Json
          disabled: boolean
          duration: number | null
          episode_id: string
          gain_db: number | null
          id: string
          image: string | null
          kind: string
          origin: string | null
          origin_ref: string | null
          part: number | null
          playback_rate: number | null
          position: number
          speaker_id: string
          text: string
          text_en: string | null
          to_speaker_id: string | null
        }
        Insert: {
          chunks?: string[] | null
          chunks_en?: string[] | null
          data?: Json
          disabled?: boolean
          duration?: number | null
          episode_id: string
          gain_db?: number | null
          id?: string
          image?: string | null
          kind: string
          origin?: string | null
          origin_ref?: string | null
          part?: number | null
          playback_rate?: number | null
          position: number
          speaker_id: string
          text: string
          text_en?: string | null
          to_speaker_id?: string | null
        }
        Update: {
          chunks?: string[] | null
          chunks_en?: string[] | null
          data?: Json
          disabled?: boolean
          duration?: number | null
          episode_id?: string
          gain_db?: number | null
          id?: string
          image?: string | null
          kind?: string
          origin?: string | null
          origin_ref?: string | null
          part?: number | null
          playback_rate?: number | null
          position?: number
          speaker_id?: string
          text?: string
          text_en?: string | null
          to_speaker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discourse_turns_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "discourse_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discourse_turns_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "discourse_speakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discourse_turns_to_speaker_id_fkey"
            columns: ["to_speaker_id"]
            isOneToOne: false
            referencedRelation: "discourse_speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      faction_clusters: {
        Row: {
          data: Json
          disabled: boolean
          group_id: string
          id: string
          image: string | null
          label: string | null
          label_en: string | null
          longform_only: boolean
          position: number
        }
        Insert: {
          data?: Json
          disabled?: boolean
          group_id: string
          id?: string
          image?: string | null
          label?: string | null
          label_en?: string | null
          longform_only?: boolean
          position: number
        }
        Update: {
          data?: Json
          disabled?: boolean
          group_id?: string
          id?: string
          image?: string | null
          label?: string | null
          label_en?: string | null
          longform_only?: boolean
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "faction_clusters_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "faction_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      faction_episode_parts: {
        Row: {
          comment: string | null
          episode_id: string
          part: number
        }
        Insert: {
          comment?: string | null
          episode_id: string
          part: number
        }
        Update: {
          comment?: string | null
          episode_id?: string
          part?: number
        }
        Relationships: [
          {
            foreignKeyName: "faction_episode_parts_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "faction_episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      faction_episodes: {
        Row: {
          block_note: string | null
          created_at: string
          data: Json
          folder: string
          id: string
          logline: string | null
          logline_en: string | null
          longform_layout: Json | null
          registered: boolean
          sort_order: number
          status: string
          title: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          block_note?: string | null
          created_at?: string
          data?: Json
          folder: string
          id?: string
          logline?: string | null
          logline_en?: string | null
          longform_layout?: Json | null
          registered?: boolean
          sort_order?: number
          status?: string
          title: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          block_note?: string | null
          created_at?: string
          data?: Json
          folder?: string
          id?: string
          logline?: string | null
          logline_en?: string | null
          longform_layout?: Json | null
          registered?: boolean
          sort_order?: number
          status?: string
          title?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      faction_groups: {
        Row: {
          color: string | null
          data: Json
          disabled: boolean
          episode_id: string
          id: string
          longform_only: boolean
          name: string
          name_en: string | null
          part: number | null
          position: number
          tag_id: string | null
          web_logo_url: string | null
        }
        Insert: {
          color?: string | null
          data?: Json
          disabled?: boolean
          episode_id: string
          id?: string
          longform_only?: boolean
          name: string
          name_en?: string | null
          part?: number | null
          position: number
          tag_id?: string | null
          web_logo_url?: string | null
        }
        Update: {
          color?: string | null
          data?: Json
          disabled?: boolean
          episode_id?: string
          id?: string
          longform_only?: boolean
          name?: string
          name_en?: string | null
          part?: number | null
          position?: number
          tag_id?: string | null
          web_logo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faction_groups_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "faction_episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_groups_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "celeb_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      faction_people: {
        Row: {
          celeb_id: string
          cluster_id: string
          data: Json
          disabled: boolean
          epithet: string | null
          epithet_duration: number | null
          epithet_en: string | null
          id: string
          image: string | null
          lines: string[] | null
          lines_en: string[] | null
          longform_only: boolean
          mined: Json | null
          mythical: boolean
          name: string
          name_en: string | null
          org: string | null
          position: number
          quote: string | null
          quote_chunks: string[] | null
          quote_duration: number | null
          quote_en: string | null
          quote_en_chunks: string[] | null
          quote_origin: string | null
          slug: string | null
          web_hidden: boolean
          web_image_url: string | null
          web_long_desc: string | null
          web_long_desc_en: string | null
          web_quote_media: Json | null
          web_short_desc: string | null
          web_short_desc_en: string | null
        }
        Insert: {
          celeb_id: string
          cluster_id: string
          data?: Json
          disabled?: boolean
          epithet?: string | null
          epithet_duration?: number | null
          epithet_en?: string | null
          id?: string
          image?: string | null
          lines?: string[] | null
          lines_en?: string[] | null
          longform_only?: boolean
          mined?: Json | null
          mythical?: boolean
          name: string
          name_en?: string | null
          org?: string | null
          position: number
          quote?: string | null
          quote_chunks?: string[] | null
          quote_duration?: number | null
          quote_en?: string | null
          quote_en_chunks?: string[] | null
          quote_origin?: string | null
          slug?: string | null
          web_hidden?: boolean
          web_image_url?: string | null
          web_long_desc?: string | null
          web_long_desc_en?: string | null
          web_quote_media?: Json | null
          web_short_desc?: string | null
          web_short_desc_en?: string | null
        }
        Update: {
          celeb_id?: string
          cluster_id?: string
          data?: Json
          disabled?: boolean
          epithet?: string | null
          epithet_duration?: number | null
          epithet_en?: string | null
          id?: string
          image?: string | null
          lines?: string[] | null
          lines_en?: string[] | null
          longform_only?: boolean
          mined?: Json | null
          mythical?: boolean
          name?: string
          name_en?: string | null
          org?: string | null
          position?: number
          quote?: string | null
          quote_chunks?: string[] | null
          quote_duration?: number | null
          quote_en?: string | null
          quote_en_chunks?: string[] | null
          quote_origin?: string | null
          slug?: string | null
          web_hidden?: boolean
          web_image_url?: string | null
          web_long_desc?: string | null
          web_long_desc_en?: string | null
          web_quote_media?: Json | null
          web_short_desc?: string | null
          web_short_desc_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faction_people_celebs_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_people_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "faction_clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          admin_comment: string | null
          author_id: string
          category: Database["public"]["Enums"]["feedback_category"]
          content: string
          created_at: string | null
          id: string
          locale: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["feedback_status"] | null
          title: string
          updated_at: string | null
          view_count: number
        }
        Insert: {
          admin_comment?: string | null
          author_id: string
          category: Database["public"]["Enums"]["feedback_category"]
          content: string
          created_at?: string | null
          id?: string
          locale?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["feedback_status"] | null
          title: string
          updated_at?: string | null
          view_count?: number
        }
        Update: {
          admin_comment?: string | null
          author_id?: string
          category?: Database["public"]["Enums"]["feedback_category"]
          content?: string
          created_at?: string | null
          id?: string
          locale?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["feedback_status"] | null
          title?: string
          updated_at?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_author_accounts_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_resolver_accounts_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fiction_source_characters: {
        Row: {
          celeb_id: string
          content_id: string
          created_at: string
          relation_type: string
          sort_order: number
        }
        Insert: {
          celeb_id: string
          content_id: string
          created_at?: string
          relation_type?: string
          sort_order?: number
        }
        Update: {
          celeb_id?: string
          content_id?: string
          created_at?: string
          relation_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "fiction_characters_celebs_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiction_source_characters_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "fiction_source_contents"
            referencedColumns: ["content_id"]
          },
        ]
      }
      fiction_source_contents: {
        Row: {
          content_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          content_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          content_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiction_source_contents_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_nodes: {
        Row: {
          bonus_content_ids: Json | null
          content_id: string
          description: string | null
          difficulty: number | null
          flow_id: string
          id: string
          is_optional: boolean | null
          sort_order: number | null
          stage_id: string | null
          theme_color: string | null
        }
        Insert: {
          bonus_content_ids?: Json | null
          content_id: string
          description?: string | null
          difficulty?: number | null
          flow_id: string
          id?: string
          is_optional?: boolean | null
          sort_order?: number | null
          stage_id?: string | null
          theme_color?: string | null
        }
        Update: {
          bonus_content_ids?: Json | null
          content_id?: string
          description?: string | null
          difficulty?: number | null
          flow_id?: string
          id?: string
          is_optional?: boolean | null
          sort_order?: number | null
          stage_id?: string | null
          theme_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_nodes_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_nodes_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "flow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_progress: {
        Row: {
          completed_at: string | null
          completed_stages: Json | null
          current_node_index: number | null
          current_stage_id: string | null
          flow_id: string
          id: string
          started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_stages?: Json | null
          current_node_index?: number | null
          current_stage_id?: string | null
          flow_id: string
          id?: string
          started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_stages?: Json | null
          current_node_index?: number | null
          current_stage_id?: string | null
          flow_id?: string
          id?: string
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_progress_accounts_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_progress_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "flow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_progress_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_stages: {
        Row: {
          badge_icon: string | null
          badge_title: string | null
          created_at: string | null
          description: string | null
          flow_id: string
          id: string
          name: string
          sort_order: number
          theme_color: string | null
        }
        Insert: {
          badge_icon?: string | null
          badge_title?: string | null
          created_at?: string | null
          description?: string | null
          flow_id: string
          id?: string
          name: string
          sort_order: number
          theme_color?: string | null
        }
        Update: {
          badge_icon?: string | null
          badge_title?: string | null
          created_at?: string | null
          description?: string | null
          flow_id?: string
          id?: string
          name?: string
          sort_order?: number
          theme_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_stages_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          completion_message: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          difficulty: number | null
          estimated_duration: number | null
          has_tiers: boolean | null
          id: string
          is_public: boolean | null
          name: string
          theme_colors: Json | null
          tiers: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completion_message?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: number | null
          estimated_duration?: number | null
          has_tiers?: boolean | null
          id?: string
          is_public?: boolean | null
          name: string
          theme_colors?: Json | null
          tiers?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completion_message?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: number | null
          estimated_duration?: number | null
          has_tiers?: boolean | null
          id?: string
          is_public?: boolean | null
          name?: string
          theme_colors?: Json | null
          tiers?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flows_accounts_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      free_post_comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          ip_hash: string | null
          is_anonymous: boolean
          is_deleted: boolean
          nickname: string | null
          password_hash: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          is_anonymous?: boolean
          is_deleted?: boolean
          nickname?: string | null
          password_hash?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          is_anonymous?: boolean
          is_deleted?: boolean
          nickname?: string | null
          password_hash?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "free_comments_accounts_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "free_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "free_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      free_posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          ip_hash: string | null
          is_anonymous: boolean
          is_deleted: boolean
          locale: string
          nickname: string | null
          password_hash: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          is_anonymous?: boolean
          is_deleted?: boolean
          locale?: string
          nickname?: string | null
          password_hash?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          is_anonymous?: boolean
          is_deleted?: boolean
          locale?: string
          nickname?: string | null
          password_hash?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "free_posts_accounts_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      member_celeb_follows: {
        Row: {
          celeb_id: string
          created_at: string | null
          id: string
          member_id: string
        }
        Insert: {
          celeb_id: string
          created_at?: string | null
          id?: string
          member_id: string
        }
        Update: {
          celeb_id?: string
          created_at?: string | null
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_celeb_follows_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "celebs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_celeb_follows_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      member_contents: {
        Row: {
          completed_at: string | null
          content_id: string
          contributor_id_snapshot: string | null
          contributor_member_id: string | null
          contributor_name_snapshot: string | null
          created_at: string
          id: string
          is_pinned: boolean | null
          is_recommended: boolean | null
          is_spoiler: boolean | null
          member_id: string
          pinned_at: string | null
          rating: number | null
          review: string | null
          review_en: string | null
          review_presets: string[] | null
          source_url: string | null
          status: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_type"] | null
        }
        Insert: {
          completed_at?: string | null
          content_id: string
          contributor_id_snapshot?: string | null
          contributor_member_id?: string | null
          contributor_name_snapshot?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          is_recommended?: boolean | null
          is_spoiler?: boolean | null
          member_id: string
          pinned_at?: string | null
          rating?: number | null
          review?: string | null
          review_en?: string | null
          review_presets?: string[] | null
          source_url?: string | null
          status: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_type"] | null
        }
        Update: {
          completed_at?: string | null
          content_id?: string
          contributor_id_snapshot?: string | null
          contributor_member_id?: string | null
          contributor_name_snapshot?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          is_recommended?: boolean | null
          is_spoiler?: boolean | null
          member_id?: string
          pinned_at?: string | null
          rating?: number | null
          review?: string | null
          review_en?: string | null
          review_presets?: string[] | null
          source_url?: string | null
          status?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "member_contents_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_contents_contributor_member_id_fkey"
            columns: ["contributor_member_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_contents_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      member_guestbook_entries: {
        Row: {
          author_member_id: string
          content: string
          created_at: string | null
          id: string
          is_private: boolean | null
          is_read: boolean | null
          owner_member_id: string
          updated_at: string | null
        }
        Insert: {
          author_member_id: string
          content: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          is_read?: boolean | null
          owner_member_id: string
          updated_at?: string | null
        }
        Update: {
          author_member_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          is_read?: boolean | null
          owner_member_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_guestbook_entries_author_member_id_fkey"
            columns: ["author_member_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_guestbook_entries_owner_member_id_fkey"
            columns: ["owner_member_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      member_member_follows: {
        Row: {
          created_at: string | null
          followed_member_id: string
          follower_member_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          followed_member_id: string
          follower_member_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          followed_member_id?: string
          follower_member_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_member_follows_followed_member_id_fkey"
            columns: ["followed_member_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_member_follows_follower_member_id_fkey"
            columns: ["follower_member_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      member_notifications: {
        Row: {
          actor_member_id: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          member_id: string
          message: string
          metadata: Json | null
          title: string | null
          type: string
        }
        Insert: {
          actor_member_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          member_id: string
          message: string
          metadata?: Json | null
          title?: string | null
          type: string
        }
        Update: {
          actor_member_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          member_id?: string
          message?: string
          metadata?: Json | null
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_notifications_actor_member_id_fkey"
            columns: ["actor_member_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_notifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      member_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          created_at: string
          id: string
          is_verified: boolean
          nationality: string | null
          nickname: string
          selected_title: string | null
          showcase_titles: string[]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          id: string
          is_verified?: boolean
          nationality?: string | null
          nickname: string
          selected_title?: string | null
          showcase_titles?: string[]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          nationality?: string | null
          nickname?: string
          selected_title?: string | null
          showcase_titles?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      member_score_logs: {
        Row: {
          action: string
          amount: number
          created_at: string | null
          id: string
          member_id: string
          reference_id: string | null
          type: Database["public"]["Enums"]["score_type"]
        }
        Insert: {
          action: string
          amount: number
          created_at?: string | null
          id?: string
          member_id: string
          reference_id?: string | null
          type: Database["public"]["Enums"]["score_type"]
        }
        Update: {
          action?: string
          amount?: number
          created_at?: string | null
          id?: string
          member_id?: string
          reference_id?: string | null
          type?: Database["public"]["Enums"]["score_type"]
        }
        Relationships: [
          {
            foreignKeyName: "member_score_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      member_scores: {
        Row: {
          activity_score: number | null
          member_id: string
          title_bonus: number | null
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          activity_score?: number | null
          member_id: string
          title_bonus?: number | null
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          activity_score?: number | null
          member_id?: string
          title_bonus?: number | null
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_scores_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      member_social_stats: {
        Row: {
          content_count: number | null
          follower_count: number | null
          following_count: number | null
          friend_count: number | null
          influence: number | null
          member_id: string
          updated_at: string | null
        }
        Insert: {
          content_count?: number | null
          follower_count?: number | null
          following_count?: number | null
          friend_count?: number | null
          influence?: number | null
          member_id: string
          updated_at?: string | null
        }
        Update: {
          content_count?: number | null
          follower_count?: number | null
          following_count?: number | null
          friend_count?: number | null
          influence?: number | null
          member_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_social_stats_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_reharvest_backup_20260801: {
        Row: {
          backed_up_at: string | null
          content_id: string | null
          creator: string | null
          external_id: string | null
          external_source: string | null
          isbn: string | null
          locale: string | null
          sources: Json | null
          thumbnail_url: string | null
          title: string | null
          type: string | null
        }
        Insert: {
          backed_up_at?: string | null
          content_id?: string | null
          creator?: string | null
          external_id?: string | null
          external_source?: string | null
          isbn?: string | null
          locale?: string | null
          sources?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          backed_up_at?: string | null
          content_id?: string | null
          creator?: string | null
          external_id?: string | null
          external_source?: string | null
          isbn?: string | null
          locale?: string | null
          sources?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: []
      }
      note_sections: {
        Row: {
          created_at: string | null
          id: string
          is_completed: boolean | null
          memo: string | null
          note_id: string
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          memo?: string | null
          note_id: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          memo?: string | null
          note_id?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_sections_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          memo: string | null
          snapshot: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          memo?: string | null
          snapshot?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          memo?: string | null
          snapshot?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_accounts_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          author_id: string
          content: string
          content_en: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          title: string
          title_en: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id: string
          content: string
          content_en: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          title: string
          title_en: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string
          content?: string
          content_en?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string
          title_en?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notices_author_accounts_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      record_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          record_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          record_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          record_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_comments_accounts_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_comments_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
        ]
      }
      record_likes: {
        Row: {
          created_at: string | null
          id: string
          record_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          record_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          record_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_likes_accounts_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_likes_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
        ]
      }
      records: {
        Row: {
          content: string
          content_id: string
          contributor_id: string | null
          created_at: string
          id: string
          location: string | null
          rating: number | null
          source_url: string | null
          type: string
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["visibility_type"] | null
        }
        Insert: {
          content: string
          content_id: string
          contributor_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          rating?: number | null
          source_url?: string | null
          type: string
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility_type"] | null
        }
        Update: {
          content?: string
          content_id?: string
          contributor_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          rating?: number | null
          source_url?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "records_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_contributor_accounts_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_user_accounts_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          reason: string
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
          target_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
          target_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          target_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_accounts_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolver_accounts_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_accounts_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_flows: {
        Row: {
          flow_id: string
          id: string
          saved_at: string | null
          user_id: string
        }
        Insert: {
          flow_id: string
          id?: string
          saved_at?: string | null
          user_id: string
        }
        Update: {
          flow_id?: string
          id?: string
          saved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_flows_accounts_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_playlists_playlist_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_lists: {
        Row: {
          created_at: string | null
          filter_value: string | null
          id: string
          is_public: boolean | null
          name: string
          tiers: Json
          type: Database["public"]["Enums"]["tier_list_type"]
          unranked: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filter_value?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          tiers?: Json
          type?: Database["public"]["Enums"]["tier_list_type"]
          unranked?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          filter_value?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          tiers?: Json
          type?: Database["public"]["Enums"]["tier_list_type"]
          unranked?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tier_lists_accounts_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_accounts: {
        Row: {
          account_status: string
          created_at: string
          email: string | null
          id: string
          last_seen_at: string | null
          role: string
          suspended_at: string | null
          suspended_reason: string | null
        }
        Insert: {
          account_status?: string
          created_at?: string
          email?: string | null
          id: string
          last_seen_at?: string | null
          role?: string
          suspended_at?: string | null
          suspended_reason?: string | null
        }
        Update: {
          account_status?: string
          created_at?: string
          email?: string | null
          id?: string
          last_seen_at?: string | null
          role?: string
          suspended_at?: string | null
          suspended_reason?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      faction_atlas_members: {
        Row: {
          assignment_id: string | null
          celeb_id: string | null
          faction_image_url: string | null
          faction_quote_media: Json | null
          group_color: string | null
          group_label: string | null
          group_label_en: string | null
          group_logo_url: string | null
          group_position: number | null
          group_subtitle: string | null
          group_subtitle_en: string | null
          hidden: boolean | null
          long_desc: string | null
          long_desc_en: string | null
          person_id: string | null
          quote: string | null
          quote_en: string | null
          short_desc: string | null
          short_desc_en: string | null
          sort_order: number | null
          source: string | null
          tag_id: string | null
        }
        Insert: {
          assignment_id?: string | null
          celeb_id?: string | null
          faction_image_url?: string | null
          faction_quote_media?: Json | null
          group_color?: string | null
          group_label?: string | null
          group_label_en?: string | null
          group_logo_url?: string | null
          group_position?: number | null
          group_subtitle?: string | null
          group_subtitle_en?: string | null
          hidden?: boolean | null
          long_desc?: string | null
          long_desc_en?: string | null
          person_id?: string | null
          quote?: string | null
          quote_en?: string | null
          short_desc?: string | null
          short_desc_en?: string | null
          sort_order?: number | null
          source?: string | null
          tag_id?: string | null
        }
        Update: {
          assignment_id?: string | null
          celeb_id?: string | null
          faction_image_url?: string | null
          faction_quote_media?: Json | null
          group_color?: string | null
          group_label?: string | null
          group_label_en?: string | null
          group_logo_url?: string | null
          group_position?: number | null
          group_subtitle?: string | null
          group_subtitle_en?: string | null
          hidden?: boolean | null
          long_desc?: string | null
          long_desc_en?: string | null
          person_id?: string | null
          quote?: string | null
          quote_en?: string | null
          short_desc?: string | null
          short_desc_en?: string | null
          sort_order?: number | null
          source?: string | null
          tag_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_auth_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      apply_virtual_monologue_candidate: {
        Args: {
          p_candidate_text: string
          p_expected_text: string
          p_slug: string
        }
        Returns: {
          applied: boolean
          current_text: string
        }[]
      }
      assert_celeb_content_research_run_ready: {
        Args: { target_run_id: string }
        Returns: undefined
      }
      cancel_celeb_content_research_run: {
        Args: { target_run_id: string }
        Returns: string
      }
      check_active_account_request: { Args: never; Returns: undefined }
      claim_next_celeb_philosophy_rewrite: {
        Args: { p_lease_minutes?: number; p_worker: string }
        Returns: {
          attempt_count: number
          celeb_id: string
          celeb_tier: string
          claimed_at: string
          consumption_philosophy: string
          consumption_philosophy_en: string
          lease_expires_at: string
          nickname: string
          priority: number
          profession: string
          slug: string
        }[]
      }
      complete_celeb_content_research_run: {
        Args: { target_run_id: string }
        Returns: {
          actual_content_count: number
          celeb_id: string
          final_research_status: string
        }[]
      }
      complete_celeb_philosophy_rewrite: {
        Args: {
          p_celeb_id: string
          p_consumption_philosophy: string
          p_consumption_philosophy_en: string
          p_worker: string
        }
        Returns: boolean
      }
      count_celebs_filtered: {
        Args: {
          p_celeb_tiers?: string[]
          p_content_type?: string
          p_gender?: string
          p_include_inactive?: boolean
          p_min_content_count?: number
          p_nationality?: string
          p_profession?: string
          p_search?: string
          p_tag_id?: string
        }
        Returns: number
      }
      create_recommendation_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_metadata?: Json
          p_recommendation_id: string
          p_title?: string
          p_type: string
        }
        Returns: string
      }
      delete_auth_user: { Args: { target_user_id: string }; Returns: undefined }
      delete_my_account: { Args: never; Returns: undefined }
      discourse_replace_episode: {
        Args: {
          p_episode: Json
          p_expected_updated_at?: string
          p_folder: string
          p_speakers?: Json
          p_turns?: Json
        }
        Returns: Json
      }
      enqueue_missing_celeb_philosophy_rewrite_jobs: {
        Args: never
        Returns: number
      }
      faction_replace_episode: {
        Args: {
          p_clusters?: Json
          p_episode: Json
          p_expected_updated_at?: string
          p_folder: string
          p_groups?: Json
          p_parts?: Json
          p_people?: Json
        }
        Returns: Json
      }
      fail_celeb_philosophy_rewrite: {
        Args: {
          p_celeb_id: string
          p_error: string
          p_reset_to_pending?: boolean
          p_worker: string
        }
        Returns: boolean
      }
      get_bucket_stats: {
        Args: never
        Returns: {
          bucket_name: string
          file_count: number
          total_size: number
        }[]
      }
      get_celeb_content_counts: {
        Args: { p_content_ids: string[] }
        Returns: {
          celeb_count: number
          content_id: string
        }[]
      }
      get_celeb_feed_type_counts: { Args: never; Returns: Json }
      get_celeb_type_counts: {
        Args: { p_celeb_id: string }
        Returns: {
          content_type: string
          total: number
        }[]
      }
      get_celeb_view_stats: {
        Args: { p_celeb_id: string; p_days?: number }
        Returns: {
          recent_views: number
          view_count: number
          window_end: string
          window_start: string
        }[]
      }
      get_celebs_sorted: {
        Args: {
          p_celeb_tiers?: string[]
          p_content_type?: string
          p_gender?: string
          p_include_inactive?: boolean
          p_limit?: number
          p_min_content_count?: number
          p_nationality?: string
          p_offset?: number
          p_profession?: string
          p_search?: string
          p_sort_by?: string
          p_tag_id?: string
        }
        Returns: {
          avatar_url: string
          bio: string
          bio_en: string
          birth_date: string
          celeb_tier: string
          claimed_by_member_id: string
          consumption_philosophy: string
          consumption_philosophy_en: string
          content_count: number
          created_at: string
          death_date: string
          follower_count: number
          gender: boolean
          id: string
          is_verified: boolean
          nationality: string
          nickname: string
          nickname_en: string
          portrait_url: string
          profession: string
          publication_status: string
          slug: string
          title: string
          title_en: string
          total_score: number
        }[]
      }
      get_celebs_trending: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          avatar_url: string
          bio: string
          bio_en: string
          birth_date: string
          celeb_tier: string
          claimed_by_member_id: string
          consumption_philosophy: string
          consumption_philosophy_en: string
          content_count: number
          created_at: string
          death_date: string
          follower_count: number
          gender: boolean
          id: string
          is_verified: boolean
          nationality: string
          nickname: string
          nickname_en: string
          portrait_url: string
          profession: string
          publication_status: string
          recent_views: number
          slug: string
          title: string
          title_en: string
          total_score: number
          view_count: number
          window_end: string
          window_start: string
        }[]
      }
      get_chosen_scriptures: {
        Args: { p_category?: string; p_limit?: number; p_offset?: number }
        Returns: {
          avg_rating: number
          celeb_count: number
          content_id: string
          content_type: string
          creator: string
          creator_en: string
          isbn_en: string
          thumbnail_en: string
          thumbnail_url: string
          title: string
          title_en: string
          title_ko: string
          total_count: number
          user_count: number
        }[]
      }
      get_content_celeb_user_counts: {
        Args: { p_content_ids: string[] }
        Returns: {
          celeb_count: number
          content_id: string
          user_count: number
        }[]
      }
      get_current_account_access_state: { Args: never; Returns: string }
      get_database_size: { Args: never; Returns: number }
      get_persona_extremes: {
        Args: { p_runners_up_limit?: number }
        Returns: Json
      }
      get_profession_content_samples: {
        Args: { per_profession?: number }
        Returns: {
          content_id: string
          content_type: string
          creator: string
          profession: string
          thumbnail_url: string
          title: string
        }[]
      }
      get_review_celeb_ids: {
        Args: never
        Returns: {
          celeb_id: string
        }[]
      }
      get_scriptures_by_era: {
        Args: {
          p_category?: string
          p_era?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          avg_rating: number
          celeb_count: number
          celeb_count_in_era: number
          content_id: string
          content_type: string
          creator: string
          creator_en: string
          era: string
          era_description: string
          era_label: string
          era_period: string
          isbn_en: string
          thumbnail_en: string
          thumbnail_url: string
          title: string
          title_en: string
          title_ko: string
          total_count: number
          user_count: number
        }[]
      }
      get_seed_eligible_celebs: {
        Args: never
        Returns: {
          celeb_id: string
          content_count: number
        }[]
      }
      get_shared_contents_by_celebs: {
        Args: {
          p_celeb_ids: string[]
          p_content_type?: string
          p_limit?: number
        }
        Returns: {
          avg_rating: number
          celeb_count: number
          celeb_nicknames: string[]
          content_id: string
          content_type: string
          creator: string
          thumbnail_url: string
          title: string
        }[]
      }
      get_similar_users: {
        Args: { result_limit?: number; target_user_id: string }
        Returns: {
          avatar_url: string
          content_count: number
          nickname: string
          overlap_count: number
          similarity: number
          user_id: string
        }[]
      }
      get_table_count: { Args: never; Returns: number }
      get_tag_celeb_counts: {
        Args: never
        Returns: {
          celeb_count: number
          tag_color: string
          tag_description: string
          tag_id: string
          tag_name: string
        }[]
      }
      get_top_celebs_across_eras: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          content_count: number
          id: string
          influence: number
          nickname: string
          nickname_en: string
          title: string
          title_en: string
        }[]
      }
      get_total_storage_size: { Args: never; Returns: number }
      get_tracker_candidates: {
        Args: { exclude_ids?: string[] }
        Returns: {
          avatar_url: string
          birth_date: string
          death_date: string
          id: string
          nationality: string
          nickname: string
          nickname_en: string
          profession: string
          slug: string
        }[]
      }
      get_trending_celebs: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          celeb_id: string
          views: number
        }[]
      }
      get_user_content_counts: {
        Args: { p_category?: string }
        Returns: {
          content_id: string
          user_count: number
        }[]
      }
      increment_celeb_view: {
        Args: { p_celeb_id: string; p_increment?: boolean }
        Returns: number
      }
      increment_feedback_view_count: {
        Args: { feedback_id: string }
        Returns: undefined
      }
      increment_notice_view_count: {
        Args: { notice_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_current_account_active: { Args: never; Returns: boolean }
      renew_celeb_philosophy_rewrite_lease: {
        Args: { p_celeb_id: string; p_lease_minutes?: number; p_worker: string }
        Returns: boolean
      }
      set_celeb_quote: {
        Args: { p_celeb_id: string; p_quote_en?: string; p_quote_ko: string }
        Returns: boolean
      }
      set_fiction_narrative_events: {
        Args: { p_celeb_id: string; p_events: Json }
        Returns: number
      }
      set_fiction_source_characters: {
        Args: { p_celeb_ids?: string[]; p_content_id: string }
        Returns: undefined
      }
      update_influence: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      board_type: "NOTICE" | "FEEDBACK"
      feedback_category:
        | "CELEB_REQUEST"
        | "CONTENT_REPORT"
        | "FEATURE_SUGGESTION"
      feedback_status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED"
      score_type: "activity" | "title"
      tier_list_type: "all" | "category" | "genre" | "year" | "custom"
      title_category:
        | "volume"
        | "diversity"
        | "consistency"
        | "depth"
        | "social"
        | "special"
      title_grade: "common" | "uncommon" | "rare" | "epic" | "legendary"
      visibility_type: "public" | "followers" | "private"
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
      board_type: ["NOTICE", "FEEDBACK"],
      feedback_category: [
        "CELEB_REQUEST",
        "CONTENT_REPORT",
        "FEATURE_SUGGESTION",
      ],
      feedback_status: ["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"],
      score_type: ["activity", "title"],
      tier_list_type: ["all", "category", "genre", "year", "custom"],
      title_category: [
        "volume",
        "diversity",
        "consistency",
        "depth",
        "social",
        "special",
      ],
      title_grade: ["common", "uncommon", "rare", "epic", "legendary"],
      visibility_type: ["public", "followers", "private"],
    },
  },
} as const

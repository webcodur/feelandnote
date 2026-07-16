// Supabase 자동 생성 타입
// MCP generate_typescript_types로 생성됨 (2026-06-12)

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
            foreignKeyName: "academy_lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
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
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
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
            foreignKeyName: "blind_game_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blind_game_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
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
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
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
          post_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          board_type: Database["public"]["Enums"]["board_type"]
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          board_type?: Database["public"]["Enums"]["board_type"]
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "board_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
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
            foreignKeyName: "celeb_dialogues_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celeb_dialogues_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: true
            referencedRelation: "profiles_compat"
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
            foreignKeyName: "celeb_influence_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celeb_influence_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: true
            referencedRelation: "profiles_compat"
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
            foreignKeyName: "celeb_persona_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celeb_persona_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: true
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_tag_assignments: {
        Row: {
          assigned_at: string | null
          celeb_id: string
          id: string
          long_desc: string | null
          long_desc_en: string | null
          short_desc: string | null
          short_desc_en: string | null
          sort_order: number | null
          spotlight_image_url: string | null
          tag_id: string
        }
        Insert: {
          assigned_at?: string | null
          celeb_id: string
          id?: string
          long_desc?: string | null
          long_desc_en?: string | null
          short_desc?: string | null
          short_desc_en?: string | null
          sort_order?: number | null
          spotlight_image_url?: string | null
          tag_id: string
        }
        Update: {
          assigned_at?: string | null
          celeb_id?: string
          id?: string
          long_desc?: string | null
          long_desc_en?: string | null
          short_desc?: string | null
          short_desc_en?: string | null
          sort_order?: number | null
          spotlight_image_url?: string | null
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "celeb_tag_assignments_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celeb_tag_assignments_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celeb_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "celeb_tags"
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
          name: string
          name_en: string | null
          slug: string | null
          sort_order: number | null
          start_date: string | null
          team_images: Json
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          description_en?: string | null
          end_date?: string | null
          id?: string
          is_featured?: boolean | null
          name: string
          name_en?: string | null
          slug?: string | null
          sort_order?: number | null
          start_date?: string | null
          team_images?: Json
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          description_en?: string | null
          end_date?: string | null
          id?: string
          is_featured?: boolean | null
          name?: string
          name_en?: string | null
          slug?: string | null
          sort_order?: number | null
          start_date?: string | null
          team_images?: Json
          updated_at?: string | null
        }
        Relationships: []
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
            foreignKeyName: "celeb_task_queue_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "celeb_task_queue_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
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
          message: string | null
          receiver_id: string
          responded_at: string | null
          sender_id: string
          status: string
          user_content_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          receiver_id: string
          responded_at?: string | null
          sender_id: string
          status?: string
          user_content_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          receiver_id?: string
          responded_at?: string | null
          sender_id?: string
          status?: string
          user_content_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_recommendations_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_recommendations_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_recommendations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_recommendations_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_recommendations_user_content_id_fkey"
            columns: ["user_content_id"]
            isOneToOne: false
            referencedRelation: "user_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          created_at: string
          external_id: string | null
          external_source: string | null
          id: string
          metadata: Json | null
          release_date: string | null
          subtype: string | null
          type: string
          user_count: number | null
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          metadata?: Json | null
          release_date?: string | null
          subtype?: string | null
          type: string
          user_count?: number | null
        }
        Update: {
          created_at?: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          metadata?: Json | null
          release_date?: string | null
          subtype?: string | null
          type?: string
          user_count?: number | null
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
            foreignKeyName: "daily_figures_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_figures_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
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
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["feedback_status"] | null
          title?: string
          updated_at?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedbacks_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
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
          {
            foreignKeyName: "flow_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
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
            foreignKeyName: "playlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
        ]
      }
      guestbook_entries: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_private: boolean | null
          is_read: boolean | null
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          is_read?: boolean | null
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          is_read?: boolean | null
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guestbook_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestbook_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestbook_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestbook_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "notes_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notices_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          metadata: Json | null
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          metadata?: Json | null
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          bio_en: string | null
          birth_date: string | null
          celeb_tier: string | null
          claimed_by: string | null
          consumption_philosophy: string | null
          consumption_philosophy_en: string | null
          created_at: string
          cultural_journey: string | null
          cultural_journey_en: string | null
          death_date: string | null
          email: string | null
          gender: boolean | null
          has_voice: boolean
          id: string
          is_verified: boolean | null
          last_seen_at: string | null
          nationality: string | null
          nickname: string | null
          nickname_en: string | null
          portrait_url: string | null
          profession: string | null
          profile_type: string | null
          role: string | null
          selected_title: string | null
          showcase_titles: string[] | null
          slug: string | null
          slug_suffix: string | null
          speech_tone: string | null
          status: string | null
          suspended_at: string | null
          suspended_reason: string | null
          title: string | null
          title_en: string | null
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
          celeb_tier?: string | null
          claimed_by?: string | null
          consumption_philosophy?: string | null
          consumption_philosophy_en?: string | null
          created_at?: string
          cultural_journey?: string | null
          cultural_journey_en?: string | null
          death_date?: string | null
          email?: string | null
          gender?: boolean | null
          has_voice?: boolean
          id: string
          is_verified?: boolean | null
          last_seen_at?: string | null
          nationality?: string | null
          nickname?: string | null
          nickname_en?: string | null
          portrait_url?: string | null
          profession?: string | null
          profile_type?: string | null
          role?: string | null
          selected_title?: string | null
          showcase_titles?: string[] | null
          slug?: string | null
          slug_suffix?: string | null
          speech_tone?: string | null
          status?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          title?: string | null
          title_en?: string | null
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
          celeb_tier?: string | null
          claimed_by?: string | null
          consumption_philosophy?: string | null
          consumption_philosophy_en?: string | null
          created_at?: string
          cultural_journey?: string | null
          cultural_journey_en?: string | null
          death_date?: string | null
          email?: string | null
          gender?: boolean | null
          has_voice?: boolean
          id?: string
          is_verified?: boolean | null
          last_seen_at?: string | null
          nationality?: string | null
          nickname?: string | null
          nickname_en?: string | null
          portrait_url?: string | null
          profession?: string | null
          profile_type?: string | null
          role?: string | null
          selected_title?: string | null
          showcase_titles?: string[] | null
          slug?: string | null
          slug_suffix?: string | null
          speech_tone?: string | null
          status?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          title?: string | null
          title_en?: string | null
          voice_id_en?: string | null
          voice_id_ko?: string | null
          voice_speed?: number
          voice_v?: number
          wikidata_qid?: string | null
          youtube_videos?: Json | null
        }
        Relationships: []
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
            foreignKeyName: "record_comments_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
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
            foreignKeyName: "record_likes_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
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
            foreignKeyName: "records_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
        ]
      }
      remotion_images: {
        Row: {
          created_at: string
          desc_en: string | null
          desc_ko: string
          height: number
          id: string
          prompt: string | null
          r2_key: string
          r2_url: string
          source: string
          tags: string[]
          type: string
          width: number
        }
        Insert: {
          created_at?: string
          desc_en?: string | null
          desc_ko: string
          height: number
          id: string
          prompt?: string | null
          r2_key: string
          r2_url: string
          source: string
          tags?: string[]
          type: string
          width: number
        }
        Update: {
          created_at?: string
          desc_en?: string | null
          desc_ko?: string
          height?: number
          id?: string
          prompt?: string | null
          r2_key?: string
          r2_url?: string
          source?: string
          tags?: string[]
          type?: string
          width?: number
        }
        Relationships: []
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
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
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
            foreignKeyName: "saved_playlists_playlist_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      score_logs: {
        Row: {
          action: string
          amount: number
          created_at: string | null
          id: string
          reference_id: string | null
          type: Database["public"]["Enums"]["score_type"]
          user_id: string
        }
        Insert: {
          action: string
          amount: number
          created_at?: string | null
          id?: string
          reference_id?: string | null
          type: Database["public"]["Enums"]["score_type"]
          user_id: string
        }
        Update: {
          action?: string
          amount?: number
          created_at?: string | null
          id?: string
          reference_id?: string | null
          type?: Database["public"]["Enums"]["score_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
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
            foreignKeyName: "tier_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
        ]
      }
      user_contents: {
        Row: {
          completed_at: string | null
          content_id: string
          contributor_id: string | null
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
          user_id: string
          visibility: Database["public"]["Enums"]["visibility_type"] | null
        }
        Insert: {
          completed_at?: string | null
          content_id: string
          contributor_id?: string | null
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
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility_type"] | null
        }
        Update: {
          completed_at?: string | null
          content_id?: string
          contributor_id?: string | null
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
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "user_contents_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_contents_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_contents_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_contents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_contents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
        ]
      }
      user_scores: {
        Row: {
          activity_score: number | null
          title_bonus: number | null
          total_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_score?: number | null
          title_bonus?: number | null
          total_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_score?: number | null
          title_bonus?: number | null
          total_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
        ]
      }
      user_social: {
        Row: {
          content_count: number | null
          follower_count: number | null
          following_count: number | null
          friend_count: number | null
          influence: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_count?: number | null
          follower_count?: number | null
          following_count?: number | null
          friend_count?: number | null
          influence?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_count?: number | null
          follower_count?: number | null
          following_count?: number | null
          friend_count?: number | null
          influence?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_social_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_social_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_compat"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_compat: {
        Row: {
          avatar_url: string | null
          bio: string | null
          bio_en: string | null
          birth_date: string | null
          celeb_tier: string | null
          claimed_by: string | null
          consumption_philosophy: string | null
          consumption_philosophy_en: string | null
          created_at: string | null
          cultural_journey: string | null
          death_date: string | null
          email: string | null
          gender: boolean | null
          has_voice: boolean | null
          id: string | null
          is_verified: boolean | null
          last_seen_at: string | null
          nationality: string | null
          nickname: string | null
          nickname_en: string | null
          portrait_url: string | null
          profession: string | null
          profile_type: string | null
          role: string | null
          selected_title: string | null
          showcase_titles: string[] | null
          slug: string | null
          slug_suffix: string | null
          speech_tone: string | null
          status: string | null
          suspended_at: string | null
          suspended_reason: string | null
          title: string | null
          title_en: string | null
          voice_id_en: string | null
          voice_id_ko: string | null
          voice_v: number | null
          wikidata_qid: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          bio_en?: string | null
          birth_date?: string | null
          celeb_tier?: string | null
          claimed_by?: string | null
          consumption_philosophy?: string | null
          consumption_philosophy_en?: string | null
          created_at?: string | null
          cultural_journey?: string | null
          death_date?: string | null
          email?: string | null
          gender?: boolean | null
          has_voice?: boolean | null
          id?: string | null
          is_verified?: boolean | null
          last_seen_at?: string | null
          nationality?: string | null
          nickname?: string | null
          nickname_en?: string | null
          portrait_url?: string | null
          profession?: string | null
          profile_type?: string | null
          role?: string | null
          selected_title?: string | null
          showcase_titles?: string[] | null
          slug?: string | null
          slug_suffix?: string | null
          speech_tone?: string | null
          status?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          title?: string | null
          title_en?: string | null
          voice_id_en?: string | null
          voice_id_ko?: string | null
          voice_v?: number | null
          wikidata_qid?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          bio_en?: string | null
          birth_date?: string | null
          celeb_tier?: string | null
          claimed_by?: string | null
          consumption_philosophy?: string | null
          consumption_philosophy_en?: string | null
          created_at?: string | null
          cultural_journey?: string | null
          death_date?: string | null
          email?: string | null
          gender?: boolean | null
          has_voice?: boolean | null
          id?: string | null
          is_verified?: boolean | null
          last_seen_at?: string | null
          nationality?: string | null
          nickname?: string | null
          nickname_en?: string | null
          portrait_url?: string | null
          profession?: string | null
          profile_type?: string | null
          role?: string | null
          selected_title?: string | null
          showcase_titles?: string[] | null
          slug?: string | null
          slug_suffix?: string | null
          speech_tone?: string | null
          status?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          title?: string | null
          title_en?: string | null
          voice_id_en?: string | null
          voice_id_ko?: string | null
          voice_v?: number | null
          wikidata_qid?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
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
      count_contents_by_users: {
        Args: { user_ids: string[] }
        Returns: {
          count: number
          user_id: string
        }[]
      }
      delete_auth_user: { Args: { target_user_id: string }; Returns: undefined }
      enqueue_missing_celeb_philosophy_rewrite_jobs: {
        Args: never
        Returns: number
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
        Args: { p_user_id: string }
        Returns: {
          content_type: string
          total: number
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
          claimed_by: string
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
          slug: string
          status: string
          title: string
          title_en: string
          total_score: number
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
      get_database_size: { Args: never; Returns: number }
      get_friend_activity_type_counts: {
        Args: { p_user_id: string }
        Returns: Json
      }
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
          content_id: string
          content_type: string
          creator: string
          creator_en: string
          era: string
          era_celeb_count: number
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
      get_user_content_counts: {
        Args: { p_category?: string }
        Returns: {
          content_id: string
          user_count: number
        }[]
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
      renew_celeb_philosophy_rewrite_lease: {
        Args: { p_celeb_id: string; p_lease_minutes?: number; p_worker: string }
        Returns: boolean
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

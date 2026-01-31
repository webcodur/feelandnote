// Supabase 자동 생성 타입
// MCP generate_typescript_types로 생성됨

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
        ]
      }
      ai_reviews: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          model: string
          review: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          model: string
          review: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          model?: string
          review?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_reviews_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          content: string
          created_at: string | null
          id: string
          title: string
          type: Database["public"]["Enums"]["board_type"]
          updated_at: string | null
          user_id: string
          views: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          title: string
          type: Database["public"]["Enums"]["board_type"]
          updated_at?: string | null
          user_id: string
          views?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["board_type"]
          updated_at?: string | null
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "boards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_influence: {
        Row: {
          art: number
          auto: string | null
          biz: number
          celeb_id: string
          culture: number
          edu: number
          id: string
          life: number
          social: number
          sports: number
          tech: number
        }
        Insert: {
          art?: number
          auto?: string | null
          biz?: number
          celeb_id: string
          culture?: number
          edu?: number
          id?: string
          life?: number
          social?: number
          sports?: number
          tech?: number
        }
        Update: {
          art?: number
          auto?: string | null
          biz?: number
          celeb_id?: string
          culture?: number
          edu?: number
          id?: string
          life?: number
          social?: number
          sports?: number
          tech?: number
        }
        Relationships: [
          {
            foreignKeyName: "celeb_influence_celeb_id_fkey"
            columns: ["celeb_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      celeb_requests: {
        Row: {
          created_at: string | null
          id: string
          name: string
          reason: string | null
          requested_by: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          reason?: string | null
          requested_by: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          reason?: string | null
          requested_by?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "celeb_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          created_at: string
          creator: string | null
          description: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          publisher: string | null
          release_date: string | null
          thumbnail_url: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          creator?: string | null
          description?: string | null
          external_id?: string | null
          id: string
          metadata?: Json | null
          publisher?: string | null
          release_date?: string | null
          thumbnail_url?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          creator?: string | null
          description?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          publisher?: string | null
          release_date?: string | null
          thumbnail_url?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          category: Database["public"]["Enums"]["feedback_category"]
          content: string
          created_at: string | null
          id: string
          status: Database["public"]["Enums"]["feedback_status"]
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["feedback_category"]
          content: string
          created_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["feedback_status"]
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["feedback_category"]
          content?: string
          created_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["feedback_status"]
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          content_type: string
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
          user_id: string
        }
        Insert: {
          content_type: string
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          user_id?: string
        }
        Relationships: []
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
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      guestbooks: {
        Row: {
          content: string
          created_at: string | null
          host_id: string
          id: string
          writer_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          host_id: string
          id?: string
          writer_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          host_id?: string
          id?: string
          writer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guestbooks_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestbooks_writer_id_fkey"
            columns: ["writer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          snapshot: Json | null
          template: Json | null
          updated_at: string | null
          user_id: string
          visibility: Database["public"]["Enums"]["visibility_type"] | null
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          snapshot?: Json | null
          template?: Json | null
          updated_at?: string | null
          user_id: string
          visibility?: Database["public"]["Enums"]["visibility_type"] | null
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          snapshot?: Json | null
          template?: Json | null
          updated_at?: string | null
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility_type"] | null
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
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_items: {
        Row: {
          added_at: string | null
          content_id: string
          id: string
          playlist_id: string
          sort_order: number | null
        }
        Insert: {
          added_at?: string | null
          content_id: string
          id?: string
          playlist_id: string
          sort_order?: number | null
        }
        Update: {
          added_at?: string | null
          content_id?: string
          id?: string
          playlist_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          content_type: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          has_tiers: boolean | null
          id: string
          is_public: boolean | null
          name: string
          tiers: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_type?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          has_tiers?: boolean | null
          id?: string
          is_public?: boolean | null
          name: string
          tiers?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_type?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          has_tiers?: boolean | null
          id?: string
          is_public?: boolean | null
          name?: string
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
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category: string | null
          claimed_by: string | null
          created_at: string
          email: string | null
          gemini_api_key: string | null
          id: string
          is_verified: boolean | null
          last_seen_at: string | null
          nickname: string | null
          profession: string | null
          profile_type: string | null
          role: string | null
          status: string | null
          suspended_at: string | null
          suspended_reason: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          claimed_by?: string | null
          created_at?: string
          email?: string | null
          gemini_api_key?: string | null
          id: string
          is_verified?: boolean | null
          last_seen_at?: string | null
          nickname?: string | null
          profession?: string | null
          profile_type?: string | null
          role?: string | null
          status?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          claimed_by?: string | null
          created_at?: string
          email?: string | null
          gemini_api_key?: string | null
          id?: string
          is_verified?: boolean | null
          last_seen_at?: string | null
          nickname?: string | null
          profession?: string | null
          profile_type?: string | null
          role?: string | null
          status?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
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
            foreignKeyName: "records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        ]
      }
      titles: {
        Row: {
          bonus_score: number
          category: Database["public"]["Enums"]["title_category"]
          condition: Json
          description: string
          grade: Database["public"]["Enums"]["title_grade"]
          id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          bonus_score?: number
          category: Database["public"]["Enums"]["title_category"]
          condition: Json
          description: string
          grade: Database["public"]["Enums"]["title_grade"]
          id?: string
          name: string
          sort_order?: number | null
        }
        Update: {
          bonus_score?: number
          category?: Database["public"]["Enums"]["title_category"]
          condition?: Json
          description?: string
          grade?: Database["public"]["Enums"]["title_grade"]
          id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      user_contents: {
        Row: {
          content_id: string
          contributor_id: string | null
          created_at: string
          folder_id: string | null
          id: string
          progress: number | null
          progress_type: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_id: string
          contributor_id?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          progress?: number | null
          progress_type?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_id?: string
          contributor_id?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          progress?: number | null
          progress_type?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
            foreignKeyName: "user_contents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_contents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        ]
      }
      user_social: {
        Row: {
          follower_count: number | null
          following_count: number | null
          friend_count: number | null
          influence: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          follower_count?: number | null
          following_count?: number | null
          friend_count?: number | null
          influence?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_aura_for_all: {
        Args: Record<string, never>
        Returns: undefined
      }
      calculate_level_for_all: {
        Args: Record<string, never>
        Returns: undefined
      }
      calculate_total_scores: {
        Args: Record<string, never>
        Returns: undefined
      }
      check_user_titles: {
        Args: {
          p_user_id: string
        }
        Returns: undefined
      }
      get_celeb_feed_type_counts: {
        Args: Record<string, never>
        Returns: Json
      }
      get_friend_activity_type_counts: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      board_type: ["NOTICE", "FEEDBACK"]
      feedback_category: [
        "CELEB_REQUEST",
        "CONTENT_REPORT",
        "FEATURE_SUGGESTION",
      ]
      feedback_status: ["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"]
      score_type: ["activity", "title"]
      tier_list_type: ["all", "category", "genre", "year", "custom"]
      title_category: [
        "volume",
        "diversity",
        "consistency",
        "depth",
        "social",
        "special",
      ]
      title_grade: ["common", "uncommon", "rare", "epic", "legendary"]
      visibility_type: ["public", "followers", "private"]
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}


export type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
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

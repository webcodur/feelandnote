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
  public: {
    Tables: {
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
      contents: {
        Row: {
          created_at: string
          creator: string | null
          description: string | null
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
      user_titles: {
        Row: {
          id: string
          title_id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          title_id: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          title_id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_titles_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_titles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
      is_admin: { Args: never; Returns: boolean }
      update_influence: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
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

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nickname: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nickname?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nickname?: string | null
        }
        Relationships: []
      }
      records: {
        Row: {
          content: string
          content_id: string
          created_at: string
          id: string
          location: string | null
          rating: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          content_id: string
          created_at?: string
          id?: string
          location?: string | null
          rating?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          content_id?: string
          created_at?: string
          id?: string
          location?: string | null
          rating?: number | null
          type?: string
          updated_at?: string
          user_id?: string
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
            foreignKeyName: "records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_contents: {
        Row: {
          content_id: string
          created_at: string
          id: string
          progress: number | null
          progress_type: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          progress?: number | null
          progress_type?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
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
            foreignKeyName: "user_contents_user_id_fkey"
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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

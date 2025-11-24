import { supabase } from '../supabase';

export type RecordType = 'REVIEW' | 'NOTE' | 'QUOTE';

export interface Record {
  id: string;
  user_id: string;
  content_id: string;
  type: RecordType;
  content: string;
  rating?: number;
  location?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  contents?: {
    title: string;
    thumbnail_url: string;
    creator: string;
  };
}

export interface CreateRecordParams {
  userId: string;
  contentId: string;
  type: RecordType;
  content: string;
  rating?: number;
  location?: string;
}

export const recordsApi = {
  // Create a new record
  async createRecord(params: CreateRecordParams) {
    const { data, error } = await supabase
      .from('records')
      .insert({
        user_id: params.userId,
        content_id: params.contentId,
        type: params.type,
        content: params.content,
        rating: params.rating,
        location: params.location,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get all records for a user (Timeline)
  async getUserRecords(userId: string) {
    const { data, error } = await supabase
      .from('records')
      .select(`
        *,
        contents (
          title,
          thumbnail_url,
          creator
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Record[];
  },

  // Get records for specific content
  async getContentRecords(userId: string, contentId: string) {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('user_id', userId)
      .eq('content_id', contentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Record[];
  }
};

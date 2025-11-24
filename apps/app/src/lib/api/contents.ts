import { supabase } from '../supabase';
import type { Content, ContentType } from '../../types/content';

export interface UserContent extends Content {
  status: 'WISH' | 'EXPERIENCE';
  progress: number;
  lastUpdated: string;
}

export const contentApi = {
  // Fetch user's archive (Wish + Experience)
  async getUserArchive(userId: string): Promise<UserContent[]> {
    const { data, error } = await supabase
      .from('user_contents')
      .select(`
        status,
        progress,
        updated_at,
        contents (
          id,
          type,
          title,
          creator,
          thumbnail_url,
          metadata,
          description
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return data.map((item: any) => ({
      id: item.contents.id,
      type: item.contents.type as ContentType,
      title: item.contents.title,
      creator: item.contents.creator,
      thumbnail_url: item.contents.thumbnail_url,
      metadata: item.contents.metadata,
      description: item.contents.description,
      publisher: item.contents.publisher || '', // Add missing field
      release_date: item.contents.release_date || '', // Add missing field
      status: item.status,
      progress: item.progress,
      lastUpdated: new Date(item.updated_at).toLocaleDateString(),
    }));
  },

  // Add content to archive (Wish or Experience)
  async addToArchive(userId: string, content: Content, status: 'WISH' | 'EXPERIENCE') {
    // 1. Ensure content exists in 'contents' table
    const { error: contentError } = await supabase
      .from('contents')
      .upsert({
        id: content.id,
        type: content.type,
        title: content.title,
        creator: content.creator,
        thumbnail_url: content.thumbnail_url,
        description: content.description,
        publisher: content.publisher,
        release_date: content.release_date,
        metadata: content.metadata,
        created_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (contentError) throw contentError;

    // 2. Add to 'user_contents'
    const { error: userContentError } = await supabase
      .from('user_contents')
      .upsert({
        user_id: userId,
        content_id: content.id,
        status: status,
        progress: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,content_id' });

    if (userContentError) throw userContentError;
  }
};

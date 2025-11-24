import { supabase } from '../supabase';
import type {
  Record as RecordType,
  CreateRecordDto,
  UpdateRecordDto,
  RecordPart,
  RecordSubtype,
  Point,
} from '@feelnnote/api-types';
import { setPointsForRecord } from './points';

/**
 * Enhanced Records API
 * Support for 2-part structure (Part 1: in-progress notes, Part 2: completed reviews)
 * Maintains backward compatibility with legacy type system
 */

interface GetRecordsOptions {
  contentId?: string;
  userId?: string;
  part?: RecordPart;
  subtype?: RecordSubtype;
  isPublic?: boolean;
  limit?: number;
  offset?: number;
}

// Get records with filtering
export async function getRecords(options: GetRecordsOptions = {}): Promise<RecordType[]> {
  let query = supabase
    .from('records')
    .select(`
      *,
      contents (
        title,
        thumbnail_url,
        creator
      )
    `);

  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }

  if (options.contentId) {
    query = query.eq('content_id', options.contentId);
  }

  if (options.part) {
    query = query.eq('part', options.part);
  }

  if (options.subtype) {
    query = query.eq('subtype', options.subtype);
  }

  if (options.isPublic !== undefined) {
    query = query.eq('is_public', options.isPublic);
  }

  query = query.order('created_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Fetch associated points for each record
  if (data && data.length > 0) {
    const recordIds = data.map((r: any) => r.id);
    const { data: recordPoints } = await supabase
      .from('record_points')
      .select('record_id, point_id, points(*)')
      .in('record_id', recordIds);

    // Group points by record_id
    const pointsByRecord = recordPoints?.reduce((acc: { [key: string]: Point[] }, rp: any) => {
      if (!acc[rp.record_id]) acc[rp.record_id] = [];
      if (rp.points) acc[rp.record_id].push(rp.points);
      return acc;
    }, {});

    // Attach points to records
    data.forEach((record: any) => {
      record.points = pointsByRecord?.[record.id] || [];
    });
  }

  return data || [];
}

// Get single record by ID
export async function getRecordById(recordId: string): Promise<RecordType | null> {
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
    .eq('id', recordId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  // Fetch associated points
  const { data: recordPoints } = await supabase
    .from('record_points')
    .select('point_id, points(*)')
    .eq('record_id', recordId);

  data.points = recordPoints?.map((rp: any) => rp.points).filter(Boolean) || [];

  return data;
}

// Create a new record
export async function createRecord(dto: CreateRecordDto): Promise<RecordType> {
  const { point_ids, ...recordData } = dto;

  // Set default is_public based on part
  if (recordData.is_public === undefined) {
    recordData.is_public = dto.part === 'PART2'; // Part 2 public by default
  }

  const { data, error } = await supabase
    .from('records')
    .insert([recordData])
    .select()
    .single();

  if (error) throw error;

  // Associate points if provided
  if (point_ids && point_ids.length > 0) {
    await setPointsForRecord(data.id, point_ids);
  }

  return data;
}

// Update a record
export async function updateRecord(recordId: string, dto: UpdateRecordDto): Promise<RecordType> {
  const { point_ids, ...recordData } = dto;

  const { data, error } = await supabase
    .from('records')
    .update(recordData)
    .eq('id', recordId)
    .select()
    .single();

  if (error) throw error;

  // Update point associations if provided
  if (point_ids !== undefined) {
    await setPointsForRecord(recordId, point_ids);
  }

  return data;
}

// Delete a record
export async function deleteRecord(recordId: string): Promise<void> {
  const { error } = await supabase
    .from('records')
    .delete()
    .eq('id', recordId);

  if (error) throw error;
}

// Toggle visibility of a record
export async function toggleRecordVisibility(recordId: string): Promise<RecordType> {
  const record = await getRecordById(recordId);
  if (!record) throw new Error('Record not found');

  return updateRecord(recordId, { is_public: !record.is_public });
}

// Get Part 1 records (in-progress notes) for a content
export async function getPart1Records(contentId: string, userId: string): Promise<RecordType[]> {
  return getRecords({ contentId, userId, part: 'PART1' });
}

// Get Part 2 records (completed reviews) for a content
export async function getPart2Records(contentId: string, userId: string): Promise<RecordType[]> {
  return getRecords({ contentId, userId, part: 'PART2' });
}

// Get public records for a content (for sharing/discovery features)
export async function getPublicRecords(contentId?: string): Promise<RecordType[]> {
  return getRecords({ contentId, isPublic: true });
}

// ============================================================================
// Legacy API (for backward compatibility)
// ============================================================================

export type LegacyRecordType = 'REVIEW' | 'NOTE' | 'QUOTE';

export interface LegacyRecord {
  id: string;
  user_id: string;
  content_id: string;
  type: LegacyRecordType;
  content: string;
  rating?: number;
  location?: string;
  created_at: string;
  updated_at: string;
  contents?: {
    title: string;
    thumbnail_url: string;
    creator: string;
  };
}

export interface CreateRecordParams {
  userId: string;
  contentId: string;
  type: LegacyRecordType;
  content: string;
  rating?: number;
  location?: string;
}

export const recordsApi = {
  // Create a new record (legacy method)
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
        // Map legacy types to new structure
        part: 'PART2',
        subtype: params.type === 'REVIEW' ? 'EXPERIENCE_SNAPSHOT' : 
                 params.type === 'QUOTE' ? 'KEY_CAPTURE' : 'PROGRESS_NOTE',
        is_public: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get all records for a user (Timeline)
  async getUserRecords(userId: string) {
    return getRecords({ userId }) as Promise<LegacyRecord[]>;
  },

  // Get records for specific content
  async getContentRecords(userId: string, contentId: string) {
    return getRecords({ userId, contentId }) as Promise<LegacyRecord[]>;
  },
};


import { supabase } from '../supabase';
import type { Point, CreatePointDto, UpdatePointDto } from '@feelnnote/api-types';

/**
 * POINT System API
 * Manage reference points within content (e.g., "첫키스", "반전", "3장")
 */

// Get all points for a specific content
export async function getPointsByContent(contentId: string): Promise<Point[]> {
  const { data, error } = await supabase
    .from('points')
    .select('*')
    .eq('content_id', contentId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// Get single point by ID
export async function getPointById(pointId: string): Promise<Point | null> {
  const { data, error } = await supabase
    .from('points')
    .select('*')
    .eq('id', pointId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

// Create a new point
export async function createPoint(dto: CreatePointDto): Promise<Point> {
  const { data, error } = await supabase
    .from('points')
    .insert([dto])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update a point
export async function updatePoint(pointId: string, dto: UpdatePointDto): Promise<Point> {
  const { data, error } = await supabase
    .from('points')
    .update(dto)
    .eq('id', pointId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a point
export async function deletePoint(pointId: string): Promise<void> {
  const { error } = await supabase
    .from('points')
    .delete()
    .eq('id', pointId);

  if (error) throw error;
}

// Get all records that reference a specific point
export async function getRecordsByPoint(pointId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('record_points')
    .select('record_id, records(*)')
    .eq('point_id', pointId);

  if (error) throw error;
  return data?.map((rp: any) => rp.records).filter(Boolean) || [];
}


// Get all points referenced by a specific record
export async function getPointsByRecord(recordId: string): Promise<Point[]> {
  const { data, error } = await supabase
    .from('record_points')
    .select('point_id, points(*)')
    .eq('record_id', recordId);

  if (error) throw error;
  return data?.map((rp: any) => rp.points).filter((p): p is Point => p !== null) || [];
}

// Associate a point with a record
export async function addPointToRecord(recordId: string, pointId: string): Promise<void> {
  const { error } = await supabase
    .from('record_points')
    .insert([{ record_id: recordId, point_id: pointId }]);

  if (error) throw error;
}

// Remove a point from a record
export async function removePointFromRecord(recordId: string, pointId: string): Promise<void> {
  const { error } = await supabase
    .from('record_points')
    .delete()
    .eq('record_id', recordId)
    .eq('point_id', pointId);

  if (error) throw error;
}

// Set all points for a record (replaces existing associations)
export async function setPointsForRecord(recordId: string, pointIds: string[]): Promise<void> {
  // Delete existing associations
  await supabase
    .from('record_points')
    .delete()
    .eq('record_id', recordId);

  // Insert new associations
  if (pointIds.length > 0) {
    const associations = pointIds.map(pointId => ({
      record_id: recordId,
      point_id: pointId,
    }));

    const { error } = await supabase
      .from('record_points')
      .insert(associations);

    if (error) throw error;
  }
}

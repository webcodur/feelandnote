import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';

export function createRecordsRouter(supabase: SupabaseClient) {
  const router = Router();

  // 기록 목록 조회 (페이지네이션, 필터링)
  router.get('/', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as string; // 'REVIEW', 'NOTE', 'QUOTE' (legacy)
      const part = req.query.part as string; // 'PART1', 'PART2'
      const subtype = req.query.subtype as string; // New subtypes
      const isPublic = req.query.is_public as string; // 'true', 'false'
      const search = req.query.search as string;

      const offset = (page - 1) * limit;

      let query = supabase
        .from('records')
        .select('*, profiles(email, nickname), contents(title, type)', { count: 'exact' });

      // 타입 필터 (legacy)
      if (type) {
        query = query.eq('type', type);
      }

      // Part 필터 (PART1/PART2)
      if (part) {
        query = query.eq('part', part);
      }

      // Subtype 필터
      if (subtype) {
        query = query.eq('subtype', subtype);
      }

      // 공개/비공개 필터
      if (isPublic !== undefined) {
        query = query.eq('is_public', isPublic === 'true');
      }

      // 검색 (내용 또는 위치)
      if (search) {
        query = query.or(`content.ilike.%${search}%,location.ilike.%${search}%`);
      }

      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) throw error;

      // Fetch associated points for each record
      if (data && data.length > 0) {
        const recordIds = data.map((r: any) => r.id);
        const { data: recordPoints } = await supabase
          .from('record_points')
          .select('record_id, point_id, points(*)')
          .in('record_id', recordIds);

        // Group points by record_id
        const pointsByRecord = recordPoints?.reduce((acc: any, rp: any) => {
          if (!acc[rp.record_id]) acc[rp.record_id] = [];
          acc[rp.record_id].push(rp.points);
          return acc;
        }, {});

        // Attach points to records
        data.forEach((record: any) => {
          record.points = pointsByRecord?.[record.id] || [];
        });
      }

      res.json({
        data,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    } catch (error: any) {
      console.error('Error fetching records:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 기록 상세 조회
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('records')
        .select('*, profiles(email, nickname), contents(*)')
        .eq('id', id)
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error: any) {
      console.error('Error fetching record:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 기록 삭제 (신고된 콘텐츠 등)
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase.from('records').delete().eq('id', id);

      if (error) throw error;

      res.json({ message: 'Record deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 특정 사용자의 모든 기록 삭제
  router.delete('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      const { error } = await supabase.from('records').delete().eq('user_id', userId);

      if (error) throw error;

      res.json({ message: 'All user records deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting user records:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 특정 콘텐츠의 모든 기록 조회
  router.get('/content/:contentId', async (req, res) => {
    try {
      const { contentId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const { data, count, error } = await supabase
        .from('records')
        .select('*, profiles(email, nickname)', { count: 'exact' })
        .eq('content_id', contentId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      res.json({
        data,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    } catch (error: any) {
      console.error('Error fetching content records:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

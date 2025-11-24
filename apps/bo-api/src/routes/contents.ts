import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';

export function createContentsRouter(supabase: SupabaseClient) {
  const router = Router();

  // 콘텐츠 목록 조회 (페이지네이션, 필터링)
  router.get('/', async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as string; // 'BOOK' or 'MOVIE'
      const search = req.query.search as string;

      const offset = (page - 1) * limit;

      let query = supabase.from('contents').select('*', { count: 'exact' });

      // 타입 필터
      if (type) {
        query = query.eq('type', type);
      }

      // 검색 (제목 또는 작가)
      if (search) {
        query = query.or(`title.ilike.%${search}%,creator.ilike.%${search}%`);
      }

      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

      const { data, count, error } = await query;

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
      console.error('Error fetching contents:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 콘텐츠 상세 조회
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const { data: content, error } = await supabase
        .from('contents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // 이 콘텐츠를 보관함에 담은 사용자 수
      const { count: userCount, error: userCountError } = await supabase
        .from('user_contents')
        .select('*', { count: 'exact', head: true })
        .eq('content_id', id);

      if (userCountError) throw userCountError;

      // 이 콘텐츠에 대한 기록 수
      const { count: recordCount, error: recordCountError } = await supabase
        .from('records')
        .select('*', { count: 'exact', head: true })
        .eq('content_id', id);

      if (recordCountError) throw recordCountError;

      res.json({
        ...content,
        stats: {
          userCount: userCount || 0,
          recordCount: recordCount || 0,
        },
      });
    } catch (error: any) {
      console.error('Error fetching content:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 콘텐츠 수정
  router.patch('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // ID와 created_at은 수정 불가
      delete updates.id;
      delete updates.created_at;

      const { data, error } = await supabase
        .from('contents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error: any) {
      console.error('Error updating content:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 콘텐츠 삭제
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // 관련된 user_contents와 records도 cascade로 삭제됨
      const { error } = await supabase.from('contents').delete().eq('id', id);

      if (error) throw error;

      res.json({ message: 'Content deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting content:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 콘텐츠 통계
  router.get('/:id/stats', async (req, res) => {
    try {
      const { id } = req.params;

      // 사용자별 진행률 분포
      const { data: userContents, error: ucError } = await supabase
        .from('user_contents')
        .select('progress, progress_type, status, profiles(email, nickname)')
        .eq('content_id', id);

      if (ucError) throw ucError;

      // 기록 타입별 분포
      const { data: records, error: recordsError } = await supabase
        .from('records')
        .select('type, rating, profiles(email, nickname)')
        .eq('content_id', id);

      if (recordsError) throw recordsError;

      const recordsByType = records?.reduce((acc, record) => {
        acc[record.type] = (acc[record.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // 평균 평점 계산
      const ratingsWithValue = records?.filter(r => r.rating !== null).map(r => r.rating);
      const avgRating = ratingsWithValue?.length
        ? ratingsWithValue.reduce((sum, r) => sum + (r || 0), 0) / ratingsWithValue.length
        : null;

      res.json({
        userContents,
        recordsByType,
        avgRating,
        totalRecords: records?.length || 0,
      });
    } catch (error: any) {
      console.error('Error fetching content stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';

export function createDashboardRouter(supabase: SupabaseClient) {
  const router = Router();

  // 전체 통계 조회
  router.get('/stats', async (req, res) => {
    try {
      // 전체 사용자 수
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) throw usersError;

      // 전체 콘텐츠 수
      const { count: contentsCount, error: contentsError } = await supabase
        .from('contents')
        .select('*', { count: 'exact', head: true });
      if (contentsError) throw contentsError;

      // 전체 사용자 콘텐츠 수 (보관함)
      const { count: userContentsCount, error: userContentsError } = await supabase
        .from('user_contents')
        .select('*', { count: 'exact', head: true });
      if (userContentsError) throw userContentsError;

      // 전체 기록 수 (리뷰, 메모, 인용)
      const { count: recordsCount, error: recordsError } = await supabase
        .from('records')
        .select('*', { count: 'exact', head: true });
      if (recordsError) throw recordsError;

      // 기록 타입별 분포
      const { data: recordsByType, error: recordsByTypeError } = await supabase
        .from('records')
        .select('type');
      if (recordsByTypeError) throw recordsByTypeError;

      const recordsDistribution = recordsByType?.reduce((acc, record) => {
        acc[record.type] = (acc[record.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // 상태별 사용자 콘텐츠 분포
      const { data: userContentsByStatus, error: statusError } = await supabase
        .from('user_contents')
        .select('status');
      if (statusError) throw statusError;

      const statusDistribution = userContentsByStatus?.reduce((acc, uc) => {
        acc[uc.status] = (acc[uc.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        totalUsers: users?.length || 0,
        totalContents: contentsCount || 0,
        totalUserContents: userContentsCount || 0,
        totalRecords: recordsCount || 0,
        recordsDistribution: recordsDistribution || {},
        statusDistribution: statusDistribution || {},
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 최근 활동 조회
  router.get('/recent-activity', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;

      // 최근 가입 사용자
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) throw usersError;

      const recentUsers = users
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      // 최근 추가된 콘텐츠
      const { data: recentContents, error: contentsError } = await supabase
        .from('contents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (contentsError) throw contentsError;

      // 최근 작성된 기록
      const { data: recentRecords, error: recordsError } = await supabase
        .from('records')
        .select('*, profiles(email, nickname)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (recordsError) throw recordsError;

      res.json({
        recentUsers,
        recentContents,
        recentRecords,
      });
    } catch (error: any) {
      console.error('Error fetching recent activity:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 인기 콘텐츠 TOP 10
  router.get('/popular-contents', async (req, res) => {
    try {
      const { data: popularContents, error } = await supabase.rpc('get_popular_contents', {
        limit_count: 10
      });

      if (error) {
        // RPC 함수가 없으면 수동으로 계산
        const { data: userContents, error: ucError } = await supabase
          .from('user_contents')
          .select('content_id, contents(*)');

        if (ucError) throw ucError;

        // 콘텐츠별로 그룹핑하고 카운트
        const contentCounts = userContents?.reduce((acc, uc) => {
          const contentId = uc.content_id;
          if (!acc[contentId]) {
            acc[contentId] = { count: 0, content: uc.contents };
          }
          acc[contentId].count++;
          return acc;
        }, {} as Record<string, any>);

        const sorted = Object.values(contentCounts || {})
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 10);

        return res.json(sorted);
      }

      res.json(popularContents);
    } catch (error: any) {
      console.error('Error fetching popular contents:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

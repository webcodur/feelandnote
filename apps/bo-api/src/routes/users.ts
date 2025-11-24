import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';

export function createUsersRouter(supabase: SupabaseClient) {
  const router = Router();

  // 사용자 목록 조회
  router.get('/', async (req, res) => {
    try {
      const { data: { users }, error } = await supabase.auth.admin.listUsers();

      if (error) throw error;

      // 각 사용자의 프로필 정보와 통계 추가
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          const { count: contentsCount } = await supabase
            .from('user_contents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          const { count: recordsCount } = await supabase
            .from('records')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          return {
            ...user,
            profile,
            stats: {
              contentsCount: contentsCount || 0,
              recordsCount: recordsCount || 0,
            },
          };
        })
      );

      res.json(usersWithStats);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 사용자 상세 조회
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const { data: { user }, error } = await supabase.auth.admin.getUserById(id);

      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      // 사용자의 보관함
      const { data: userContents, error: ucError } = await supabase
        .from('user_contents')
        .select('*, contents(*)')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (ucError) throw ucError;

      // 사용자의 기록
      const { data: records, error: recordsError } = await supabase
        .from('records')
        .select('*, contents(*)')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (recordsError) throw recordsError;

      // 상태별 통계
      const statusStats = userContents?.reduce((acc, uc) => {
        acc[uc.status] = (acc[uc.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // 기록 타입별 통계
      const recordTypeStats = records?.reduce((acc, record) => {
        acc[record.type] = (acc[record.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        user,
        profile,
        userContents,
        records,
        stats: {
          statusStats,
          recordTypeStats,
          totalContents: userContents?.length || 0,
          totalRecords: records?.length || 0,
        },
      });
    } catch (error: any) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 사용자 비활성화 (정지)
  router.patch('/:id/ban', async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase.auth.admin.updateUserById(id, {
        ban_duration: '876000h', // ~100 years
      });

      if (error) throw error;

      res.json({ message: 'User banned successfully', user: data.user });
    } catch (error: any) {
      console.error('Error banning user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 사용자 활성화 (정지 해제)
  router.patch('/:id/unban', async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase.auth.admin.updateUserById(id, {
        ban_duration: 'none',
      });

      if (error) throw error;

      res.json({ message: 'User unbanned successfully', user: data.user });
    } catch (error: any) {
      console.error('Error unbanning user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 사용자 삭제
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Supabase auth user 삭제 (cascade로 profile, user_contents, records 삭제)
      const { error } = await supabase.auth.admin.deleteUser(id);

      if (error) throw error;

      res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

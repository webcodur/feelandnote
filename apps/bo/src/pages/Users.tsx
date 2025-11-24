import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { usersApi } from '../lib/api';
import { formatDate } from '../lib/utils';
import { Eye, Ban, UserCheck, Trash2 } from 'lucide-react';

export function Users() {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getList().then((res) => res.data),
  });

  const banMutation = useMutation({
    mutationFn: (id: string) => usersApi.ban(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('사용자가 정지되었습니다.');
    },
  });

  const unbanMutation = useMutation({
    mutationFn: (id: string) => usersApi.unban(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('사용자 정지가 해제되었습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('사용자가 삭제되었습니다.');
    },
  });

  const handleBan = (id: string, email: string) => {
    if (confirm(`${email} 사용자를 정지하시겠습니까?`)) {
      banMutation.mutate(id);
    }
  };

  const handleUnban = (id: string, email: string) => {
    if (confirm(`${email} 사용자의 정지를 해제하시겠습니까?`)) {
      unbanMutation.mutate(id);
    }
  };

  const handleDelete = (id: string, email: string) => {
    if (
      confirm(
        `${email} 사용자를 삭제하시겠습니까?\n모든 사용자 데이터가 영구 삭제됩니다.`
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
        <p className="mt-2 text-gray-600">전체 사용자를 조회하고 관리합니다</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">전체 사용자</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{users?.length || 0}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                이메일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                닉네임
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                콘텐츠
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                기록
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                가입일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                최근 로그인
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users?.map((user: any) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{user.email}</div>
                  <div className="text-xs text-gray-500 font-mono">{user.id}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.profile?.nickname || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                  {user.stats?.contentsCount || 0}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                  {user.stats?.recordsCount || 0}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDate(user.created_at)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : '-'}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Link
                    to={`/users/${user.id}`}
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-900"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  {user.banned_until ? (
                    <button
                      onClick={() => handleUnban(user.id, user.email)}
                      disabled={unbanMutation.isPending}
                      className="inline-flex items-center text-green-600 hover:text-green-900 disabled:opacity-50"
                      title="정지 해제"
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBan(user.id, user.email)}
                      disabled={banMutation.isPending}
                      className="inline-flex items-center text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                      title="사용자 정지"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(user.id, user.email)}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center text-red-600 hover:text-red-900 disabled:opacity-50"
                    title="사용자 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

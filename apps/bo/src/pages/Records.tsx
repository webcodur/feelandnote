import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recordsApi } from '../lib/api';
import { formatDateTime } from '../lib/utils';
import { Trash2, Search } from 'lucide-react';

export function Records() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [partFilter, setPartFilter] = useState('');
  const [subtypeFilter, setSubtypeFilter] = useState('');
  const [isPublicFilter, setIsPublicFilter] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['records', page, search, typeFilter, partFilter, subtypeFilter, isPublicFilter],
    queryFn: () =>
      recordsApi
        .getList({ 
          page, 
          limit: 20, 
          search: search || undefined, 
          type: typeFilter || undefined,
          part: partFilter || undefined,
          subtype: subtypeFilter || undefined,
          is_public: isPublicFilter || undefined,
        })
        .then((res) => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => recordsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      alert('기록이 삭제되었습니다.');
    },
    onError: (error: any) => {
      alert(`삭제 실패: ${error.response?.data?.error || error.message}`);
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('이 기록을 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">기록 관리</h1>
        <p className="mt-2 text-gray-600">사용자가 작성한 기록을 조회하고 관리합니다</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="내용으로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Part Filter */}
          <select
            value={partFilter}
            onChange={(e) => setPartFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">모든 Part</option>
            <option value="PART1">Part 1 (진행중)</option>
            <option value="PART2">Part 2 (완료)</option>
          </select>

          {/* Subtype Filter */}
          <select
            value={subtypeFilter}
            onChange={(e) => setSubtypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">모든 Subtype</option>
            <optgroup label="Part 1">
              <option value="MOMENT_NOTE">순간 포착</option>
              <option value="PROGRESS_NOTE">진행 노트</option>
              <option value="PERSONAL_REACTION">개인 반응</option>
            </optgroup>
            <optgroup label="Part 2">
              <option value="EXPERIENCE_SNAPSHOT">경험 스냅샷</option>
              <option value="KEY_CAPTURE">핵심 포착</option>
              <option value="CREATIVE_PLAYGROUND">재창작 Playground</option>
            </optgroup>
          </select>

          {/* Visibility Filter */}
          <select
            value={isPublicFilter}
            onChange={(e) => setIsPublicFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">모든 공개여부</option>
            <option value="true">공개</option>
            <option value="false">비공개</option>
          </select>

          {/* Legacy Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">레거시 타입</option>
            <option value="REVIEW">리뷰</option>
            <option value="NOTE">메모</option>
            <option value="QUOTE">인용</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Part/Subtype
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    사용자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    콘텐츠
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    내용 미리보기
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    공개
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    작성일
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data?.data?.map((record: any) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded inline-block ${
                            record.part === 'PART1'
                              ? 'bg-yellow-100 text-yellow-800'
                              : record.part === 'PART2'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {record.part || 'N/A'}
                        </span>
                        {record.subtype && (
                          <span className="text-xs text-gray-600">
                            {record.subtype.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {record.profiles?.nickname || record.profiles?.email || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {record.contents?.title || '-'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {record.contents?.type || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 max-w-md truncate">
                        {record.content}
                      </div>
                      {record.metadata && Object.keys(record.metadata).length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Metadata: {Object.keys(record.metadata).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {record.points && record.points.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {record.points.slice(0, 3).map((point: any) => (
                            <span key={point.id} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">
                              {point.label}
                            </span>
                          ))}
                          {record.points.length > 3 && (
                            <span className="text-xs text-gray-400">+{record.points.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      {record.is_public ? (
                        <span className="text-green-600">✓ 공개</span>
                      ) : (
                        <span className="text-gray-400">비공개</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDateTime(record.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(record.id)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {data?.pagination && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  전체 {data.pagination.total}개 중 {((page - 1) * 20) + 1}-
                  {Math.min(page * 20, data.pagination.total)}개
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= data.pagination.totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

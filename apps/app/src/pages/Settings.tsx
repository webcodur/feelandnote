import React from 'react';
import { useAuthStore } from '../store/useAuthStore';

export const Settings: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">계정 정보</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-500">이메일</label>
            <p className="text-gray-900">{user?.email || '-'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">닉네임</label>
            <p className="text-gray-900">{user?.name || '-'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">데이터 관리</h2>
        <div className="space-y-3">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            데이터 내보내기
          </button>
          <p className="text-sm text-gray-500">전체 데이터를 JSON 또는 CSV 형식으로 내보낼 수 있습니다</p>
        </div>
      </div>
    </div>
  );
};

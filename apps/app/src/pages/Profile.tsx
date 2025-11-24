import React, { useState } from 'react';
import { Camera, Edit2, Mail, Calendar, Settings, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Profile: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);

  // TODO: 실제 사용자 데이터로 대체
  const user = {
    nickname: '독서광',
    email: 'user@example.com',
    bio: '책과 영화를 사랑하는 사람입니다. 매일 조금씩 기록하며 성장하고 있습니다.',
    profileImage: null,
    joinDate: '2024-01-15',
  };

  const handleImageUpload = () => {
    // TODO: 이미지 업로드 로직
    console.log('이미지 업로드');
  };

  const handleSave = () => {
    // TODO: 프로필 저장 로직
    console.log('프로필 저장');
    setIsEditing(false);
  };

  const handleLogout = () => {
    // TODO: 로그아웃 로직
    console.log('로그아웃');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">프로필</h1>
        <p className="text-gray-600">나의 정보를 관리하고 수정할 수 있습니다</p>
      </div>

      {/* 프로필 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* 배경 이미지 */}
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-500"></div>

        <div className="px-8 pb-8">
          {/* 프로필 이미지 */}
          <div className="relative -mt-16 mb-6">
            <div className="relative inline-block">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center overflow-hidden">
                {user.profileImage ? (
                  <img src={user.profileImage} alt="프로필" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-gray-500">{user.nickname[0]}</span>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={handleImageUpload}
                  className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 편집 버튼 */}
          <div className="flex justify-between items-start mb-6">
            <div></div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span>프로필 수정</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  저장
                </button>
              </div>
            )}
          </div>

          {/* 프로필 정보 */}
          <div className="space-y-6">
            {/* 닉네임 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">닉네임</label>
              {isEditing ? (
                <input
                  type="text"
                  defaultValue={user.nickname}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="닉네임을 입력하세요"
                />
              ) : (
                <p className="text-lg font-semibold text-gray-900">{user.nickname}</p>
              )}
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
            </div>

            {/* 자기소개 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">자기소개</label>
              {isEditing ? (
                <textarea
                  defaultValue={user.bio}
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="자기소개를 입력하세요 (최대 200자)"
                />
              ) : (
                <p className="text-gray-700">{user.bio}</p>
              )}
            </div>

            {/* 가입일 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">가입일</label>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date(user.joinDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 설정 메뉴 */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 divide-y divide-gray-200">
        <Link
          to="/settings"
          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-900">계정 설정</span>
          </div>
          <span className="text-gray-400">›</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-red-500" />
            <span className="font-medium text-red-600">로그아웃</span>
          </div>
        </button>
      </div>

      {/* 통계 카드 (추후 구현) */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">0</p>
          <p className="text-sm text-gray-600 mt-1">경험한 콘텐츠</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">0</p>
          <p className="text-sm text-gray-600 mt-1">작성한 기록</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-pink-600">0</p>
          <p className="text-sm text-gray-600 mt-1">저장한 인용구</p>
        </div>
      </div>
    </div>
  );
};

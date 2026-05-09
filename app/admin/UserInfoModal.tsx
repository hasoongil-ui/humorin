'use client';

import { useState } from 'react';

export default function UserInfoModal({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 💡 표에 표시되는 아이디 (클릭 시 팝업 열림) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="font-black text-[#3b4890] text-[12px] hover:underline flex items-center gap-1.5 cursor-pointer text-left"
        title="클릭하여 상세 정보 보기"
      >
        {user.userid}
        {user.is_admin && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 text-[9px] rounded-sm font-black tracking-tighter">ADMIN</span>}
      </button>

      {/* 💡 팝업창(모달) 디자인 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-md shadow-2xl w-[380px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            
            {/* 팝업 헤더 */}
            <div className="bg-[#2a3042] px-5 py-3.5 flex justify-between items-center">
              <h3 className="text-white font-bold text-sm flex items-center gap-2"><span>🔍</span> 회원 상세 정보 스캐너</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
            </div>
            
            {/* 팝업 내용 */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-500">아이디</span>
                <span className="text-sm font-black text-gray-800">{user.userid}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-500">닉네임</span>
                <span className="text-sm font-bold text-[#3b4890]">{user.nickname || '-'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-500">이메일 (연락처)</span>
                <span className="text-xs font-black text-indigo-600">{user.email || '비공개 또는 미입력'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-500">가입일 / 최근로그인</span>
                <span className="text-xs font-medium text-gray-600">{user.created_at} <span className="text-gray-300">|</span> {user.last_login}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-500">작성글 수 / 포인트</span>
                <span className="text-xs font-bold text-gray-800">게시글 <span className="text-rose-500">{user.post_count || 0}</span>개 / <span className="text-blue-600">{user.points || 0}</span> P</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-xs font-bold text-gray-500">현재 계정 상태</span>
                <span>
                  {user.status === 'active' && <span className="text-xs font-black text-emerald-600">정상 활동중</span>}
                  {user.status === 'banned' && <span className="text-xs font-black text-rose-600">🚨 영구 정지됨</span>}
                  {user.status === 'shadow_banned' && <span className="text-xs font-black text-gray-500">👻 그림자 밴 (본인만 모름)</span>}
                </span>
              </div>
            </div>

            {/* 닫기 버튼 */}
            <div className="bg-gray-50 p-4 border-t border-gray-200">
              <button onClick={() => setIsOpen(false)} className="w-full py-2.5 bg-[#414a66] text-white text-xs font-bold rounded-sm hover:bg-[#2a3042] transition-colors shadow-sm">
                스캐너 닫기
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
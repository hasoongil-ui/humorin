'use client';

import { useState } from 'react';

export default function UserInfoModal({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="font-black text-[#3b4890] text-[14px] hover:underline flex items-center gap-1.5 cursor-pointer text-left"
        title="클릭하여 상세 정보 보기"
      >
        {user.userid}
        {user.is_admin && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 text-[11px] rounded-sm font-black tracking-tighter">ADMIN</span>}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-md shadow-2xl w-[420px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            
            <div className="bg-[#2a3042] px-5 py-4 flex justify-between items-center">
              <h3 className="text-white font-bold text-base flex items-center gap-2"><span>🔍</span> 회원 정밀 스캐너</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-bold text-gray-500">아이디</span>
                <span className="text-base font-black text-gray-800">{user.userid}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-bold text-gray-500">닉네임</span>
                <span className="text-base font-bold text-[#3b4890]">{user.nickname || '-'}</span>
              </div>
              
              {/* 💡 [무서운 기능 1] IP 글로벌 위치 추적기 */}
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-sm font-bold text-gray-500">접속 IP 추적</span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-red-500">{user.ip || '알수없음'}</span>
                  {user.ip && user.ip !== '알수없음' && user.ip !== '::1' && (
                    <a 
                      href={`https://ipinfo.io/${user.ip}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded-sm text-[11px] font-black hover:bg-red-100 transition-colors shadow-sm"
                    >
                      📍 위치 스캔
                    </a>
                  )}
                </div>
              </div>

              {/* 💡 [무서운 기능 2] 최근 작성글 제목 추출 */}
              <div className="flex flex-col border-b border-gray-100 pb-2 gap-1.5">
                <span className="text-sm font-bold text-gray-500">최근 작성한 글</span>
                <span className="text-sm font-bold text-gray-800 truncate bg-gray-50 p-2 rounded-sm border border-gray-200">
                  {user.latest_post_title ? `📝 ${user.latest_post_title}` : '최근 작성한 글이 없습니다.'}
                </span>
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-sm font-bold text-gray-500">작성글 수 / 포인트</span>
                <span className="text-sm font-bold text-gray-800">게시글 <span className="text-rose-500">{user.post_count || 0}</span>개 / <span className="text-blue-600">{user.points || 0}</span> P</span>
              </div>
              
              <div className="flex justify-between pt-1 items-center">
                <span className="text-sm font-bold text-gray-500">현재 계정 상태</span>
                <span>
                  {user.status === 'active' && <span className="text-sm font-black text-emerald-600">정상 활동중</span>}
                  {user.status === 'banned' && <span className="text-sm font-black text-rose-600">🚨 영구 정지됨</span>}
                  {user.status === 'shadow_banned' && <span className="text-sm font-black text-gray-500">👻 그림자 밴 (본인만 모름)</span>}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-200">
              <button onClick={() => setIsOpen(false)} className="w-full py-3 bg-[#414a66] text-white text-sm font-bold rounded-sm hover:bg-[#2a3042] transition-colors shadow-sm">
                스캐너 닫기
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
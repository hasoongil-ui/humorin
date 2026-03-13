'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PostLikeButton({ postId, initialLikes, initialHasLiked, toggleAction, isAdmin }: any) {
  // 💡 기기 지문 검사 로직
  const handleLikeSubmit = (e: React.FormEvent) => {
    if (isAdmin) return; // 관리자는 무한 패스!
    
    const deviceKey = `ojemi_liked_post_${postId}`;
    if (!initialHasLiked) {
      // 새롭게 공감을 누르려는 경우
      if (localStorage.getItem(deviceKey) === 'true') {
        e.preventDefault();
        alert('이 기기에서는 이미 공감을 누른 기록이 있습니다.\n(다중 계정 조작 방지)');
        return;
      }
      localStorage.setItem(deviceKey, 'true'); // 도장 쾅!
    } else {
      // 공감을 취소하는 경우 도장 지워줌
      localStorage.removeItem(deviceKey);
    }
  };

  return (
    <form action={toggleAction} onSubmit={handleLikeSubmit}>
      <button type="submit" className={`px-6 py-2 border rounded-full font-bold text-sm transition-colors flex items-center gap-2 ${initialHasLiked ? 'bg-rose-50 text-rose-500 border-rose-200' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
        {initialHasLiked ? '❤️ 공감 취소' : '🤍 공감'} <span className="text-gray-300">|</span> {initialLikes}
      </button>
    </form>
  );
}

export function PostScrapButton({ postId, initialHasScrapped, toggleScrapAction }: any) {
  return (
    <form action={toggleScrapAction}>
      <button type="submit" className={`px-6 py-2 border rounded-full font-bold text-sm transition-colors flex items-center gap-2 ${initialHasScrapped ? 'bg-blue-50 text-blue-500 border-blue-200' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
        {initialHasScrapped ? '⭐ 스크랩 취소' : '⭐ 스크랩'}
      </button>
    </form>
  );
}

export function CommentLikeButton({ commentId, initialLikes, initialHasLiked, toggleAction, isAdmin }: any) {
  const handleLikeSubmit = (e: React.FormEvent) => {
    if (isAdmin) return;
    const deviceKey = `ojemi_liked_comment_${commentId}`;
    if (!initialHasLiked) {
      if (localStorage.getItem(deviceKey) === 'true') {
        e.preventDefault();
        alert('이 기기에서는 이미 공감을 누른 기록이 있습니다.');
        return;
      }
      localStorage.setItem(deviceKey, 'true');
    } else {
      localStorage.removeItem(deviceKey);
    }
  };

  return (
    <form action={toggleAction} onSubmit={handleLikeSubmit}>
      <input type="hidden" name="commentId" value={commentId} />
      <button type="submit" className={`text-[13px] font-bold transition-colors ${initialHasLiked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-500'}`}>
        공감 {initialLikes > 0 && initialLikes}
      </button>
    </form>
  );
}

export function PostReportButton({ postId, currentUserId, isAdmin }: { postId: number, currentUserId: string | null, isAdmin: boolean }) {
  const router = useRouter();
  const [isReporting, setIsReporting] = useState(false);
  
  const handleReport = async () => {
    if (!currentUserId) { alert('로그인이 필요합니다.'); router.push('/login'); return; }
    
    // 💡 신고 기기 지문 검사
    const deviceKey = `ojemi_reported_post_${postId}`;
    if (!isAdmin && localStorage.getItem(deviceKey) === 'true') {
      alert('이 기기에서는 이미 이 글을 신고하셨습니다.');
      return;
    }

    if (!confirm(isAdmin ? '👑 [관리자 모드] 이 게시글에 신고 10회를 누적시키겠습니까?' : '이 게시글을 신고하시겠습니까?')) return;
    
    setIsReporting(true);
    try {
      const res = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId, userId: currentUserId, isAdmin }) });
      const data = await res.json();
      if (res.ok) { 
        if (!isAdmin) localStorage.setItem(deviceKey, 'true'); // 신고 완료 도장 쾅!
        alert(data.message); 
        router.refresh(); 
      } else alert('❌ ' + data.error);
    } catch (e) { alert('오류 발생'); } finally { setIsReporting(false); }
  };
  return (
    <button onClick={handleReport} disabled={isReporting} className="px-6 py-2 bg-gray-100 text-gray-500 font-bold text-sm rounded-full hover:bg-red-50 hover:text-red-500 transition-colors border border-gray-200 shadow-sm flex items-center gap-2">
      🚨 신고
    </button>
  );
}

export function CommentReportButton({ commentId, currentUserId, isAdmin }: { commentId: number, currentUserId: string | null, isAdmin: boolean }) {
  const router = useRouter();
  const [isReporting, setIsReporting] = useState(false);

  const handleReport = async () => {
    if (!currentUserId) { alert('로그인이 필요합니다.'); router.push('/login'); return; }
    
    // 💡 댓글 신고 기기 지문 검사
    const deviceKey = `ojemi_reported_comment_${commentId}`;
    if (!isAdmin && localStorage.getItem(deviceKey) === 'true') {
      alert('이 기기에서는 이미 이 댓글을 신고하셨습니다.');
      return;
    }

    if (!confirm(isAdmin ? '👑 [관리자 모드] 이 댓글에 신고 10회를 누적시키겠습니까?' : '이 댓글을 신고하시겠습니까?\n(누적 시 자동으로 블라인드 처리됩니다)')) return;
    
    setIsReporting(true);
    try {
      const res = await fetch('/api/comment-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commentId, userId: currentUserId, isAdmin }) });
      const data = await res.json();
      if (res.ok) { 
        if (!isAdmin) localStorage.setItem(deviceKey, 'true'); 
        alert(data.message); 
        router.refresh(); 
      } else alert('❌ ' + data.error);
    } catch (e) { alert('오류 발생'); } finally { setIsReporting(false); }
  };
  
  return (
    <button onClick={handleReport} disabled={isReporting} className="text-[12px] font-bold text-gray-400 hover:text-red-500 transition-colors ml-2">
      🚨 신고
    </button>
  );
}
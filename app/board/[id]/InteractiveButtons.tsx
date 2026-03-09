'use client';

import { useState, useTransition } from 'react';

// ------------------------------------------------------------------
// 1. 기존 명품 엔진: 게시글 공감 버튼
// ------------------------------------------------------------------
export function PostLikeButton({ postId, initialLikes, initialHasLiked, toggleAction }: any) {
  const [likes, setLikes] = useState(initialLikes);
  const [hasLiked, setHasLiked] = useState(initialHasLiked);
  const [isPending, startTransition] = useTransition();

  const handleLike = () => {
    // 선반영 (낙관적 UI)
    setHasLiked(!hasLiked);
    setLikes(hasLiked ? Math.max(0, likes - 1) : likes + 1);

    // 백그라운드 서버 통신
    startTransition(async () => {
      await toggleAction();
    });
  };

  return (
    <button
      type="button"
      onClick={handleLike}
      disabled={isPending}
      className={`flex items-center gap-2 px-5 py-2.5 border rounded-full transition-all shadow-sm group ${
        hasLiked
          ? 'border-rose-500 bg-rose-50 text-rose-500 hover:bg-rose-100'
          : 'border-gray-300 bg-white text-gray-500 hover:border-rose-400 hover:text-rose-400'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 transition-transform group-hover:scale-110 ${hasLiked ? 'text-rose-500' : 'text-gray-400 group-hover:text-rose-400'}`}>
        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
      </svg>
      <span className="text-sm font-bold">공감</span>
      <span className="text-sm font-black">{likes}</span>
    </button>
  );
}

// ------------------------------------------------------------------
// 2. 💡 미나의 신규 엔진: 게시글 스크랩(북마크) 버튼
// ------------------------------------------------------------------
export function PostScrapButton({ postId, initialHasScrapped, toggleScrapAction }: any) {
  const [hasScrapped, setHasScrapped] = useState(initialHasScrapped);
  const [isPending, startTransition] = useTransition();

  const handleScrap = () => {
    // 💡 누르자마자 0.001초 만에 화면을 파란색으로 칠해버립니다!
    setHasScrapped(!hasScrapped);

    // 💡 조용히 DB 창고(스크랩 테이블)에 저장하러 다녀옵니다.
    startTransition(async () => {
      await toggleScrapAction();
    });
  };

  return (
    <button
      type="button"
      onClick={handleScrap}
      disabled={isPending}
      className={`flex items-center gap-2 px-5 py-2.5 border rounded-full transition-all shadow-sm group ${
        hasScrapped
          ? 'border-[#3b4890] bg-[#ebedf5] text-[#3b4890] hover:bg-[#dfe2ef]'
          : 'border-gray-300 bg-white text-gray-500 hover:border-[#3b4890] hover:text-[#3b4890]'
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 transition-transform group-hover:scale-110 ${hasScrapped ? 'text-[#3b4890]' : 'text-gray-400 group-hover:text-[#3b4890]'}`}>
        {/* 예쁜 북마크(리본) 아이콘 */}
        <path fillRule="evenodd" d="M6.32 2.577a4.902 4.902 0 0 1 3.07-.638h5.22c1.082 0 2.122.213 3.07.638A4.896 4.896 0 0 1 20.306 5.2a4.903 4.903 0 0 1 .637 3.069v11.53c0 .66-.75 1.04-1.28.64l-7.23-5.42a.75.75 0 0 0-.904 0l-7.23 5.42c-.53.4-1.28.02-1.28-.64V8.27c0-1.082.213-2.121.638-3.07A4.895 4.895 0 0 1 6.32 2.577Z" clipRule="evenodd" />
      </svg>
      <span className="text-sm font-bold">{hasScrapped ? '스크랩 취소' : '스크랩'}</span>
    </button>
  );
}

// ------------------------------------------------------------------
// 3. 기존 명품 엔진: 댓글 공감 버튼
// ------------------------------------------------------------------
export function CommentLikeButton({ commentId, initialLikes, initialHasLiked, toggleAction }: any) {
  const [likes, setLikes] = useState(initialLikes);
  const [hasLiked, setHasLiked] = useState(initialHasLiked);
  const [isPending, startTransition] = useTransition();

  const handleLike = () => {
    setHasLiked(!hasLiked);
    setLikes(hasLiked ? Math.max(0, likes - 1) : likes + 1);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('commentId', commentId);
      await toggleAction(formData);
    });
  };

  return (
    <button type="button" onClick={handleLike} disabled={isPending} className={`text-[13px] font-bold flex items-center gap-1 transition-colors ${hasLiked ? 'text-rose-500 hover:text-rose-600' : 'text-gray-500 hover:text-rose-500'}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
      공감 {likes}
    </button>
  );
}
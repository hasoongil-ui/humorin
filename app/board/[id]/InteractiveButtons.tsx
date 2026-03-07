'use client';

import { useState, useTransition } from 'react';

export function PostLikeButton({ postId, initialLikes, initialHasLiked, toggleAction }: any) {
  const [likes, setLikes] = useState(initialLikes);
  const [hasLiked, setHasLiked] = useState(initialHasLiked);
  const [isPending, startTransition] = useTransition();

  const handleLike = () => {
    // 버튼을 누르는 즉시 0.001초 만에 화면 변경 (선반영)
    setHasLiked(!hasLiked);
    setLikes(hasLiked ? Math.max(0, likes - 1) : likes + 1);

    // 실제 서버 통신은 백그라운드에서 조용히 처리하여 화면 멈춤(Freezing) 방지
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

export function CommentLikeButton({ commentId, initialLikes, initialHasLiked, toggleAction }: any) {
  const [likes, setLikes] = useState(initialLikes);
  const [hasLiked, setHasLiked] = useState(initialHasLiked);
  const [isPending, startTransition] = useTransition();

  const handleLike = () => {
    // 댓글 공감 역시 누르는 즉시 화면에 선반영
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
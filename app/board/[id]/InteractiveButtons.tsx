'use client';

import { useFormStatus } from 'react-dom';
import { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

function SubmitButton({ children, className, disabled }: any) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending ? '...' : children}
    </button>
  );
}

// ---------------------------------------------------------
// 🟢 1. 게시글용 버튼들
// ---------------------------------------------------------

export function PostLikeButton({ postId, initialLikes, initialHasLiked, toggleAction, isAdmin }: any) {
  return (
    <form action={toggleAction}>
      <SubmitButton className={`w-[80px] h-[80px] sm:w-[90px] sm:h-[90px] rounded-full border-[3px] flex flex-col items-center justify-center gap-1 transition-all shadow-sm ${initialHasLiked ? 'border-[#3b4890] bg-[#3b4890] text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-[#3b4890] hover:text-[#3b4890]'}`}>
        <span className="text-2xl sm:text-3xl leading-none mt-1">👍</span>
        <span className="text-[12px] sm:text-[13px] font-black">{initialLikes}</span>
      </SubmitButton>
    </form>
  );
}

export function PostDislikeButton({ postId, initialDislikes, initialHasDisliked, toggleAction, isAdmin }: any) {
  return (
    <form action={toggleAction}>
      <SubmitButton className={`w-[80px] h-[80px] sm:w-[90px] sm:h-[90px] rounded-full border-[3px] flex flex-col items-center justify-center gap-1 transition-all shadow-sm ${initialHasDisliked ? 'border-gray-500 bg-gray-500 text-white' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-400 hover:text-gray-600'}`}>
        <span className="text-2xl sm:text-3xl leading-none mt-1">👎</span>
        <span className="text-[12px] sm:text-[13px] font-bold">{initialDislikes}</span>
      </SubmitButton>
    </form>
  );
}

export function PostScrapButton({ postId, initialHasScrapped, toggleScrapAction }: any) {
  return (
    <form action={toggleScrapAction}>
      <SubmitButton className={`px-3 py-1.5 rounded-sm border flex items-center justify-center gap-1.5 text-[12px] font-bold transition-all shadow-sm ${initialHasScrapped ? 'border-yellow-400 bg-yellow-50 text-yellow-600' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>
        <span>{initialHasScrapped ? '⭐' : '☆'}</span>
        <span>스크랩</span>
      </SubmitButton>
    </form>
  );
}

export function PostReportButton({ postId, currentUserId, isAdmin }: any) {
  const handleReport = async () => {
    if (!currentUserId) return alert('로그인이 필요합니다.');
    if (isAdmin) return alert('관리자는 신고할 수 없습니다.');
    if (confirm('이 게시글을 신고하시겠습니까?\n허위 신고 시 불이익을 받을 수 있습니다.')) {
      try {
        const res = await fetch(`/api/report/post`, { method: 'POST', body: JSON.stringify({ postId }) });
        if (res.ok) alert('신고가 접수되었습니다. (누적 시 블라인드 처리됩니다.)');
        else alert('이미 신고하셨거나 오류가 발생했습니다.');
      } catch (e) { console.error(e); }
    }
  };
  return (
    <button onClick={handleReport} className="px-3 py-1.5 flex items-center justify-center gap-1 text-[12px] font-bold text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all rounded-sm border border-transparent">
      🚨 신고
    </button>
  );
}

// ---------------------------------------------------------
// 🟢 2. 댓글용 버튼들
// ---------------------------------------------------------

export function CommentLikeButton({ commentId, initialLikes, initialHasLiked, toggleAction, isAdmin }: any) {
  return (
    <form action={toggleAction}>
      <input type="hidden" name="commentId" value={commentId} />
      <SubmitButton className={`px-2 py-1 border rounded-sm flex items-center gap-1 text-[11px] font-bold transition-colors ${initialHasLiked ? 'border-[#3b4890] text-[#3b4890] bg-indigo-50' : 'border-gray-300 text-gray-500 hover:bg-gray-50 hover:border-[#3b4890] hover:text-[#3b4890]'}`}>
        <span>👍</span>
        <span>{initialLikes}</span>
      </SubmitButton>
    </form>
  );
}

export function CommentDislikeButton({ commentId, initialDislikes, initialHasDisliked, toggleAction, isAdmin }: any) {
  return (
    <form action={toggleAction}>
      <input type="hidden" name="commentId" value={commentId} />
      <SubmitButton className={`px-2 py-1 border rounded-sm flex items-center gap-1 text-[11px] font-bold transition-colors ${initialHasDisliked ? 'border-gray-500 text-gray-600 bg-gray-100' : 'border-gray-300 text-gray-400 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-600'}`}>
        <span>👎</span>
        <span>{initialDislikes}</span>
      </SubmitButton>
    </form>
  );
}

export function CommentReportButton({ commentId, currentUserId, isAdmin }: any) {
  const handleReport = async () => {
    if (!currentUserId) return alert('로그인이 필요합니다.');
    if (isAdmin) return alert('관리자는 신고할 수 없습니다.');
    if (confirm('이 댓글을 신고하시겠습니까?')) {
      try {
        const res = await fetch(`/api/report/comment`, { method: 'POST', body: JSON.stringify({ commentId }) });
        if (res.ok) alert('신고가 접수되었습니다.');
        else alert('이미 신고하셨거나 오류가 발생했습니다.');
      } catch (e) { console.error(e); }
    }
  };
  return (
    <button onClick={handleReport} className="px-1.5 py-1 border border-transparent flex items-center gap-1 text-[11px] font-bold text-gray-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors rounded-sm" title="신고하기">
      🚨 신고
    </button>
  );
}

// ---------------------------------------------------------
// 🟢 3. 스마트 인라인 댓글 수정폼 컴포넌트
// ---------------------------------------------------------
export function EditCommentForm({ commentId, initialContent, initialImage, editAction }: any) {
  const [content, setContent] = useState(initialContent || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialImage || '');
  const [isDeleted, setIsDeleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1048576) {
        alert('1MB 이하의 이미지만 첨부 가능합니다.');
        return;
      }
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsDeleted(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setPreviewUrl('');
    setIsDeleted(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !previewUrl) return;

    setIsSubmitting(true);
    let finalImageUrl = initialImage;

    if (isDeleted) {
        finalImageUrl = '';
    }

    if (imageFile) {
      try {
        const ticketRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: imageFile.name, contentType: imageFile.type }),
        });
        const { uploadUrl, publicUrl } = await ticketRes.json();
        if (uploadUrl) {
          await fetch(uploadUrl, { method: 'PUT', body: imageFile, headers: { 'Content-Type': imageFile.type } });
          finalImageUrl = publicUrl;
        }
      } catch (error) {
        alert('이미지 업로드 중 오류가 발생했습니다.');
        setIsSubmitting(false);
        return;
      }
    }

    const formData = new FormData();
    formData.append('commentId', commentId);
    formData.append('content', content);
    formData.append('imageUrl', finalImageUrl || '');

    await editAction(formData);

    setIsSubmitting(false);
    const checkbox = document.getElementById(`edit-${commentId}`) as HTMLInputElement;
    if (checkbox) checkbox.checked = false;
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-indigo-300 rounded-sm shadow-sm overflow-hidden flex flex-col">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        disabled={isSubmitting}
        className="w-full p-3 text-[14px] outline-none resize-y"
        placeholder="수정할 내용을 입력하세요..."
      ></textarea>

      {previewUrl && (
        <div className="px-3 pb-3 relative inline-block">
          <img src={previewUrl} alt="첨부됨" className="h-20 object-cover rounded-sm border shadow-sm" />
          <button
            type="button"
            onClick={removeImage}
            disabled={isSubmitting}
            className="absolute top-1 left-4 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md hover:bg-red-600 disabled:opacity-50"
            title="이미지 삭제"
          >
            X
          </button>
        </div>
      )}

      <div className="bg-gray-50 border-t border-gray-100 px-2 sm:px-3 py-2 flex flex-wrap justify-between items-center gap-2">
        <div>
          <input type="file" ref={fileInputRef} id={`edit-image-${commentId}`} accept="image/*" className="hidden" onChange={handleFileChange} disabled={isSubmitting} />
          <label htmlFor={`edit-image-${commentId}`} className={`cursor-pointer px-2 sm:px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-[11px] sm:text-[12px] font-bold rounded-sm hover:bg-gray-100 shadow-sm flex items-center justify-center gap-1 whitespace-nowrap flex-shrink-0 ${isSubmitting ? 'opacity-50' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
            {previewUrl ? '이미지 변경' : '이미지 첨부'}
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <label htmlFor={`edit-${commentId}`} className="cursor-pointer px-3 sm:px-4 py-1.5 bg-white border border-gray-300 text-gray-600 text-[11px] sm:text-[12px] font-bold rounded-sm hover:bg-gray-100 shadow-sm flex items-center justify-center whitespace-nowrap flex-shrink-0">
            취소
          </label>
          <button type="submit" disabled={isSubmitting} className="px-3 sm:px-4 py-1.5 bg-[#414a66] text-white text-[11px] sm:text-[12px] font-bold rounded-sm hover:bg-[#2a3042] shadow-sm disabled:bg-gray-400 flex items-center justify-center gap-1 whitespace-nowrap flex-shrink-0">
            {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
            {isSubmitting ? '저장 중...' : '수정 완료'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------
// 🟢 4. 최신 트렌드 Web Share API가 탑재된 공유 버튼!
// ---------------------------------------------------------
export function PostShareButton({ title }: { title: string }) {
  const handleShare = async () => {
    // 💡 [미나 수술] 노골적인 홍보 문구 삭제! 오직 제목과 링크만 깔끔하게 전달합니다.
    const shareData = {
      title: title,
      url: window.location.href, 
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('공유 취소됨');
      }
    } 
    else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        // PC 버전에 뜨는 알림창 문구도 거부감 없이 자연스럽게 수정했습니다.
        alert('🔗 게시글 링크가 복사되었습니다!');
      } catch (error) {
        alert('링크 복사에 실패했습니다.');
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-300 rounded-sm transition-colors shadow-sm"
      title="게시글 공유하기"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
      </svg>
      공유
    </button>
  );
}
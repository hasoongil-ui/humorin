'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CommentForm({ postId, parentId, commentId, initialContent = '', initialImage = '', actionType, submitAction, author }: any) {
    const [content, setContent] = useState(initialContent);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState(initialImage);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false); 
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleFileChange = (e: any) => {
        const file = e.target.files[0];
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
        formData.append('content', content);
        if (parentId) formData.append('parentId', parentId);
        if (commentId) formData.append('commentId', commentId);
        formData.append('imageUrl', finalImageUrl || '');

        await submitAction(formData);

        setContent('');
        setImageFile(null);
        setPreviewUrl('');
        setIsDeleted(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsSubmitting(false);

        if (actionType === 'reply') {
            const cb = document.getElementById(`reply-${parentId}`) as HTMLInputElement;
            if (cb) cb.checked = false;
        } else if (actionType === 'edit') {
            const cb = document.getElementById(`edit-${commentId}`) as HTMLInputElement;
            if (cb) cb.checked = false;
        }

        router.refresh();
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-0 w-full">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={actionType === 'reply' ? `@${author} 님에게 답글 남기기...` : "건전한 커뮤니티 문화를 위해 배려 부탁드립니다."}
                className="w-full p-3 border border-gray-300 rounded-t-sm focus:border-gray-500 outline-none font-medium text-sm bg-white resize-none h-20"
                disabled={isSubmitting}
            />
            
            {previewUrl && (
                <div className="bg-white border-x border-gray-300 px-3 pb-2 pt-1">
                    <div className="relative inline-block bg-gray-50 p-2 rounded-sm border border-gray-200">
                        <img src={previewUrl} className="max-h-20 object-contain rounded-sm" alt="첨부 이미지 미리보기" />
                        <button type="button" onClick={removeImage} disabled={isSubmitting} className="absolute -top-2 -right-2 bg-white rounded-full border border-gray-300 p-1 hover:bg-gray-100 shadow-sm disabled:opacity-50">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-gray-500"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-t-0 border-gray-300 p-2 rounded-b-sm gap-2 sm:gap-0">
                <div className="w-full sm:w-auto flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="sr-only" id={`file-${actionType}-${commentId || parentId || 'main'}`} disabled={isSubmitting} />
                    <label htmlFor={`file-${actionType}-${commentId || parentId || 'main'}`} className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-sm text-xs font-bold text-gray-600 transition-colors shadow-sm ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                        {actionType === 'edit' ? '이미지 변경' : '이미지 첨부'} (1MB 이하)
                    </label>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full sm:w-24 py-2.5 bg-[#414a66] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-colors text-sm shadow-sm flex-shrink-0 disabled:bg-gray-400 flex justify-center items-center gap-1.5">
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSubmitting ? '처리 중...' : actionType === 'edit' ? '수정완료' : '댓글 등록'}
                </button>
            </div>
        </form>
    );
}
'use client';

import { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export default function CommentForm({ postId, parentId, author, actionType, submitAction }: any) {
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // 🛡️ [수술 1] 봇을 낚기 위한 '투명 함정' 상태값 추가
    const [botTrap, setBotTrap] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uniqueId = parentId ? `image-${parentId}` : 'image-main';

    const handleFileChange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1048576) {
                alert('1MB 이하의 이미지만 첨부 가능합니다.');
                return;
            }
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setPreviewUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && !previewUrl) return;

        setIsSubmitting(true);
        let finalImageUrl = '';

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
        formData.append('imageUrl', finalImageUrl);
        
        // 🛡️ [수술 2] 서버로 몰래 투명 함정 데이터 보내기
        formData.append('bot_trap', botTrap);

        // 🛡️ [수술 3] 서버에서 금칙어 검사를 통과했는지 결과값 받기
        const result = await submitAction(formData);

        // 만약 금칙어에 걸렸다면 경고창 띄우고 중단!
        if (result && result.error === 'forbidden_word') {
            alert(`🚨 작성하신 댓글에 금지된 단어 [ ${result.word} ]가 포함되어 있습니다.\n특수문자나 띄어쓰기로 우회해도 모두 감지되니 건전한 커뮤니티 문화를 위해 수정해 주십시오.`);
            setIsSubmitting(false);
            return;
        }

        setContent('');
        setImageFile(null);
        setPreviewUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsSubmitting(false);

        if (actionType === 'reply' && parentId) {
            const cb = document.getElementById(`reply-${parentId}`) as HTMLInputElement;
            if (cb) cb.checked = false;
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden flex flex-col mt-2">
            
            {/* 🛡️ [수술 4] 봇을 유인하는 시크릿 함정 (Honeypot) - 화면에는 안 보이지만 봇은 이걸 채웁니다! */}
            <div className="absolute opacity-0 -z-50 h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor={`humorin_secret_trap_${uniqueId}`}>웹사이트 주소</label>
                <input 
                    type="text" 
                    id={`humorin_secret_trap_${uniqueId}`} 
                    name="humorin_secret_trap" 
                    value={botTrap} 
                    onChange={(e) => setBotTrap(e.target.value)} 
                    tabIndex={-1} 
                    autoComplete="off" 
                />
            </div>

            {actionType === 'reply' && author && (
                <div className="px-3 pt-2 text-[12px] font-bold text-[#3b4890]">
                    ↳ @{author} 님에게 답글 작성 중...
                </div>
            )}

            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={1500} 
                rows={3}
                disabled={isSubmitting}
                className="w-full p-3 text-[14px] outline-none resize-y"
                placeholder={actionType === 'reply' ? "답글을 입력하세요..." : "건전한 커뮤니티 문화를 위해 배려 부탁드립니다."}
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
                    <input type="file" ref={fileInputRef} id={uniqueId} accept="image/*" className="hidden" onChange={handleFileChange} disabled={isSubmitting} />
                    <label htmlFor={uniqueId} className={`cursor-pointer px-2 sm:px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-[11px] sm:text-[12px] font-bold rounded-sm hover:bg-gray-100 shadow-sm flex items-center justify-center gap-1 whitespace-nowrap flex-shrink-0 ${isSubmitting ? 'opacity-50' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                        {previewUrl ? '이미지 변경' : '이미지 첨부'}
                    </label>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className={`text-[10px] sm:text-[11px] font-black tracking-tighter ${content.length >= 1500 ? 'text-rose-500' : 'text-gray-400'}`}>
                        {content.length.toLocaleString()} / 1,500
                    </span>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {actionType === 'reply' && (
                            <label htmlFor={`reply-${parentId}`} className="cursor-pointer px-3 sm:px-4 py-1.5 bg-white border border-gray-300 text-gray-600 text-[11px] sm:text-[12px] font-bold rounded-sm hover:bg-gray-100 shadow-sm flex items-center justify-center whitespace-nowrap flex-shrink-0">
                                취소
                            </label>
                        )}
                        <button type="submit" disabled={isSubmitting} className="px-3 sm:px-5 py-1.5 bg-[#414a66] text-white text-[11px] sm:text-[13px] font-bold rounded-sm hover:bg-[#2a3042] shadow-sm disabled:bg-gray-400 flex items-center justify-center gap-1 whitespace-nowrap flex-shrink-0">
                            {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                            {isSubmitting ? '등록 중...' : '댓글 등록'}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
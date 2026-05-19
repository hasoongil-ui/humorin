'use client';

import { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

// 🚨 [궁극의 패치 1] 파일의 유전자(Magic Bytes)를 투시하여 진짜 정체를 밝혀내는 엔진
const getTrueMimeType = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const arr = new Uint8Array(e.target?.result as ArrayBuffer);
            if (arr.length < 12) return resolve(file.type || 'image/jpeg');

            // 바이트 코드를 16진수로 변환
            const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

            if (hex.startsWith('89504E47')) resolve('image/png');
            else if (hex.startsWith('47494638')) resolve('image/gif'); // GIF8 감지
            else if (hex.startsWith('FFD8FF')) resolve('image/jpeg'); // JPG 감지
            else if (hex.startsWith('52494646') && hex.substring(16, 24) === '57454250') resolve('image/webp'); // RIFF...WEBP 감지
            else resolve(file.type || 'image/jpeg'); // 알 수 없을 땐 기본값
        };
        reader.onerror = () => resolve(file.type || 'image/jpeg');
        reader.readAsArrayBuffer(file.slice(0, 12)); // 앞부분 12바이트만 0.001초 만에 스캔
    });
};

// 🚨 [신규 엔진 2] WebP 파일 내부를 투시하여 움짤(ANIM)인지 판독하는 함수
const isAnimatedWebP = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
        if (file.type !== 'image/webp') return resolve(false);
        const reader = new FileReader();
        reader.onload = () => {
            const arr = new Uint8Array(reader.result as ArrayBuffer);
            for (let i = 0; i < arr.length - 4; i++) {
                if (arr[i] === 0x41 && arr[i + 1] === 0x4E && arr[i + 2] === 0x49 && arr[i + 3] === 0x4D) {
                    return resolve(true);
                }
            }
            resolve(false);
        };
        reader.onerror = () => resolve(false);
        reader.readAsArrayBuffer(file.slice(0, 256));
    });
};

// 🛠️ [미나의 초경량 압축기]
const compressImageToWebP = (file: File): Promise<File> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 800;

                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                                const newFile = new File([blob], newFileName, {
                                    type: 'image/webp',
                                });
                                resolve(newFile);
                            } else {
                                resolve(file);
                            }
                        },
                        'image/webp',
                        0.8
                    );
                } else {
                    resolve(file);
                }
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
};

export default function CommentForm({ postId, parentId, author, actionType, submitAction }: any) {
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [botTrap, setBotTrap] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const uniqueId = parentId ? `image-${parentId}` : 'image-main';

    const handleFileChange = async (e: any) => {
        let file = e.target.files?.[0];
        if (!file) return;

        // 💡 [폴드2 엑박 완벽 박멸: Magic Bytes 투시 및 교정 로직]
        const trueType = await getTrueMimeType(file); // 유전자를 투시해 진짜 타입을 알아냅니다.
        
        let correctExtension = trueType.split('/')[1] || 'jpg';
        if (correctExtension === 'jpeg') correctExtension = 'jpg';

        // 갤럭시가 속여놓은 가짜 확장자를 벗겨내고, 진짜 유전자에 맞는 올바른 이름표를 달아줍니다.
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const newFileName = `${baseName}.${correctExtension}`;

        // 껍데기(이름, 타입)와 뱃속(데이터)이 100% 일치하는 완벽한 무결점 파일로 재조립!
        file = new File([file], newFileName, {
            type: trueType,
            lastModified: file.lastModified || Date.now(),
        });

        // 🚨 이후 로직은 기존과 10000% 동일하게 안전하게 흘러갑니다.
        const isWebPAnim = await isAnimatedWebP(file);

        if (file.type === 'image/gif' || isWebPAnim) {
            if (file.size > 2 * 1024 * 1024) {
                alert('🚨 움짤(GIF 및 WebP 애니메이션)은 서버 쾌적화를 위해 2MB 이하만 첨부 가능합니다.');
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file)); // 폴드2에서도 이제 절대 엑박이 뜨지 않습니다!
        } else {
            if (file.size > 3 * 1024 * 1024) {
                alert('일반 이미지는 최대 3MB까지 선택 가능합니다.');
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            try {
                const compressedFile = await compressImageToWebP(file);
                setImageFile(compressedFile);
                setPreviewUrl(URL.createObjectURL(compressedFile));
            } catch (error) {
                setImageFile(file);
                setPreviewUrl(URL.createObjectURL(file));
            }
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
        formData.append('bot_trap', botTrap);

        const result = await submitAction(formData);

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
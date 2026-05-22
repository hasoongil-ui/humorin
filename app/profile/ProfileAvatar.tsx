'use client';

import { useState, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { Loader2 } from 'lucide-react';

export default function ProfileAvatar({ initialImage, fallbackChar, updateAction }: { initialImage: string | null, fallbackChar: string, updateAction: (url: string) => Promise<any> }) {
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(initialImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 🛡️ [방어막 1] 엄격한 확장자 검사
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('🚨 JPG, PNG, WEBP 형식의 이미지 파일만 업로드 가능합니다.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 🛡️ [방어막 2] 초강력 입구 컷 (즉시 튕겨냄)
    if (file.size > 500 * 1024) {
      alert('🚨 프로필 사진은 최대 500KB까지만 업로드 가능합니다.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 💡 [UX 최적화] 모바일 연산 멈춤 착각을 막기 위해 여기서부터 즉시 스피너를 켭니다!
    setIsUploading(true);

    // 🛡️ [방어막 3] 덩치 큰 움짤(WebP 애니메이션) 원천 차단!
    if (file.type === 'image/webp') {
      const isAnimated = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (!e.target || !e.target.result) {
            resolve(false);
            return;
          }
          const arr = new Uint8Array(e.target.result as ArrayBuffer);
          let found = false;
          for (let i = 0; i < arr.length - 3; i++) {
            if (arr[i] === 65 && arr[i+1] === 78 && arr[i+2] === 73 && arr[i+3] === 77) {
              found = true; break;
            }
          }
          resolve(found);
        };
        reader.readAsArrayBuffer(file.slice(0, 1024)); 
      });

      if (isAnimated) {
        alert('🚨 움직이는 사진(움짤)은 프로필로 사용할 수 없습니다.\n일반 정지 사진을 선택해 주세요.');
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    // 🛡️ [방어막 4] 기형적으로 세로가 긴 이미지 차단 (🚨 블랙홀 버그 완벽 픽스!)
    const img = new Image();
    img.src = URL.createObjectURL(file);
    const isLongImage = await new Promise((resolve) => { 
      img.onload = () => {
        resolve(img.height > img.width * 2.5);
      };
      // 💡 모바일 램 부족으로 디코딩 실패 시 뻗지 않고 비상 탈출!
      img.onerror = () => {
        resolve(false); 
      };
    });
    URL.revokeObjectURL(img.src);
    
    if (isLongImage) {
      alert('🚨 세로로 너무 긴 사진은 프로필로 사용할 수 없습니다. (정방형 비율 권장)');
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      // 💡 [최종 검문소: 극한 다이어트 압축] 
      const options = {
        maxSizeMB: 0.08, // 80KB
        maxWidthOrHeight: 400,
        // 🚨 [치명적 버그 픽스] 모바일 멈춤 현상(Silent Crash) 방지를 위해 강제 false 적용!
        useWebWorker: false, 
      };
      
      const compressedFile = await imageCompression(file, options);

      if (compressedFile.size > 200 * 1024) {
        alert('🚨 시스템 오류: 이미지가 최적화 한도를 초과했습니다. 다른 사진을 이용해 주세요.');
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const ticketRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: `profile_${Date.now()}.jpg`, contentType: compressedFile.type }),
      });
      
      const { uploadUrl, publicUrl } = await ticketRes.json();
      
      if (uploadUrl) {
        await fetch(uploadUrl, { method: 'PUT', body: compressedFile, headers: { 'Content-Type': compressedFile.type } });
        
        const res = await updateAction(publicUrl);
        if (res?.error) {
          alert('프로필 사진 저장에 실패했습니다.');
        } else {
          setImageUrl(publicUrl);
        }
      }
    } catch (error) {
      alert('사진 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  return (
    <div className="flex flex-col items-center mb-4">
      <div className="relative w-24 h-24 group">
        <div className="w-full h-full bg-white/10 rounded-full flex items-center justify-center text-4xl font-black shadow-inner border-2 border-white/20 overflow-hidden relative">
          {imageUrl ? (
            <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span>{fallbackChar}</span>
          )}
          
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>
        
        <button 
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 w-8 h-8 bg-[#3b4890] rounded-full border-2 border-[#2a3042] flex items-center justify-center text-white hover:bg-indigo-500 transition-colors shadow-lg z-10 group-hover:scale-110"
          title="프로필 사진 변경"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
          </svg>
        </button>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageChange} 
          accept="image/jpeg, image/png, image/webp" 
          className="hidden" 
        />
      </div>

      <div className="mt-3 text-[11px] text-gray-400 font-medium leading-relaxed text-center">
        * 최대 500KB 이하 정지 사진만 가능 (JPG, PNG, WEBP)<br/>
        * 세로로 긴 사진 및 움직이는 사진(GIF) 불가
      </div>
    </div>
  );
}
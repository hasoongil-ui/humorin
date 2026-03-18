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

    // 🛡️ [방어막 1] 엄격한 확장자 검사 (알 수 없는 파일 완전 차단)
    // 보안 및 악용: JPG, PNG, WEBP 딱 3개만 허용하여 해킹 파일 업로드 가능성을 차단합니다.
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('🚨 JPG, PNG, WEBP 형식의 이미지 파일만 업로드 가능합니다.');
      return;
    }

    // 🛡️ [방어막 2] 초강력 입구 컷: 10MB/2MB -> 500KB로 대폭 하향!
    // 서버 최적화: 유저가 실수로 대형 파일을 넣어도 폰/브라우저가 멈추거나, 서버 스토리지 요금이 폭발하는 것을 미연에 방지합니다.
    if (file.size > 500 * 1024) {
      alert('🚨 프로필 사진은 최대 500KB까지만 업로드 가능합니다.');
      return;
    }

    // 🛡️ [방어막 3] 덩치 큰 움짤(WebP 애니메이션) 원천 차단! (💡 대장님이 잡아낸 빨간 줄 완벽 해결!)
    // 예외 상황: WebP는 정지 화상과 움짤이 섞여 있습니다. 파일의 헤더(DNA)를 뜯어보고 '움직임' 신호가 있으면 가차 없이 튕겨냅니다.
    if (file.type === 'image/webp') {
      const isAnimated = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          // 💡 [수술 핵심: 빨간 줄 해결!] e.target과 result가 비어있으면(null/undefined) 조용히 종료합니다.
          if (!e.target || !e.target.result) {
            resolve(false);
            return;
          }

          const arr = new Uint8Array(e.target.result as ArrayBuffer);
          let found = false;
          // 헤더의 일부분만 스캔하여 '움직임' 신호(ANIM)를 찾습니다.
          for (let i = 0; i < arr.length - 3; i++) {
            if (arr[i] === 65 && arr[i+1] === 78 && arr[i+2] === 73 && arr[i+3] === 77) {
              found = true; break;
            }
          }
          resolve(found);
        };
        // 전체 파일이 아닌, 앞부분 딱 1KB(헤더)만 읽도록 최적화했습니다.
        reader.readAsArrayBuffer(file.slice(0, 1024)); 
      });

      if (isAnimated) {
        alert('🚨 움직이는 사진(움짤)은 프로필로 사용할 수 없습니다.\n일반 정지 사진을 선택해 주세요.');
        return;
      }
    }

    // 🛡️ [방어막 4] 기형적으로 세로가 긴 이미지(웹툰 캡처 등) 차단
    // 서버 최적화: 세로로 너무 긴 이미지는 압축 효율이 떨어지고 서버 용량을 많이 먹습니다. 비율 검사로 컷합니다.
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise((resolve) => { img.onload = resolve; });
    // 가로 대비 세로가 2.5배 넘으면 기형적인 이미지로 판단!
    const isLongImage = img.height > img.width * 2.5; 
    URL.revokeObjectURL(img.src);
    
    if (isLongImage) {
      alert('🚨 세로로 너무 긴 사진은 프로필로 사용할 수 없습니다. (정방형 비율 권장)');
      return;
    }

    setIsUploading(true);

    try {
      // 💡 [최종 검문소: 극한 다이어트 압축] 
      // 입구를 뚫었더라도, 브라우저에서 강제로 가로세로 최대 400px, 80KB(0.08MB) 이하의 초경량으로 찌그러뜨립니다.
      const options = {
        maxSizeMB: 0.08, // 80KB
        maxWidthOrHeight: 400,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);

      // 🛡️ [최후의 보루] 혹시나 기형적인 파일이라 압축해도 크기가 크다면 최종 전송 컷!
      if (compressedFile.size > 200 * 1024) {
        alert('🚨 시스템 오류: 이미지가 최적화 한도를 초과했습니다. 다른 사진을 이용해 주세요.');
        setIsUploading(false);
        return;
      }

      // 💡 Vercel 스토리지로 업로드
      const ticketRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: `profile_${Date.now()}.jpg`, contentType: compressedFile.type }),
      });
      
      const { uploadUrl, publicUrl } = await ticketRes.json();
      
      if (uploadUrl) {
        // 실제 Vercel 스토리지에 사진을 꽂습니다.
        await fetch(uploadUrl, { method: 'PUT', body: compressedFile, headers: { 'Content-Type': compressedFile.type } });
        
        // 업로드 성공 후 서버(DB)에 주소 저장 명령!
        const res = await updateAction(publicUrl);
        if (res?.error) {
          alert('프로필 사진 저장에 실패했습니다.');
        } else {
          setImageUrl(publicUrl); // 화면의 프사를 바로 교체
        }
      }
    } catch (error) {
      alert('사진 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      // 같은 파일을 연속으로 올릴 수 있게 입력창을 초기화합니다.
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
        
        {/* 카메라 아이콘 버튼 */}
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

      {/* 💡 [안내 문구 수정] 대장님이 주신 가이드를 완벽하게 반영했습니다. */}
      <div className="mt-3 text-[11px] text-gray-300/80 font-medium leading-relaxed text-center">
        * 최대 500KB 이하 정지 사진만 가능 (JPG, PNG, WEBP)<br/>
        * 세로로 긴 사진 및 움직이는 사진(GIF) 불가
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { ImagePlus, Loader2, X } from 'lucide-react';

export default function WritePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  
  // 💡 미나의 추가 부품: 유저가 게시판을 고를 수 있는 '카테고리' 상태 추가! (기본값: 일상)
  const [category, setCategory] = useState('일상'); 
  
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const router = useRouter();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.size > 10 * 1024 * 1024) {
          alert(`[${file.name}] 용량이 너무 큽니다! (최대 10MB까지만 가능)\n쾌적한 사이트 환경을 위해 용량을 줄여주세요!`);
          continue; 
        }

        let fileToUpload = file;

        if (file.type !== 'image/gif' && file.type !== 'image/webp') {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          await new Promise((resolve) => { img.onload = resolve; });
          
          const isLongImage = img.height > img.width * 2; 
          URL.revokeObjectURL(img.src);

          if (isLongImage) {
            fileToUpload = file; // 만화 원본 보존
          } else {
            const options = {
              maxSizeMB: 1.5,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            };
            fileToUpload = await imageCompression(file, options);
          }
        }
        
        const ticketRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            filename: fileToUpload.name, 
            contentType: fileToUpload.type 
          }),
        });
        
        const { uploadUrl, publicUrl } = await ticketRes.json();

        if (uploadUrl) {
          await fetch(uploadUrl, {
            method: 'PUT',
            body: fileToUpload,
            headers: { 'Content-Type': fileToUpload.type },
          });
          
          setImages((prev) => [...prev, publicUrl]);
        }
      }
    } catch (error) {
      console.error('업로드 실패:', error);
      alert('사진 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading || isSubmitting) return;

    setIsSubmitting(true); 

    let finalContent = content;
    if (images.length > 0) {
      const imageTags = images.map(url => `<img src="${url}" alt="첨부사진" style="max-width: 100%; height: auto; display: block; margin: 15px auto; border-radius: 8px;" />`).join('\n');
      finalContent = finalContent + '\n\n' + imageTags;
    }

    // 💡 미나의 마법 도장: 서버로 보내기 전에, 선택한 카테고리를 제목 앞에 찰싹! 붙여줍니다. (예: "[공포] 무서운 이야기")
    const finalTitle = `[${category}] ${title}`;

    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: finalTitle, content: finalContent, author, category }), 
      });

      if (res.ok) {
        // 글 다 쓰면 전체글 보기로 돌아가기
        router.push('/board');
        router.refresh();
      } else {
        alert('글 등록에 실패했습니다.');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border p-6">
        <h1 className="text-2xl font-black text-[#3b4890] mb-8 border-b pb-4">✍️ 오재미 명품 글쓰기 V4.2 (게시판 분류 기능 탑재!)</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <input 
            placeholder="글쓴이 성함" 
            className="w-full p-3 border-2 border-gray-100 rounded-lg focus:border-[#3b4890] outline-none font-bold"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required 
          />
          
          {/* 💡 카테고리 선택기와 제목 입력칸을 한 줄에 나란히 배치했습니다! */}
          <div className="flex gap-2">
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="p-3 border-2 border-gray-100 rounded-lg focus:border-[#3b4890] outline-none font-bold bg-white cursor-pointer text-[#3b4890]"
            >
              <option value="일상">일상</option>
              <option value="유머">유머</option>
              <option value="감동">감동</option>
              <option value="공포">공포</option>
              <option value="핫뉴스">핫뉴스</option>
            </select>
            <input 
              placeholder="제목을 입력하세요" 
              className="flex-1 p-3 border-2 border-gray-100 rounded-lg text-xl focus:border-[#3b4890] outline-none font-black"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required 
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className={`flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer font-bold ${isUploading || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 transition-colors'}`}>
                <ImagePlus size={20} />
                <span>사진/움짤 추가 (최대 10MB)</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isUploading || isSubmitting} />
              </label>
              {isUploading && (
                <div className="flex items-center gap-2 text-[#3b4890] font-bold text-sm animate-pulse">
                  <Loader2 className="animate-spin" size={16} />
                  스마트 판독 및 업로드 중...🚀
                </div>
              )}
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 border p-3 rounded-lg bg-gray-50">
                {images.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-md overflow-hidden border shadow-sm group">
                    <img src={url} alt="업로드 이미지" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <textarea 
            placeholder="내용을 입력하세요 (사진은 위에 버튼으로 추가하세요!)" 
            className="w-full p-3 border-2 border-gray-100 rounded-lg h-80 focus:border-[#3b4890] outline-none leading-relaxed"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required 
          />

          <div className="flex gap-2 pt-4">
            <button type="submit" disabled={isUploading || isSubmitting} className="flex-1 py-4 bg-[#3b4890] text-white rounded-xl font-black text-lg hover:bg-[#222b5c] shadow-lg transition-all disabled:bg-gray-400 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="animate-spin" size={20} />}
              {isSubmitting ? '글을 서버로 보내는 중...' : isUploading ? '사진 업로드 대기 중...' : '명품 글 등록하기 🚀'}
            </button>
            <button type="button" onClick={() => router.back()} disabled={isSubmitting} className="px-8 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 disabled:opacity-50">취소</button>
          </div>
        </form>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { ImagePlus, Loader2, X } from 'lucide-react';

export default function WritePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('일상'); 
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentCat = params.get('category');
    if (currentCat) {
      setCategory(currentCat);
    }
  }, []);

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
            fileToUpload = file; 
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

    const finalTitle = `[${category}] ${title}`;

    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: finalTitle, content: finalContent, author, category }), 
      });

      if (res.ok) {
        router.push(`/board?category=${category}`);
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
    /* 💡 미나의 반성: 둥근 모서리, 그림자, 회색 배경을 싹 다 없애고 하얀 바탕에 100% 쫙 펴지게 만들었습니다! */
    <div className="min-h-screen bg-white font-sans text-gray-800">
      <div className="max-w-6xl mx-auto p-4 md:p-6 mt-4 mb-20">
        
        <h1 className="text-2xl font-black text-[#3b4890] mb-6 border-b-2 border-gray-800 pb-2">
          ✍️ [{category}] 게시판에 시원하게 글쓰기
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <input 
            placeholder="글쓴이 성함" 
            className="w-full md:w-64 p-3 border border-gray-300 rounded focus:border-[#3b4890] outline-none font-bold text-gray-800"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required 
          />
          
          <input 
            placeholder="시원하게 제목을 입력하세요!" 
            className="w-full p-4 border border-gray-300 rounded text-xl focus:border-[#3b4890] outline-none font-black text-gray-900"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required 
          />

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className={`flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-800 border border-gray-300 rounded cursor-pointer font-bold ${isUploading || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 transition-colors'}`}>
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
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 border border-gray-200 p-4 rounded bg-gray-50">
                {images.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded overflow-hidden border shadow-sm group">
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
            className="w-full p-4 border border-gray-300 rounded h-[600px] focus:border-[#3b4890] outline-none leading-relaxed text-lg text-gray-900"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required 
          />

          <div className="flex gap-2 pt-4 border-t border-gray-200 mt-8">
            <button type="button" onClick={() => router.back()} disabled={isSubmitting} className="px-8 py-4 bg-gray-200 text-gray-800 rounded font-bold hover:bg-gray-300 disabled:opacity-50 transition-colors">
              취소
            </button>
            <button type="submit" disabled={isUploading || isSubmitting} className="flex-1 py-4 bg-[#3b4890] text-white rounded font-black text-lg hover:bg-[#222b5c] transition-all disabled:bg-gray-400 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="animate-spin" size={20} />}
              {isSubmitting ? '글을 서버로 보내는 중...' : isUploading ? '사진 업로드 대기 중...' : '명품 글 등록하기 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
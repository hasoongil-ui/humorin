'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { ImagePlus, Loader2, X } from 'lucide-react';

export default function WritePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  // 💡 미나의 광클 방지용 자물쇠 추가!
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const router = useRouter();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedFile = await imageCompression(file, options);
        
        const formData = new FormData();
        formData.append('file', compressedFile);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.url) {
          setImages((prev) => [...prev, data.url]);
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
    // 💡 업로드 중이거나, 이미 등록 버튼을 눌렀다면(자물쇠 잠김) 여기서 멈춤!
    if (isUploading || isSubmitting) return;

    // 등록 시작! 자물쇠 찰칵 잠그기! (버튼 비활성화)
    setIsSubmitting(true); 

    let finalContent = content;
    if (images.length > 0) {
      const imageTags = images.map(url => `<img src="${url}" alt="첨부사진" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 15px;" />`).join('\n');
      finalContent = finalContent + '\n\n' + imageTags;
    }

    try {
      // 💡 [undefined] 에러를 없애기 위해 category: '일상' 을 몰래 넣어서 보냅니다!
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: finalContent, author, category: '일상' }), 
      });

      if (res.ok) {
        router.push('/board');
        router.refresh();
      } else {
        alert('글 등록에 실패했습니다.');
        setIsSubmitting(false); // 실패하면 다시 누를 수 있게 자물쇠 풀기
      }
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border p-6">
        <h1 className="text-2xl font-black text-[#3b4890] mb-8 border-b pb-4">✍️ 오재미 명품 글쓰기</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <input 
            placeholder="글쓴이 성함" 
            className="w-full p-3 border-2 border-gray-100 rounded-lg focus:border-[#3b4890] outline-none font-bold"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required 
          />
          <input 
            placeholder="제목을 입력하세요" 
            className="w-full p-3 border-2 border-gray-100 rounded-lg text-xl focus:border-[#3b4890] outline-none font-black"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required 
          />

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {/* 버튼 잠금 기능 추가 */}
              <label className={`flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer font-bold ${isUploading || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 transition-colors'}`}>
                <ImagePlus size={20} />
                <span>사진/움짤 추가</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={isUploading || isSubmitting} />
              </label>
              {isUploading && (
                <div className="flex items-center gap-2 text-[#3b4890] font-bold text-sm animate-pulse">
                  <Loader2 className="animate-spin" size={16} />
                  압축하며 올리는 중...
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
            {/* 💡 전송 중일 때 빙글빙글 도는 아이콘과 함께 버튼이 회색으로 변하며 잠깁니다! */}
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
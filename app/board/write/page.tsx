// @ts-nocheck 
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { Loader2, ImagePlus, X } from 'lucide-react';
import dynamic from 'next/dynamic';

// 💡 미나의 해결책: 고장 나던 구형 부품 대신, 최신 'react-quill-new' 부품으로 교체했습니다!
const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false, 
  loading: () => <div className="p-20 text-center font-bold text-gray-400">명품 에디터 로딩 중...🚀</div> 
});
import 'react-quill-new/dist/quill.snow.css';

export default function WritePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('일상'); 
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const router = useRouter();
  
  const quillRef = useRef<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentCat = params.get('category');
    if (currentCat) {
      setCategory(currentCat);
    }
  }, []);

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        alert(`[${file.name}] 용량이 너무 큽니다! (최대 10MB까지만 가능)\n쾌적한 사이트 환경을 위해 용량을 줄여주세요!`);
        return; 
      }

      setIsUploading(true);

      try {
        let fileToUpload = file;

        if (file.type !== 'image/gif' && file.type !== 'image/webp') {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          await new Promise((resolve) => { img.onload = resolve; });
          
          const isLongImage = img.height > img.width * 2; 
          URL.revokeObjectURL(img.src);

          if (!isLongImage) {
            const options = { maxSizeMB: 1.5, maxWidthOrHeight: 1920, useWebWorker: true };
            fileToUpload = await imageCompression(file, options);
          }
        }
        
        const ticketRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: fileToUpload.name, contentType: fileToUpload.type }),
        });
        
        const { uploadUrl, publicUrl } = await ticketRes.json();

        if (uploadUrl) {
          await fetch(uploadUrl, {
            method: 'PUT',
            body: fileToUpload,
            headers: { 'Content-Type': fileToUpload.type },
          });
          
          const editor = quillRef.current.getEditor();
          const range = editor.getSelection();
          
          editor.insertEmbed(range.index, 'image', publicUrl);
          editor.setSelection(range.index + 1); 
        }
      } catch (error) {
        console.error('업로드 실패:', error);
        alert('사진 업로드 중 오류가 발생했습니다.');
      } finally {
        setIsUploading(false);
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'], 
        [{ 'color': [] }, { 'background': [] }],   
        [{ 'align': [] }],                         
        ['image', 'video'],                        
        ['clean']
      ],
      handlers: {
        image: imageHandler, 
      }
    }
  }), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content || content === '<p><br></p>') {
      alert('내용을 입력해주세요!');
      return;
    }

    if (isUploading || isSubmitting) return;
    setIsSubmitting(true); 

    const cleanTitle = title.replace(/^\[.*?\]\s*/, '');
    const finalTitle = `[${category}] ${cleanTitle}`;

    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: finalTitle, content: content, author, category }), 
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
    <div className="min-h-screen bg-white font-sans text-gray-800">
      <style dangerouslySetInnerHTML={{__html: `
        .ql-editor { min-height: 500px; font-size: 1.125rem; line-height: 1.8; }
        .ql-editor img { max-width: 100%; height: auto; display: block; margin: 15px auto; border-radius: 8px; }
      `}} />

      <div className="max-w-6xl mx-auto p-4 md:p-6 mt-4 mb-20">
        
        <h1 className="text-2xl font-black text-[#3b4890] mb-6 border-b-2 border-gray-800 pb-2 flex items-center gap-2">
          ✍️ [{category}] 게시판에 시원하게 글쓰기
          {isUploading && <span className="text-sm font-bold text-red-500 animate-pulse">(사진 업로드 중... 잠시만 기다려주세요!)</span>}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            placeholder="글쓴이 닉네임" 
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

          <div className="bg-white border border-gray-300 rounded overflow-hidden">
            <ReactQuill 
              ref={quillRef}
              theme="snow" 
              modules={modules}
              value={content} 
              onChange={setContent} 
              placeholder="여기에 글을 쓰고, 상단의 🖼️(사진) 버튼을 눌러 중간중간 짤방을 넣어보세요!"
            />
          </div>

          <div className="flex gap-2 pt-4 mt-8">
            <button type="button" onClick={() => router.back()} disabled={isSubmitting} className="px-8 py-4 bg-gray-200 text-gray-800 rounded font-bold hover:bg-gray-300 disabled:opacity-50 transition-colors">
              취소
            </button>
            <button type="submit" disabled={isUploading || isSubmitting} className="flex-1 py-4 bg-[#3b4890] text-white rounded font-black text-lg hover:bg-[#222b5c] transition-all disabled:bg-gray-400 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="animate-spin" size={20} />}
              {isSubmitting ? '명품 글 서버로 쏘는 중...' : isUploading ? '사진 업로드 대기 중...' : '명품 글 등록하기 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// @ts-nocheck 
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

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
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const router = useRouter();
  
  const quillRef = useRef<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentCat = params.get('category');
    if (currentCat && currentCat !== 'all') {
      setCategory(currentCat);
    }

    import('react-quill-new').then((RQ) => {
      const Quill = RQ.Quill;
      if (Quill) {
        const BlockEmbed = Quill.import('blots/block/embed');
        class CustomVideo extends BlockEmbed {
          static create(value) {
            let node = super.create();
            node.setAttribute('controls', 'true');
            node.setAttribute('src', value);
            node.setAttribute('style', 'width: 100%; max-width: 800px; display: block; margin: 15px auto; border-radius: 8px; background: #000;');
            return node;
          }
          static value(node) {
            return node.getAttribute('src');
          }
        }
        CustomVideo.blotName = 'video';
        CustomVideo.tagName = 'VIDEO';
        Quill.register(CustomVideo, true);
      }
    });
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
        alert(`[${file.name}] 용량이 너무 큽니다! (최대 10MB)`);
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
          await fetch(uploadUrl, { method: 'PUT', body: fileToUpload, headers: { 'Content-Type': fileToUpload.type } });
          const editor = quillRef.current.getEditor();
          const range = editor.getSelection();
          editor.insertEmbed(range.index, 'image', publicUrl);
          editor.setSelection(range.index + 1); 
        }
      } catch (error) {
        alert('사진 업로드 중 오류가 발생했습니다.');
      } finally {
        setIsUploading(false);
      }
    };
  };

  const videoHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'video/mp4,video/webm'); 
    input.click();

    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (!file) return;

      if (file.size > 50 * 1024 * 1024) {
        alert(`[${file.name}] 용량이 너무 큽니다! (최대 50MB까지만 가능)`);
        return; 
      }

      setIsUploading(true);

      try {
        const ticketRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
        });
        
        const { uploadUrl, publicUrl } = await ticketRes.json();
        if (uploadUrl) {
          await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
          const editor = quillRef.current.getEditor();
          const range = editor.getSelection();
          editor.insertEmbed(range.index, 'video', publicUrl);
          editor.setSelection(range.index + 1); 
        }
      } catch (error) {
        alert('동영상 업로드 중 오류가 발생했습니다.');
      } finally {
        setIsUploading(false);
      }
    };
  };

  // 💡 미나의 핵심 마법: 메뉴 순서 전면 재배치! (사진/영상을 맨 앞으로 뺐습니다!)
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        ['image', 'video'],                        // 🖼️ 사진 & 🎬 동영상 (VIP석 1열 배치!)
        [{ 'header': [1, 2, 3, false] }],          // 글자 크기
        ['bold', 'italic', 'underline', 'strike'], // 글자 굵기, 기울임 등
        [{ 'color': [] }, { 'background': [] }],   // 글자 색상, 형광펜
        [{ 'align': [] }],                         // 정렬
        ['clean']                                  // 서식 지우기
      ],
      handlers: { 
        image: imageHandler,
        video: videoHandler 
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

    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title, content: content, author: author, category: category }), 
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
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <style dangerouslySetInnerHTML={{__html: `
        /* 💡 네이버 블로그 스타일의 세련된 에디터 CSS 마법! */
        .ql-editor { min-height: 500px; font-size: 1.05rem; line-height: 1.8; }
        .ql-editor img { max-width: 100%; height: auto; display: block; margin: 15px auto; border-radius: 8px; }
        .ql-editor .ql-video { width: 100%; max-width: 800px; height: 450px; display: block; margin: 15px auto; border-radius: 8px; background: #000; border: none; }
        @media (max-width: 768px) { .ql-editor .ql-video { height: 250px; } }
        
        /* 툴바(메뉴)를 조금 더 넓고 쾌적하게, 버튼 크기도 살짝 키웠습니다! */
        .ql-toolbar.ql-snow { background-color: #f8f9fa; padding: 12px 15px; border-radius: 4px 4px 0 0; border-color: #d1d5db; }
        .ql-container.ql-snow { border-radius: 0 0 4px 4px; border-color: #d1d5db; }
        .ql-toolbar.ql-snow .ql-formats { margin-right: 20px; }
        .ql-snow.ql-toolbar button { margin-right: 5px; }
      `}} />

      <div className="max-w-6xl mx-auto p-4 md:p-6 mt-6 mb-20 bg-white border border-gray-200 shadow-sm rounded-sm">
        
        <h1 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-300 pb-3 flex items-center gap-2">
          글쓰기
          {isUploading && <span className="text-sm font-bold text-red-500 animate-pulse ml-4">(미디어 파일 업로드 중...)</span>}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="p-3 border border-gray-300 rounded-sm focus:border-gray-500 outline-none font-bold bg-white text-gray-700 w-full md:w-40"
            >
              <option value="일상">일상</option>
              <option value="유머">유머</option>
              <option value="감동">감동</option>
              <option value="공포">공포</option>
              <option value="그냥 혼잣말">그냥 혼잣말</option>
              <option value="핫뉴스">핫뉴스</option>
            </select>

            <input 
              placeholder="시원하게 제목을 입력하세요!" 
              className="flex-1 p-3 border border-gray-300 rounded-sm focus:border-gray-500 outline-none font-bold text-gray-900"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required 
            />
            
            <input 
              placeholder="글쓴이" 
              className="w-full md:w-48 p-3 border border-gray-300 rounded-sm focus:border-gray-500 outline-none font-bold text-gray-800"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              required 
            />
          </div>

          <div className="bg-white rounded-sm mt-4">
            <ReactQuill 
              ref={quillRef}
              theme="snow" 
              modules={modules}
              value={content} 
              onChange={setContent} 
              placeholder="여기에 내용을 작성해주세요. 상단 메뉴의 🖼️ (사진) 또는 🎬 (동영상) 아이콘으로 미디어를 먼저 추가해 보세요!"
            />
          </div>

          <div className="mt-3 text-center bg-gray-50 border border-gray-200 p-3 rounded-sm">
            <p className="text-[13px] font-bold text-gray-500 leading-relaxed">
              🚨 <span className="text-red-500">불법촬영물 및 아동·청소년 성착취 영상, 저작권 또는 사생활 침해 등의 영상은</span><br className="hidden md:block" />
              관련 법률 및 이용약관에 따라 제재를 받을 수 있습니다.
            </p>
          </div>

          <div className="flex justify-center gap-2 pt-6 border-t border-gray-100 mt-4">
            <button type="button" onClick={() => router.back()} disabled={isSubmitting} className="px-8 py-3 bg-white border border-gray-300 text-gray-700 rounded-sm font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors">
              취소
            </button>
            <button type="submit" disabled={isUploading || isSubmitting} className="px-12 py-3 bg-[#414a66] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-all disabled:bg-gray-400 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="animate-spin" size={18} />}
              {isSubmitting ? '등록 중...' : isUploading ? '파일 대기...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
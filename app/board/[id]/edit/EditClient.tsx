// @ts-nocheck
'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// 💡 [미나 수정 1] TS 에러를 완벽하게 없애주는 ReactQuill 래퍼 컴포넌트 이식
const ReactQuillWrapper = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill-new');
    return function Comp({ forwardedRef, ...props }: any) {
      return <RQ ref={forwardedRef} {...props} />;
    };
  },
  {
    ssr: false,
    loading: () => <div className="p-20 text-center font-bold text-gray-400">에디터 로딩 중...</div>
  }
);
import 'react-quill-new/dist/quill.snow.css';

export default function EditClient({ post, updateAction }: { post: any, updateAction: any }) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const quillRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import('react-quill-new').then((RQ) => {
      const Quill = RQ.Quill;
      if (Quill) {
        const BlockEmbed = Quill.import('blots/block/embed') as any;
        
        class CustomVideo extends BlockEmbed {
          static blotName = 'mp4Video';
          static tagName = 'VIDEO';
          
          static create(value: any) {
            let node = super.create();
            node.setAttribute('controls', 'true');
            node.setAttribute('src', value);
            node.setAttribute('preload', 'metadata');
            node.style.display = 'block';
            node.style.width = '100%';
            node.style.maxWidth = '800px';
            node.style.margin = '10px auto 30px auto'; 
            node.style.borderRadius = '8px';
            node.style.backgroundColor = '#000';
            return node;
          }
          static value(node: any) {
            return node.getAttribute('src');
          }
        }
        Quill.register(CustomVideo, true);

        // 💡 [미나 수정 2] 유튜브 전용 iframe 강제 생성 블롯 이식
        class YoutubeVideo extends BlockEmbed {
          static blotName = 'youtubeVideo';
          static tagName = 'IFRAME';
          static create(value: any) {
            let node = super.create();
            node.setAttribute('src', value);
            node.setAttribute('frameborder', '0');
            node.setAttribute('allowfullscreen', 'true');
            node.setAttribute('class', 'ql-video');
            node.style.display = 'block';
            node.style.width = '100%';
            node.style.maxWidth = '800px';
            node.style.aspectRatio = '16/9';
            node.style.margin = '10px auto 30px auto';
            node.style.borderRadius = '8px';
            return node;
          }
          static value(node: any) { return node.getAttribute('src'); }
        }
        Quill.register(YoutubeVideo, true);

        const icons = Quill.import('ui/icons') as any;
        icons['undo'] = `<svg viewBox="0 0 18 18"><polygon class="ql-fill ql-stroke" points="6 10 4 12 2 10 6 10"></polygon><path class="ql-stroke" d="M8.09,13.91A4.6,4.6,0,0,0,9,14,5,5,0,1,0,4,9"></path></svg>`;
        icons['redo'] = `<svg viewBox="0 0 18 18"><polygon class="ql-fill ql-stroke" points="12 10 14 12 16 10 12 10"></polygon><path class="ql-stroke" d="M9.91,13.91A4.6,4.6,0,0,1,9,14a5,5,0,1,1,5-5"></path></svg>`;
      }
    });
  }, []);

  useEffect(() => {
    setTimeout(() => {
      const addTooltip = (className: string, title: string) => {
        const btns = document.querySelectorAll(className);
        btns.forEach(btn => btn.setAttribute('title', title));
      };
      addTooltip('.ql-image', '사진 첨부 (PC 업로드)');
      addTooltip('.ql-video', '동영상 첨부 (PC 업로드)');
    }, 1000); 
  }, []);

  const processAndUploadImages = async (fileArray: File[]) => {
    if (!quillRef.current) return;
    setIsUploading(true);
    const editor = quillRef.current.getEditor();
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      if (!file.type.startsWith('image/')) continue;
      
      if (file.size > 10 * 1024 * 1024) {
        alert(`[${file.name}] 사진 용량이 너무 큽니다 (최대 10MB).`);
        continue; 
      }

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
          const range = editor.getSelection(true) || { index: editor.getLength() };
          editor.insertEmbed(range.index, 'image', publicUrl);
          editor.insertText(range.index + 1, '\n');
          editor.setSelection(range.index + 2); 
        }
      } catch (error) {
        console.error('업로드 에러:', error);
        alert('이미지 업로드 중 오류가 발생했습니다.');
      }
    }
    
    setIsUploading(false); 
  };

  const uploadImagesRef = useRef(processAndUploadImages);
  useEffect(() => {
    uploadImagesRef.current = processAndUploadImages;
  });

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handleNativePaste = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // 💡 [미나 수정 3] 유튜브 주소 Ctrl+V 시 자동으로 텍스트 링크와 16:9 영상 출력
      const text = clipboardData.getData('text/plain');
      if (text) {
        const ytRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = text.trim().match(ytRegex);
        
        if (match) {
          e.preventDefault();
          e.stopPropagation();
          
          const embedUrl = `https://www.youtube.com/embed/${match[1]}`;
          const editor = quillRef.current.getEditor();
          const range = editor.getSelection(true) || { index: editor.getLength() };
          
          editor.insertText(range.index, text.trim(), 'link', text.trim());
          editor.insertText(range.index + text.trim().length, '\n');
          editor.insertEmbed(range.index + text.trim().length + 1, 'youtubeVideo', embedUrl);
          editor.insertText(range.index + text.trim().length + 2, '\n');
          editor.setSelection(range.index + text.trim().length + 3);
          return;
        }
      }

      // 기존 이미지 붙여넣기 로직
      const items = clipboardData.items;
      let hasImage = false;
      const imageFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          hasImage = true;
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (hasImage && imageFiles.length > 0) {
        e.preventDefault(); 
        e.stopPropagation();
        uploadImagesRef.current(imageFiles); 
      }
    };

    container.addEventListener('paste', handleNativePaste, true);
    return () => container.removeEventListener('paste', handleNativePaste, true);
  }, []);

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.setAttribute('multiple', 'true'); 
    input.click();

    input.onchange = async () => {
      const files = input.files;
      if (!files || files.length === 0) return;
      await processAndUploadImages(Array.from(files));
    };
  };

  const videoFileHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'video/mp4,video/webm'); 
    input.click();

    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        alert(`[${file.name}] 동영상 용량이 초과되었습니다 (최대 10MB).`);
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
          const range = editor.getSelection(true) || { index: editor.getLength() };
          editor.insertEmbed(range.index, 'mp4Video', publicUrl);
          
          editor.insertText(range.index + 1, '\n');
          editor.setSelection(range.index + 2);
        }
      } catch (error) {
        alert('동영상 업로드 중 오류가 발생했습니다.');
      } finally {
        setIsUploading(false);
      }
    };
  };

  const modules = useMemo(() => ({
    history: { delay: 500, maxStack: 100, userOnly: true },
    toolbar: {
      container: [
        ['image', 'video'], // 💡 링크 아이콘 영구 삭제!
        ['link'],                                       
        ['undo', 'redo'],                                       
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],                    
        [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }], 
        ['bold', 'italic', 'underline', 'strike'],                    
        [{ 'color': [] }, { 'background': [] }],                      
        [{ 'align': [] }],                                            
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],                
        ['blockquote', 'code-block'],                                 
        ['clean']                                                     
      ],
      handlers: { 
        image: imageHandler,
        video: videoFileHandler, // PC 영상 업로드만 유지
        undo: function() { this.quill.history.undo(); },
        redo: function() { this.quill.history.redo(); }
      }
    }
  }), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || content === '<p><br></p>') {
      alert('내용을 작성해 주십시오.');
      return;
    }

    if (content.includes('data:image/')) {
      alert('기존에 등록된 용량 초과 텍스트 이미지(Base64)가 남아있습니다.\n해당 이미지를 에디터에서 지운 뒤 다시 붙여넣어 주시면 정상 등록됩니다.');
      return;
    }

    if (isUploading || isSubmitting) return;
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);

    const result = await updateAction(formData);
    
    if (result && result.error) {
      alert('수정 중 서버 오류가 발생했습니다.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <style dangerouslySetInnerHTML={{__html: `
        .ql-container.ql-snow {
          height: 600px;
          border-radius: 0 0 6px 6px;
          border-color: #d1d5db;
        }
        @media (max-width: 768px) {
          .ql-container.ql-snow { height: 450px; }
        }
        .ql-editor { font-size: 1.05rem; line-height: 1.8; }
        .ql-editor img { max-width: 100%; height: auto; border-radius: 8px; display: inline-block; vertical-align: top; }
        
        .ql-editor video, .ql-editor iframe.ql-video { 
          width: 100%; max-width: 800px; height: auto; aspect-ratio: 16/9; 
          border-radius: 8px; background: #000; border: none; 
          display: block; margin: 10px auto 30px auto !important; 
        }
        
        @media (max-width: 768px) { .ql-editor video, .ql-editor iframe.ql-video { aspect-ratio: 16/9; height: auto; } }
        .ql-toolbar.ql-snow {
          background-color: #f8f9fa;
          padding: 12px 15px;
          border-radius: 6px 6px 0 0;
          border: 1px solid #d1d5db;
          border-bottom: 2px solid #414a66;
          box-shadow: inset 0 -1px 0 rgba(0,0,0,0.05);
        }
        .ql-toolbar.ql-snow .ql-formats { margin-right: 15px; margin-bottom: 5px; }
        button.ql-undo, button.ql-redo { cursor: pointer; }
        button.ql-undo:hover, button.ql-redo:hover { color: #3b4890; }
      `}} />

      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-gray-800">게시글 수정</h2>
        {isUploading && <span className="text-sm font-medium text-gray-500">(업로드 처리 중...)</span>}
      </div>

      <div className="flex flex-col gap-3">
        <input
          placeholder="제목을 입력하세요"
          className="w-full p-3 border border-gray-300 rounded-sm focus:border-gray-500 outline-none font-bold text-gray-900"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="bg-white rounded-sm mt-4" ref={editorContainerRef}>
        {/* 💡 [미나 수정 4] 위에서 만든 래퍼로 교체하여 TS 에러 완벽 방어! */}
        <ReactQuillWrapper
          forwardedRef={quillRef}
          theme="snow"
          modules={modules}
          value={content}
          onChange={setContent}
          placeholder="내용을 수정해 주십시오. 유튜브 영상은 주소를 이곳에 붙여넣기(Ctrl+V) 하시면 자동으로 추가됩니다."
        />
      </div>

      <div className="flex justify-end gap-2 pt-6 border-t border-gray-100 mt-4">
        <button type="button" onClick={() => router.back()} disabled={isSubmitting} className="px-8 py-3 bg-white border border-gray-300 text-gray-700 rounded-sm font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors">
          취소
        </button>
        <button type="submit" disabled={isUploading || isSubmitting} className="px-12 py-3 bg-[#414a66] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-all disabled:bg-gray-400 flex items-center justify-center gap-2">
          {isSubmitting && <Loader2 className="animate-spin" size={18} />}
          {isSubmitting ? '수정 중...' : isUploading ? '파일 대기...' : '수정 완료'}
        </button>
      </div>
    </form>
  );
}
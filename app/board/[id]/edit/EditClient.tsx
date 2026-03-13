// @ts-nocheck 
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const ReactQuillWrapper = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill-new');
    return function Comp({ forwardedRef, ...props }: any) {
      return <RQ ref={forwardedRef} {...props} />;
    };
  },
  { ssr: false }
);
import 'react-quill-new/dist/quill.snow.css';

export default function EditClient({ currentUser, post, isAdmin, isGlobalLocked, boards, updateAction }: any) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(post?.content || '');
  const [category, setCategory] = useState('흥미로운 이야기'); 
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [isEditorReady, setIsEditorReady] = useState(false);
  const router = useRouter();
  
  const quillRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isGlobalLocked && !isAdmin) {
      alert("🚨 현재 관리자에 의해 사이트 전체 글쓰기 및 수정이 제한되었습니다.");
      router.push(`/board/${post.id}`);
      return;
    }

    if (post?.title) {
      const match = post.title.match(/^\[(.*?)\]\s*(.*)$/);
      if (match) {
        setCategory(match[1]);
        setTitle(match[2]);
      } else {
        setTitle(post.title);
      }
    }

    import('react-quill-new').then((RQ) => {
      const Quill = RQ.Quill;
      if (Quill) {
        // 💡 폰트 등록 (나눔고딕을 화이트리스트에서 빼고 기본으로 처리)
        const Font = Quill.import('formats/font');
        Font.whitelist = ['pretendard', 'notosanskr', 'gowundodum', 'hahmlet'];
        Quill.register(Font, true);

        // 💡 숫자 사이즈 등록
        const Size = Quill.import('attributors/style/size');
        Size.whitelist = ['10px', '12px', '14px', '15px', '16px', '18px', '20px', '24px', '30px', '36px'];
        Quill.register(Size, true);

        const BlockEmbed = Quill.import('blots/block/embed') as any;
        
        class CustomVideo extends BlockEmbed {
          static blotName = 'mp4Video';
          static tagName = 'VIDEO';
          static className = 'ojemi-mp4';
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
          static value(node: any) { return node.getAttribute('src'); }
        }
        Quill.register(CustomVideo, true);

        class YoutubeVideo extends BlockEmbed {
          static blotName = 'youtubeVideo';
          static tagName = 'IFRAME';
          static className = 'ojemi-youtube';
          static create(value: any) {
            let node = super.create();
            node.setAttribute('src', value);
            node.setAttribute('frameborder', '0');
            node.setAttribute('allowfullscreen', 'true');
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
      setIsEditorReady(true);
    });
  }, [post, isGlobalLocked, isAdmin, router]);

  const processAndUploadImages = async (fileArray: File[]) => {
    if (!quillRef.current) return;
    setIsUploading(true);
    const editor = quillRef.current.getEditor();
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 10 * 1024 * 1024) continue; 
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
      } catch (error) {}
    }
    setIsUploading(false); 
  };

  const uploadImagesRef = useRef(processAndUploadImages);
  useEffect(() => { uploadImagesRef.current = processAndUploadImages; });

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handleNativePaste = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

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
          
          editor.insertEmbed(range.index, 'youtubeVideo', embedUrl);
          editor.insertText(range.index + 1, '\n');
          editor.setSelection(range.index + 2);
          return;
        }
      }

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
      } finally {
        setIsUploading(false);
      }
    };
  };

  const modules = useMemo(() => ({
    history: { delay: 500, maxStack: 100, userOnly: true },
    toolbar: {
      container: [
        ['image', 'video', 'link'], 
        // 💡 [나눔고딕 기본화] false 자리가 디폴트 폰트(나눔고딕)를 의미합니다!
        [{ 'font': [false, 'pretendard', 'notosanskr', 'gowundodum', 'hahmlet'] }],
        [{ 'size': ['10px', '12px', '14px', '15px', false, '18px', '20px', '24px', '30px', '36px'] }], 
        [{ 'header': [1, 2, 3, 4, false] }], 
        ['bold', 'italic', 'underline', 'strike'], 
        [{ 'color': [] }, { 'background': [] }], 
        [{ 'align': [] }], 
        [{ 'list': 'ordered'}, { 'list': 'bullet' }], 
        ['blockquote', 'code-block'], 
        ['clean'], 
        ['undo', 'redo'] 
      ],
      handlers: { 
        image: imageHandler,
        video: videoFileHandler, 
        undo: function() { this.quill.history.undo(); },
        redo: function() { this.quill.history.redo(); }
      }
    }
  }), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const targetBoard = boards?.find((b: any) => b.name === category);
    if (targetBoard?.is_write_locked && !isAdmin) {
      alert(`🚨 해당 [${category}] 게시판은 현재 관리자에 의해 수정이 잠겨있습니다.`); return;
    }

    if (!content || content === '<p><br></p>') {
      alert('내용을 작성해 주십시오.'); return;
    }
    if (content.includes('data:image/')) {
      alert('게시글에 용량을 초과하는 텍스트 이미지(Base64)가 포함되어 있습니다.\n해당 이미지를 삭제하신 후 다시 첨부해 주십시오.'); return;
    }
    if (isUploading || isSubmitting) return;
    setIsSubmitting(true); 

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('category', category);

      const res = await updateAction(formData);
      
      if (res && res.error) {
        alert(res.error);
        setIsSubmitting(false);
      } else {
        router.push(`/board/${post.id}`);
      }
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  const groupedBoards = boards?.reduce((acc: any, board: any) => {
    if (!acc[board.group_name]) acc[board.group_name] = [];
    acc[board.group_name].push(board);
    return acc;
  }, {}) || {};

  if (isGlobalLocked && !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        @import url('https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Hahmlet:wght@400;700&family=Nanum+Gothic:wght@400;700&family=Noto+Sans+KR:wght@400;700&display=swap');

        .ql-font-pretendard { font-family: 'Pretendard', sans-serif; }
        .ql-font-notosanskr { font-family: 'Noto Sans KR', sans-serif; }
        .ql-font-gowundodum { font-family: 'Gowun Dodum', sans-serif; }
        .ql-font-hahmlet { font-family: 'Hahmlet', serif; }

        /* 💡 에디터 전체에 나눔고딕을 촥! 깔아줍니다 */
        .ql-container { font-family: 'Nanum Gothic', sans-serif; font-size: 16px; }
        .ql-editor { line-height: 1.8; min-height: 500px; }
        
        .ql-snow .ql-picker.ql-font { width: 130px; }
        
        /* 💡 아무것도 안 골랐을 때(기본값) 툴바에 '나눔고딕' 표시 */
        .ql-snow .ql-picker.ql-font .ql-picker-label::before, .ql-snow .ql-picker.ql-font .ql-picker-item::before { content: '나눔고딕'; font-family: 'Nanum Gothic'; }
        
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="pretendard"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="pretendard"]::before { content: '프리텐다드'; font-family: 'Pretendard'; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="notosanskr"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="notosanskr"]::before { content: '본고딕'; font-family: 'Noto Sans KR'; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="gowundodum"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="gowundodum"]::before { content: '고운돋움'; font-family: 'Gowun Dodum'; }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="hahmlet"]::before, .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="hahmlet"]::before { content: '함초롬체'; font-family: 'Hahmlet'; }

        .ql-snow .ql-picker.ql-size { width: 70px; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="10px"]::before, .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="10px"]::before { content: '10'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="12px"]::before, .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="12px"]::before { content: '12'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="14px"]::before, .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="14px"]::before { content: '14'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="15px"]::before, .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="15px"]::before { content: '15'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="18px"]::before, .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="18px"]::before { content: '18'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="20px"]::before, .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="20px"]::before { content: '20'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="24px"]::before, .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="24px"]::before { content: '24'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="30px"]::before, .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="30px"]::before { content: '30'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="36px"]::before, .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="36px"]::before { content: '36'; }
        .ql-snow .ql-picker.ql-size .ql-picker-label::before, .ql-snow .ql-picker.ql-size .ql-picker-item::before { content: '16'; } 

        .ql-editor img { max-width: 100%; height: auto; border-radius: 8px; display: inline-block; vertical-align: top; }
        .ql-editor video.ojemi-mp4, .ql-editor iframe.ojemi-youtube { width: 100%; max-width: 800px; height: auto; aspect-ratio: 16/9; border-radius: 8px; background: #000; border: none; display: block; margin: 10px auto 30px auto !important; }
        @media (max-width: 768px) { .ql-editor video.ojemi-mp4, .ql-editor iframe.ojemi-youtube { aspect-ratio: 16/9; height: auto; } }
        
        .ql-toolbar.ql-snow { background-color: #fdfdfd; padding: 12px 15px; border-radius: 6px 6px 0 0; border: 1px solid #d1d5db; border-bottom: 2px solid #414a66; }
      `}} />

      <div className="max-w-6xl mx-auto p-4 md:p-6 mt-6 mb-20 bg-white border border-gray-200 shadow-sm rounded-sm">
        <h1 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-300 pb-3 flex items-center gap-2">
          글 수정하기 {isUploading && <span className="text-sm font-medium text-gray-500 ml-4">(업로드 처리 중...)</span>}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="p-3 border border-gray-300 rounded-sm outline-none font-bold bg-white text-gray-700 w-full md:w-56 shadow-sm">
              {Object.keys(groupedBoards).length > 0 ? (
                Object.keys(groupedBoards).map((groupName) => (
                  <optgroup key={groupName} label={groupName}>
                    {groupedBoards[groupName].map((b: any) => (
                      <option key={b.name} value={b.name} disabled={b.is_write_locked && !isAdmin}>
                        {b.name} {b.is_write_locked && !isAdmin ? ' 🔒 (잠김)' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))
              ) : (
                <option value="일반">게시판을 불러오는 중...</option>
              )}
            </select>
            <input placeholder="제목을 입력하세요." className="flex-1 p-3 border border-gray-300 rounded-sm font-bold text-gray-900" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <div className="w-full md:w-48 p-3 border border-gray-200 bg-gray-50 rounded-sm flex items-center font-bold text-gray-600">
              {currentUser} {isAdmin && <span className="text-xs text-red-500 ml-1">(Admin)</span>}
            </div>
          </div>

          <div className="bg-white rounded-sm mt-4 border border-gray-300 overflow-hidden" ref={editorContainerRef}>
            {isEditorReady ? (
              <ReactQuillWrapper forwardedRef={quillRef} theme="snow" modules={modules} value={content} onChange={setContent} placeholder="내용을 작성해 주십시오. 유튜브 영상은 주소를 이곳에 붙여넣기(Ctrl+V) 하시면 자동으로 추가됩니다." />
            ) : (
              <div className="h-[600px] flex items-center justify-center bg-gray-50 text-gray-400 font-bold text-lg animate-pulse">
                기존 게시글을 불러오는 중입니다...
              </div>
            )}
          </div>

          <div className="flex justify-center gap-2 pt-6 border-t border-gray-100 mt-4">
            <button type="button" onClick={() => router.back()} disabled={isSubmitting} className="px-8 py-3 bg-white border border-gray-300 text-gray-700 rounded-sm font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors">취소</button>
            <button type="submit" disabled={isUploading || isSubmitting || !isEditorReady} className="px-12 py-3 bg-[#414a66] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-all disabled:bg-gray-400 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="animate-spin" size={18} />}
              {isSubmitting ? '수정 중...' : isUploading ? '파일 대기...' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
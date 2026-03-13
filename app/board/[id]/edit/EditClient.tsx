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

// 💡 짝꿍(page.tsx)이 보내주는 무기들을 완벽하게 받도록 입구를 맞췄습니다!
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
    // 💡 1. 사이트 전체 셧다운 시 수정 화면에서 튕겨냅니다!
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
        const BlockEmbed = Quill.import('blots/block/embed') as any;
        const Video = Quill.import('formats/video') as any;


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
          static value(node: any) { return node.getAttribute('src'); }
        }
        Quill.register(CustomVideo, true);

        class YoutubeVideo extends Video {
          static blotName = 'video';
          static create(value: any) {
            let node = super.create(value);
            node.style.display = 'block';
            node.style.width = '100%';
            node.style.maxWidth = '800px';
            node.style.aspectRatio = '16/9';
            node.style.margin = '10px auto 30px auto';
            node.style.borderRadius = '8px';
            return node;
          }
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
      } catch (error) { }
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
        // 💡 2. 유튜브 꼬리표 허용 (텍스트 링크 없이 영상만 쏙!)
        const ytRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = text.trim().match(ytRegex);

        if (match) {
          e.preventDefault();
          e.stopPropagation();

          const embedUrl = `https://www.youtube.com/embed/${match[1]}`;
          const editor = quillRef.current.getEditor();
          const range = editor.getSelection(true) || { index: editor.getLength() };

          editor.insertEmbed(range.index, 'video', embedUrl);
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
        ['image', 'video'],
        ['link'],
        ['undo', 'redo'],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['blockquote', 'code-block'],
        ['clean']
      ],
      handlers: {
        image: imageHandler,
        video: videoFileHandler,
        undo: function () { this.quill.history.undo(); },
        redo: function () { this.quill.history.redo(); }
      }
    }
  }), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 💡 3. 개별 게시판 셧다운 시 수정 화면에서도 튕겨냅니다!
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
      // 💡 짝꿍(page.tsx)이 준 updateAction 을 사용해서 안전하게 저장!
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

  // 통제실 게시판 목록 예쁘게 그룹화
  const groupedBoards = boards?.reduce((acc: any, board: any) => {
    if (!acc[board.group_name]) acc[board.group_name] = [];
    acc[board.group_name].push(board);
    return acc;
  }, {}) || {};

  if (isGlobalLocked && !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <style dangerouslySetInnerHTML={{
        __html: `
        .ql-container.ql-snow { height: 600px; border-radius: 0 0 6px 6px; border-color: #d1d5db; }
        @media (max-width: 768px) { .ql-container.ql-snow { height: 450px; } }
        .ql-editor { font-size: 1.05rem; line-height: 1.8; }
        .ql-editor img { max-width: 100%; height: auto; border-radius: 8px; display: inline-block; vertical-align: top; }
        .ql-editor video, .ql-editor iframe.ql-video { width: 100%; max-width: 800px; height: auto; aspect-ratio: 16/9; border-radius: 8px; background: #000; border: none; display: block; margin: 10px auto 30px auto !important; }
        @media (max-width: 768px) { .ql-editor video, .ql-editor iframe.ql-video { aspect-ratio: 16/9; height: auto; } }
        .ql-toolbar.ql-snow { background-color: #f8f9fa; padding: 12px 15px; border-radius: 6px 6px 0 0; border: 1px solid #d1d5db; border-bottom: 2px solid #414a66; box-shadow: inset 0 -1px 0 rgba(0,0,0,0.05); }
        .ql-toolbar.ql-snow .ql-formats { margin-right: 15px; margin-bottom: 5px; }
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
// @ts-nocheck
'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="p-20 text-center font-bold text-gray-400">에디터 로딩 중...</div>
});
import 'react-quill-new/dist/quill.snow.css';

export default function EditClient({ post, updateAction }: { post: any, updateAction: any }) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const quillRef = useRef<any>(null);

  useEffect(() => {
    import('react-quill-new').then((RQ) => {
      const Quill = RQ.Quill;
      if (Quill) {
        const BlockEmbed = Quill.import('blots/block/embed') as any;
        class CustomVideo extends BlockEmbed {
          static blotName = 'video';
          static tagName = 'VIDEO';
          
          static create(value: any) {
            let node = super.create();
            node.setAttribute('controls', 'true');
            node.setAttribute('src', value);
            return node;
          }
          static value(node: any) {
            return node.getAttribute('src');
          }
        }
        Quill.register(CustomVideo, true);

        const icons = Quill.import('ui/icons') as any;
        icons['undo'] = `<svg viewBox="0 0 18 18"><polygon class="ql-fill ql-stroke" points="6 10 4 12 2 10 6 10"></polygon><path class="ql-stroke" d="M8.09,13.91A4.6,4.6,0,0,0,9,14,5,5,0,1,0,4,9"></path></svg>`;
        icons['redo'] = `<svg viewBox="0 0 18 18"><polygon class="ql-fill ql-stroke" points="12 10 14 12 16 10 12 10"></polygon><path class="ql-stroke" d="M9.91,13.91A4.6,4.6,0,0,1,9,14a5,5,0,1,1,5-5"></path></svg>`;
      }
    });
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

      setIsUploading(true);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.size > 10 * 1024 * 1024) {
          alert(`[${file.name}] 용량이 너무 큽니다. (최대 10MB) 이 파일은 제외됩니다.`);
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
            const editor = quillRef.current.getEditor();
            const range = editor.getSelection() || { index: editor.getLength() };
            editor.insertEmbed(range.index, 'image', publicUrl);
            editor.setSelection(range.index + 1);
          }
        } catch (error) {
          console.error('업로드 에러:', error);
          alert(`[${file.name}] 이미지 업로드 중 오류가 발생했습니다.`);
        }
      }

      setIsUploading(false);
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
        alert(`[${file.name}] 용량이 너무 큽니다. (최대 50MB)`);
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
          const range = editor.getSelection() || { index: editor.getLength() };
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

  const modules = useMemo(() => ({
    history: {
      delay: 500,
      maxStack: 100,
      userOnly: true
    },
    toolbar: {
      container: [
        ['image', 'video', 'link'],
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
        video: videoHandler,
        undo: function() { this.quill.history.undo(); },
        redo: function() { this.quill.history.redo(); }
      }
    }
  }), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || content === '<p><br></p>') {
      alert('내용을 입력해주세요.');
      return;
    }
    if (isUploading || isSubmitting) return;
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);

    // 💡 미나의 해결책: 브라우저가 화면 이동(Redirect) 에러를 낚아채지 못하게 방어막을 걷어냈습니다!
    const result = await updateAction(formData);
    
    // 만약 여기까지 코드가 살아서 내려왔다면(화면 이동이 안 되었다면), 서버에서 진짜 에러가 난 것입니다.
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
        .ql-editor video { width: 100%; max-width: 800px; height: auto; aspect-ratio: 16/9; border-radius: 8px; background: #000; border: none; display: inline-block; vertical-align: top; }
        @media (max-width: 768px) { .ql-editor video { aspect-ratio: 16/9; height: auto; } }
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

      <div className="flex flex-col gap-3">
        <input
          placeholder="제목을 입력하세요"
          className="w-full p-3 border border-gray-300 rounded-sm focus:border-gray-500 outline-none font-bold text-gray-900"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
          placeholder="내용을 수정해주세요."
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
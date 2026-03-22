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

const MAX_CONTENT_LENGTH = 65000;

export default function WriteClient({ currentUser, isAdmin, isGlobalLocked, boards, editorPlaceholder }: { currentUser: string, isAdmin: boolean, isGlobalLocked: boolean, boards: any[], editorPlaceholder?: string }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(boards && boards.length > 0 ? boards[0].name : '흥미로운 이야기'); 
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [isEditorReady, setIsEditorReady] = useState(false);
  
  const [botTrap, setBotTrap] = useState('');
  const [isNotice, setIsNotice] = useState(false);
  const router = useRouter();
  
  const quillRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isGlobalLocked && !isAdmin) {
      alert("🚨 현재 관리자에 의해 사이트 전체 글쓰기가 제한되었습니다.");
      router.push('/board');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const currentCat = params.get('category');
    if (currentCat && currentCat !== 'all') {
      setCategory(currentCat);
    }

    import('react-quill-new').then((RQ) => {
      const Quill = RQ.Quill;
      if (Quill) {
        const Font = Quill.import('formats/font');
        Font.whitelist = ['pretendard', 'notosanskr', 'gowundodum', 'hahmlet'];
        Quill.register(Font, true);

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
            node.setAttribute('playsinline', 'true');
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
  }, [isGlobalLocked, isAdmin, router]);

  const processAndUploadImages = async (fileArray: File[]) => {
    if (!quillRef.current) return;
    
    const editor = quillRef.current.getEditor();
    const currentImageCount = editor.root.querySelectorAll('img').length;
    if (currentImageCount + fileArray.length > 20) {
      alert(`🚨 사진은 게시글당 최대 20장까지만 첨부할 수 있습니다.\n(현재 ${currentImageCount}장 포함됨)`);
      return;
    }

    // 💡 [튕김 방지] 업로드 시작 전 커서 위치 저장!
    let currentSelection = editor.getSelection();
    let insertIndex = currentSelection ? currentSelection.index : editor.getLength();

    setIsUploading(true);
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      if (!file.type.startsWith('image/')) continue;
      
      try {
        let fileToUpload = file;
        let shouldCompress = true;
        let isUncompressibleAnim = false; 

        // 💡 [움짤 X-ray 판독기] GIF/WebP 파일 속 프레임 개수 세기!
        if (file.type === 'image/gif') {
          const buffer = await file.arrayBuffer();
          const arr = new Uint8Array(buffer);
          let frames = 0;
          for (let j = 0; j < arr.length - 2; j++) {
            if (arr[j] === 0x21 && arr[j + 1] === 0xF9 && arr[j + 2] === 0x04) {
              frames++;
              if (frames > 1) { 
                isUncompressibleAnim = true;
                shouldCompress = false; 
                break;
              }
            }
          }
        } else if (file.type === 'image/webp') {
          const buffer = await file.arrayBuffer();
          const arr = new Uint8Array(buffer);
          for (let j = 0; j < arr.length - 3; j++) {
            if (arr[j] === 65 && arr[j+1] === 78 && arr[j+2] === 73 && arr[j+3] === 77) { 
              isUncompressibleAnim = true;
              shouldCompress = false; 
              break;
            }
          }
        }

        // 🛡️ [용량 철벽 방어막] 진짜 움짤은 5MB 컷! / 일반 사진은 10MB 컷!
        const MAX_ANIM_SIZE = 5 * 1024 * 1024; 
        const MAX_IMAGE_SIZE = 10 * 1024 * 1024; 

        if (isUncompressibleAnim && file.size > MAX_ANIM_SIZE) {
          alert(`🚨 [${file.name}] 움직이는 움짤(GIF/WebP)은 서버 용량 보호를 위해 최대 5MB까지만 올릴 수 있습니다.\n용량을 줄이거나 MP4 동영상 파일로 첨부해 주십시오.`);
          continue; 
        } else if (!isUncompressibleAnim && file.size > MAX_IMAGE_SIZE) {
          alert(`🚨 [${file.name}] 사진 원본 용량이 너무 큽니다 (최대 10MB).\n용량을 줄인 후 다시 시도해 주십시오.`);
          continue; 
        }

        // 💡 [압축 로직 100% 보존] 화질 0.8 / 0.85, 해상도 1200 등 대장님 설정 완벽 유지!
        if (shouldCompress) {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          await new Promise((resolve) => { img.onload = resolve; });
          const isLongImage = img.height > img.width * 2; 
          URL.revokeObjectURL(img.src);
          
          try {
            const options = isLongImage 
              ? {
                  maxSizeMB: 1.5,
                  maxWidthOrHeight: undefined, 
                  useWebWorker: true,
                  initialQuality: 0.85, 
                  fileType: 'image/webp' 
                }
              : {
                  maxSizeMB: 0.3,
                  maxWidthOrHeight: 1200, 
                  useWebWorker: true,
                  initialQuality: 0.8,
                  fileType: 'image/webp'
                };
            
            const compressedBlob = await imageCompression(file, options);
            const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            fileToUpload = new File([compressedBlob], newFileName, { type: 'image/webp' });
            
          } catch (compressError) {
            console.warn("압축 중 오류 발생, 원본으로 폴백:", compressError);
            fileToUpload = file; 
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
          
          // 💡 [튕김 방지] 업로드가 완료되면 아까 외워둔 위치(insertIndex)에 얌전히 꽂아 넣습니다!
          editor.insertEmbed(insertIndex, 'image', publicUrl);
          editor.insertText(insertIndex + 1, '\n');
          insertIndex += 2; 
          editor.setSelection(insertIndex); 
        }
      } catch (error) {
        alert('이미지 업로드 중 오류가 발생했습니다.');
      }
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
        // 💡 [모바일 유튜브 해결 수술] 맨 앞의 '^' 기호를 제거해서, 스마트폰에서 주소 앞에 쓸데없는 글씨가 붙어와도 귀신같이 유튜브 주소만 뽑아냅니다!
        const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = text.trim().match(ytRegex);
        
        if (match) {
          e.preventDefault();
          e.stopPropagation();
          
          const embedUrl = `https://www.youtube.com/embed/${match[1]}`;
          const editor = quillRef.current.getEditor();
          
          // 복붙할 때 유튜브 영상도 커서 튕김 방지 적용!
          let currentSelection = editor.getSelection();
          let insertIndex = currentSelection ? currentSelection.index : editor.getLength();
          
          editor.insertEmbed(insertIndex, 'youtubeVideo', embedUrl);
          editor.insertText(insertIndex + 1, '\n');
          editor.setSelection(insertIndex + 2);
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
      
      const editor = quillRef.current.getEditor();
      
      const currentVideoCount = editor.root.querySelectorAll('video').length;
      if (currentVideoCount >= 4) {
        alert(`🚨 동영상은 게시글당 최대 4개까지만 첨부할 수 있습니다.`);
        return;
      }

      if (file.size > 4 * 1024 * 1024) {
        alert(`🚨 [${file.name}] 동영상 용량이 초과되었습니다 (최대 4MB).\n파일 크기를 줄인 후 다시 시도해 주십시오.`);
        return; 
      }

      // 💡 [동영상 튕김 방지 수술] 동영상도 업로드 직전에 커서 위치 미리 저장!
      let currentSelection = editor.getSelection();
      let insertIndex = currentSelection ? currentSelection.index : editor.getLength();

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
          
          editor.insertEmbed(insertIndex, 'mp4Video', publicUrl);
          editor.insertText(insertIndex + 1, '\n');
          editor.setSelection(insertIndex + 2);
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
        ['image', 'video', 'link'], 
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

  const handleContentChange = (newContent: string) => {
    const textOnly = newContent.replace(/<[^>]*>?/gm, ''); 
    
    if (textOnly.length > MAX_CONTENT_LENGTH) {
      alert(`🚨 게시글은 최대 ${MAX_CONTENT_LENGTH.toLocaleString()}자까지만 작성할 수 있습니다.\n현재 초과된 분량은 자동으로 삭제됩니다.`);
      if (quillRef.current) {
        const editor = quillRef.current.getEditor();
        editor.history.undo();
      }
      return;
    }
    setContent(newContent);
  };

  const currentLength = content.replace(/<[^>]*>?/gm, '').length;

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (isGlobalLocked && !isAdmin) {
      alert('🚨 현재 관리자에 의해 글쓰기가 전면 차단되었습니다.'); return;
    }
    const targetBoard = boards?.find((b: any) => b.name === category);
    if (targetBoard?.is_write_locked && !isAdmin) {
      alert(`🚨 해당 [${category}] 게시판은 현재 관리자에 의해 글쓰기가 잠겨있습니다.`); return;
    }

    if (!title.trim()) {
      alert('제목을 입력하세요.'); 
      return;
    }

    if (!content || content === '<p><br></p>') {
      alert('내용을 작성해 주십시오.'); return;
    }
    if (content.includes('data:image/')) {
      alert('게시글에 용량을 초과하는 텍스트 이미지(Base64)가 포함되어 있습니다.\n해당 이미지를 삭제하신 후 다시 첨부해 주십시오.'); return;
    }
    if (isUploading || isSubmitting) return;
    
    if (currentLength > MAX_CONTENT_LENGTH) {
      alert(`게시글 글자 수 제한(${MAX_CONTENT_LENGTH.toLocaleString()}자)을 초과했습니다.`); return;
    }

    setIsSubmitting(true); 

    try {
      const res = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title, content: content, author: currentUser, category: category, is_notice: isNotice, bot_trap: botTrap }), 
      });

      if (res.ok) {
        router.push(`/board?category=${category}`);
        router.refresh();
      } else {
        const errorData = await res.json().catch(() => null);
        if (errorData?.error === 'forbidden_word') {
          alert(`🚨 작성하신 글에 금지된 단어 [ ${errorData.word} ]가 포함되어 있습니다.\n특수문자나 띄어쓰기로 우회해도 모두 감지되니 건전한 커뮤니티 문화를 위해 수정해 주십시오.`);
        } else {
          alert('글 등록에 실패했습니다.');
        }
        setIsSubmitting(false);
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다.');
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
        @import url('https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Hahmlet:wght@400;700&family=Nanum+Gothic:wght@400;700&display=swap');

        .ql-font-pretendard { font-family: 'Pretendard', sans-serif; }
        .ql-font-notosanskr { font-family: 'Noto Sans KR', sans-serif; }
        .ql-font-gowundodum { font-family: 'Gowun Dodum', sans-serif; }
        .ql-font-hahmlet { font-family: 'Hahmlet', serif; }

        .ql-container { font-family: 'Nanum Gothic', sans-serif; font-size: 16px; }
        .ql-editor { line-height: 1.8; min-height: 500px; }
        
        .ql-snow .ql-picker.ql-font { width: 130px; }
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
        .ql-editor video.ojemi-mp4, .ql-editor iframe.ojemi-youtube { width: 100%; max-width: 800px; height: auto; aspect-ratio: 16/9; border-radius: 8px; background: #000; border: none; display: block; margin: 10px auto 30px auto !important; object-fit: contain; }
        @media (max-width: 768px) { .ql-editor video.ojemi-mp4, .ql-editor iframe.ojemi-youtube { aspect-ratio: 16/9; height: auto; max-height: 70vh; } }
        
        .ql-toolbar.ql-snow { position: sticky; top: 0; z-index: 50; background-color: #fdfdfd; padding: 12px 15px; border-radius: 6px 6px 0 0; border: 1px solid #d1d5db; border-bottom: 2px solid #414a66; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
      `}} />

      <div className="max-w-6xl mx-auto p-4 md:p-6 mt-6 mb-20 bg-white border border-gray-200 shadow-sm rounded-sm">
        <h1 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-300 pb-3 flex items-center gap-2">
          글쓰기 {isUploading && <span className="text-sm font-medium text-gray-500 ml-4">(업로드 처리 중...)</span>}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="absolute opacity-0 -z-50 h-0 w-0 overflow-hidden" aria-hidden="true">
            <label htmlFor="ojemi_secret_trap">웹사이트 주소 (사람은 비워두세요)</label>
            <input 
              type="text" 
              id="ojemi_secret_trap" 
              name="ojemi_secret_trap" 
              value={botTrap} 
              onChange={(e) => setBotTrap(e.target.value)} 
              tabIndex={-1} 
              autoComplete="off" 
            />
          </div>

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
            <div className="w-full md:w-48 p-3 border border-gray-200 bg-gray-50 rounded-sm flex items-center justify-between font-bold text-gray-600">
              <div>{currentUser} {isAdmin && <span className="text-xs text-red-500 ml-1">(Admin)</span>}</div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 px-1 py-2 bg-indigo-50 border border-indigo-100 rounded-sm mt-1">
              <input 
                type="checkbox" 
                id="is_notice" 
                checked={isNotice} 
                onChange={(e) => setIsNotice(e.target.checked)}
                className="w-4 h-4 ml-2 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-600 cursor-pointer"
              />
              <label htmlFor="is_notice" className="text-[13px] font-black text-indigo-700 cursor-pointer flex items-center gap-1.5 select-none">
                <span className="text-base">📢</span> 이 글을 모든 게시판 최상단에 강제 고정합니다 (공지사항)
              </label>
            </div>
          )}

          <div className="bg-white rounded-sm mt-4 border border-gray-300" ref={editorContainerRef}>
            {isEditorReady ? (
              <ReactQuillWrapper forwardedRef={quillRef} theme="snow" modules={modules} value={content} onChange={handleContentChange} placeholder={editorPlaceholder || "내용을 작성해 주십시오..."} />
            ) : (
              <div className="h-[600px] flex items-center justify-center bg-gray-50 text-gray-400 font-bold text-lg animate-pulse">
                에디터 엔진 준비 중...
              </div>
            )}
          </div>
          
          <div className="flex justify-end mt-2 px-1">
            <span className={`text-[11px] sm:text-[12px] font-black tracking-tighter ${currentLength >= MAX_CONTENT_LENGTH ? 'text-rose-500' : 'text-gray-400'}`}>
              {currentLength.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}자
            </span>
          </div>

          <div className="mt-3 text-center bg-gray-50 border border-gray-200 p-3 rounded-sm">
            <p className="text-[13px] font-bold text-gray-500 leading-relaxed">
              [알림] <span className="text-red-500">불법촬영물 및 아동·청소년 성착취 영상, 저작권 또는 사생활 침해 등의 영상은</span><br className="hidden md:block" />관련 법률 및 이용약관에 따라 제재를 받을 수 있습니다.
            </p>
          </div>

          <div className="flex justify-center gap-2 pt-6 border-t border-gray-100 mt-4">
            <button type="button" onClick={() => router.back()} disabled={isSubmitting} className="px-8 py-3 bg-white border border-gray-300 text-gray-700 rounded-sm font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors">취소</button>
            
            <button 
              type="button" 
              onMouseDown={(e) => {
                e.preventDefault(); 
                handleSubmit(e); 
              }}
              onClick={(e) => handleSubmit(e)}
              disabled={isUploading || isSubmitting || !isEditorReady} 
              className="px-12 py-3 bg-[#414a66] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-all disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="animate-spin" size={18} />}
              {isSubmitting ? '등록 중...' : isUploading ? '파일 대기...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
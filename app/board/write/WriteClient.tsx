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

const getMimeTypeFromExtension = (filename: string) => {
  if (!filename.includes('.')) return '';
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg'].includes(ext || '')) return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (['mov', 'qt'].includes(ext || '')) return 'video/quicktime';
  return '';
};

const cloneFileToUnlock = async (file: File, fallbackType: string): Promise<File> => {
  let mimeType = file.type;
  if (!mimeType || mimeType === 'application/octet-stream') {
    const extMime = getMimeTypeFromExtension(file.name);
    mimeType = extMime ? extMime : fallbackType;
  }
  try {
    const blobUrl = URL.createObjectURL(file);
    const response = await fetch(blobUrl);
    const buffer = await response.arrayBuffer();
    URL.revokeObjectURL(blobUrl);
    return new File([buffer], file.name, { type: mimeType });
  } catch (e1) {
    try {
      const buffer = await file.arrayBuffer();
      return new File([buffer], file.name, { type: mimeType });
    } catch (e2) {
      try {
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(new File([reader.result as ArrayBuffer], file.name, { type: mimeType }));
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(file);
        });
      } catch (e3) {
        console.warn("파일 메모리 복제 3중 방어 실패, 원본 반환", e3);
        return file;
      }
    }
  }
};

export default function WriteClient({ currentUser, isAdmin, isGlobalLocked, boards, editorPlaceholder, userPoints = 0 }: { currentUser: string, isAdmin: boolean, isGlobalLocked: boolean, boards: any[], editorPlaceholder?: string, userPoints?: number }) {
  const isSuperUser = isAdmin || currentUser === '상실의 시대' || currentUser === '관리자';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [botTrap, setBotTrap] = useState('');
  const [isNotice, setIsNotice] = useState(false);
  const [isBoardNotice, setIsBoardNotice] = useState(false);
  
  const [scheduledAt, setScheduledAt] = useState('');
  const [adminAuthorId, setAdminAuthorId] = useState('');
  const [isSmartMode, setIsSmartMode] = useState(false);
  const [smartInterval, setSmartInterval] = useState(60); 

  // ✨ AI 제목 최적화 전용 상태값
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiTitles, setAiTitles] = useState<string[]>([]);
  const [showAiModal, setShowAiModal] = useState(false);

  const router = useRouter();
  const quillRef = useRef<any>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const accumulatedImageSizeRef = useRef(0);
  const MAX_TOTAL_IMAGE_SIZE = 30 * 1024 * 1024;

  useEffect(() => {
    if (isGlobalLocked && !isSuperUser) {
      alert("현재 관리자에 의해 사이트 전체 글쓰기가 제한되었습니다.");
      router.push('/board');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const currentCat = params.get('category');
    if (currentCat && currentCat !== 'all') setCategory(currentCat);

    import('react-quill-new').then((RQ) => {
      const Quill = RQ.Quill;
      if (Quill) {
        const Font = Quill.import('formats/font');
        Font.whitelist = ['pretendard', 'notosanskr', 'gowundodum', 'hahmlet'];
        Quill.register(Font, true);

        const Size = Quill.import('attributors/style/size');
        Size.whitelist = ['10px', '12px', '14px', '15px', '16px', '18px', '20px', '24px', '30px', '36px'];
        Quill.register(Size, true);

        const AlignStyle = Quill.import('attributors/style/align');
        Quill.register(AlignStyle, true);

        const BlockEmbed = Quill.import('blots/block/embed') as any;
        const ImageBlot = Quill.import('formats/image') as any;
     
        class CustomImage extends ImageBlot {
          static create(value: any) {
            let node = super.create(value);
            if (typeof value === 'object' && value.url) {
              node.setAttribute('src', value.url);
              if (value.width) node.setAttribute('width', value.width);
              if (value.height) node.setAttribute('height', value.height);

              if (value.isSliced) {
                node.classList.add('humorin-sliced-img');
                node.style.setProperty('display', 'block', 'important');
                node.style.setProperty('margin-left', 'auto', 'important');
                node.style.setProperty('margin-right', 'auto', 'important');
                node.style.setProperty('border-radius', '0', 'important');
                node.style.setProperty('border', 'none', 'important');
                node.style.setProperty('padding', '0', 'important');
                node.style.setProperty('vertical-align', 'top', 'important');
                if (value.width) node.style.setProperty('max-width', `min(100%, ${value.width}px)`, 'important');
                if (value.isFirstSlice) {
                  node.style.setProperty('border-top-left-radius', '8px', 'important');
                  node.style.setProperty('border-top-right-radius', '8px', 'important');
                  node.style.setProperty('margin-top', '15px', 'important');
                } else {
                  node.style.setProperty('margin-top', '0', 'important');
                }
                if (value.isLastSlice) {
                  node.style.setProperty('border-bottom-left-radius', '8px', 'important');
                  node.style.setProperty('border-bottom-right-radius', '8px', 'important');
                  node.style.setProperty('margin-bottom', '15px', 'important');
                } else {
                  node.style.setProperty('margin-bottom', '-1px', 'important');
                }
              }
            } else if (typeof value === 'string') {
              node.setAttribute('src', value);
            }
            return node;
          }
          static value(node: any) {
            return {
              url: node.getAttribute('src'),
              width: node.getAttribute('width'),
              height: node.getAttribute('height'),
              isSliced: node.classList.contains('humorin-sliced-img'),
              isFirstSlice: node.style.marginTop === '15px',
              isLastSlice: node.style.marginBottom === '15px'
            };
          }
        }
        CustomImage.blotName = 'image';
        CustomImage.tagName = 'IMG';
        Quill.register(CustomImage, true);

        class CustomVideo extends BlockEmbed {
          static blotName = 'mp4Video';
          static tagName = 'VIDEO';
          static className = 'humorin-mp4';
          static create(value: any) {
            let node = super.create();
            node.setAttribute('controls', 'true');
            node.setAttribute('preload', 'metadata');
            node.setAttribute('playsinline', 'true');
            if (typeof value === 'object' && value.src) {
              node.setAttribute('src', value.src);
              if (value.poster) node.setAttribute('poster', value.poster);
            } else if (typeof value === 'string') {
              node.setAttribute('src', value);
            }
            node.style.display = 'block';
            node.style.width = '100%';
            node.style.maxWidth = '800px';
            node.style.margin = '10px auto 30px auto';
            node.style.borderRadius = '8px';
            node.style.backgroundColor = '#000';
            return node;
          }
          static value(node: any) { return { src: node.getAttribute('src'), poster: node.getAttribute('poster') || '' }; }
        }
        Quill.register(CustomVideo, true);

        class YoutubeVideo extends BlockEmbed {
          static blotName = 'youtubeVideo';
          static tagName = 'IFRAME';
          static className = 'humorin-youtube';
          static create(value: any) {
            let node = super.create();
            node.setAttribute('src', value);
            node.setAttribute('frameborder', '0');
            node.setAttribute('allowfullscreen', 'true');
            node.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
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
  }, [isGlobalLocked, isSuperUser, router]);

  // ✨ AI 제목 최적화 엔진 호출 로직
  const handleAiTitleOptimize = async () => {
    if (!title.trim()) {
      alert('변환할 원본 제목을 입력칸에 먼저 적어주세요.');
      return;
    }
    setIsAiLoading(true);
    setShowAiModal(true);
    setAiTitles([]);

    try {
      const res = await fetch('/api/admin/ai-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setAiTitles(data.titles);
      } else {
        alert(data.error || 'AI 통신에 실패했습니다.');
        setShowAiModal(false);
      }
    } catch (error) {
      alert('AI 서버 오류가 발생했습니다.');
      setShowAiModal(false);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiTitleSelect = (selectedTitle: string) => {
    setTitle(selectedTitle);
    setShowAiModal(false);
  };

  const isAnimatedWebP = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      if (file.type !== 'image/webp') return resolve(false);
      const reader = new FileReader();
      reader.onload = () => {
        const arr = new Uint8Array(reader.result as ArrayBuffer);
        for (let i = 0; i < arr.length - 4; i++) {
          if (arr[i] === 0x41 && arr[i + 1] === 0x4E && arr[i + 2] === 0x49 && arr[i + 3] === 0x4D) return resolve(true);
        }
        resolve(false);
      };
      reader.onerror = () => resolve(false);
      reader.readAsArrayBuffer(file.slice(0, 256));
    });
  };

  const sliceHugeImage = async (file: File, img: HTMLImageElement): Promise<File[]> => {
    const sliceHeight = 15000;
    const numSlices = Math.ceil(img.height / sliceHeight);
    const slices: File[] = [];
    for (let i = 0; i < numSlices; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      const currentSliceHeight = (i === numSlices - 1) ? img.height - (i * sliceHeight) : sliceHeight;
      canvas.height = currentSliceHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, i * sliceHeight, img.width, currentSliceHeight, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/webp', 0.9));
        if (blob) {
          const newFileName = `${file.name.replace(/\.[^/.]+$/, "")}_part${i + 1}.webp`;
          const sliceFile = new File([blob], newFileName, { type: 'image/webp' });
          (sliceFile as any).isSliced = true;
          (sliceFile as any).isFirstSlice = (i === 0);
          (sliceFile as any).isLastSlice = (i === numSlices - 1);
          slices.push(sliceFile);
        }
      }
    }
    return slices;
  };

  const processAndUploadImages = async (fileArray: File[], forcedIndex?: number) => {
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor();
    const currentImageCount = editor.root.querySelectorAll('img').length;
    if (currentImageCount + fileArray.length > 50) {
      alert(`사진은 게시글당 최대 50장까지만 첨부할 수 있습니다.\n(현재 ${currentImageCount}장 포함됨)`);
      return;
    }

    setIsCompressing(true);
    let insertIndex = forcedIndex !== undefined ? forcedIndex : (editor.getSelection()?.index || editor.getLength());
    try {
      const processedFiles: File[] = [];
      const imageFiles = fileArray.filter(f => f.type.startsWith('image/') || getMimeTypeFromExtension(f.name).startsWith('image/'));
      for (const file of imageFiles) {
        const isWebPAnim = file.type === 'image/webp' ? await isAnimatedWebP(file) : false;
        if (file.type === 'image/gif' || isWebPAnim) {
          processedFiles.push(file);
          continue;
        }
        try {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error('이미지 렌더링 실패')); });
          if (img.height > 15000) {
            const slices = await sliceHugeImage(file, img);
            URL.revokeObjectURL(img.src);
            processedFiles.push(...slices);
          } else {
            const isLongImage = img.height > img.width * 2;
            URL.revokeObjectURL(img.src);
            const options = isLongImage
              ? { maxSizeMB: 3, maxWidthOrHeight: undefined, useWebWorker: false, initialQuality: 0.9, fileType: 'image/webp' }
              : { maxSizeMB: 0.3, maxWidthOrHeight: 1200, useWebWorker: false, initialQuality: 0.85, fileType: 'image/webp' };
            const compressedBlob = await imageCompression(file, options);
            const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            processedFiles.push(new File([compressedBlob], newFileName, { type: 'image/webp' }));
          }
        } catch (e) {
          processedFiles.push(file);
        }
      }

      setIsCompressing(false);
      setIsUploading(true);
      const approvedFiles: File[] = [];
      for (const file of processedFiles) {
        if (accumulatedImageSizeRef.current + file.size > MAX_TOTAL_IMAGE_SIZE) {
          alert(`[${file.name}] 첨부 실패!\n게시글당 허용된 총 누적 용량(30MB)을 초과했습니다.`);
          continue;
        }
        accumulatedImageSizeRef.current += file.size;
        approvedFiles.push(file);
      }

      const uploadPromises = approvedFiles.map(async (file) => {
        const dimensions = await new Promise<{ w: number, h: number }>((resolve) => {
          const img = new Image();
          img.onload = () => { resolve({ w: img.width, h: img.height }); URL.revokeObjectURL(img.src); };
          img.src = URL.createObjectURL(file);
        });
        const safeContentType = file.type || 'image/webp';
        const isSliced = (file as any).isSliced === true;
        const isFirstSlice = (file as any).isFirstSlice === true;
        const isLastSlice = (file as any).isLastSlice === true;

        const ticketRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: safeContentType }),
        });
        const resData = await ticketRes.json();
        if (!ticketRes.ok) throw new Error(resData.error || '티켓 발급 실패');
        if (resData.uploadUrl) {
          const putRes = await fetch(resData.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': safeContentType } });
          if (!putRes.ok) throw new Error('클라우드 서버 전송 실패');
          return { url: resData.publicUrl, width: dimensions.w, height: dimensions.h, isSliced, isFirstSlice, isLastSlice };
        }
        return null;
      });
      
      const uploadedImages = (await Promise.all(uploadPromises)).filter(Boolean) as any[];
      uploadedImages.forEach(img => {
        editor.insertEmbed(insertIndex, 'image', { url: img.url, width: img.width, height: img.height, isSliced: img.isSliced, isFirstSlice: img.isFirstSlice, isLastSlice: img.isLastSlice }, 'silent');
        if (!img.isSliced || img.isLastSlice) {
          editor.insertText(insertIndex + 1, '\n', 'silent');
          insertIndex += 2;
        } else {
          insertIndex += 1;
        }
      });
      editor.setSelection(insertIndex, 'silent');
    } catch (error: any) {
      alert(`이미지 업로드 중 오류가 발생했습니다.\n이유: ${error.message}`);
    } finally {
      setIsCompressing(false);
      setIsUploading(false);
    }
  };

  const uploadImagesRef = useRef(processAndUploadImages);
  useEffect(() => { uploadImagesRef.current = processAndUploadImages; });

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;
    const handleNativePaste = async (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;
      const text = clipboardData.getData('text/plain');
      const html = clipboardData.getData('text/html');

      if (text) {
        const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = text.trim().match(ytRegex);
        if (match) {
          e.preventDefault();
          e.stopPropagation();
          const embedUrl = `https://www.youtube.com/embed/${match[1]}`;
          const editor = quillRef.current.getEditor();
          const range = editor.getSelection();
          const pasteIndex = range ? range.index : editor.getLength();
          editor.insertEmbed(pasteIndex, 'youtubeVideo', embedUrl, 'silent');
          editor.insertText(pasteIndex + 1, '\n', 'silent');
          editor.setSelection(pasteIndex + 2, 'silent');
          return;
        }
      }

      let hasExternalMedia = false;
      let extractedHtml = html;
      if (html) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const medias = doc.querySelectorAll('img, video, iframe');
          medias.forEach(el => {
            const realSrc = el.getAttribute('src') || el.getAttribute('data-src') || el.getAttribute('data-original');
            if (realSrc && realSrc.startsWith('http')) {
              hasExternalMedia = true;
              el.setAttribute('src', realSrc);
              el.removeAttribute('data-src');
              el.removeAttribute('data-original');
            }
          });
          if (hasExternalMedia) extractedHtml = doc.body.innerHTML;
        } catch (err) { }
      }

      if (!hasExternalMedia && text) {
        const imgUrlMatch = text.trim().match(/^https?:\/\/.*\.(gif|jpe?g|png|webp|bmp)(?:\?.*)?$/i);
        if (imgUrlMatch) {
          e.preventDefault();
          e.stopPropagation();
          const editor = quillRef.current.getEditor();
          let pasteIndex = editor.getSelection()?.index || editor.getLength();
          editor.insertEmbed(pasteIndex, 'image', text.trim(), 'silent');
          editor.insertText(pasteIndex + 1, '\n', 'silent');
          editor.setSelection(pasteIndex + 2, 'silent');
          return;
        }
      }

      if (hasExternalMedia) {
        e.preventDefault();
        e.stopPropagation();
        const editor = quillRef.current.getEditor();
        const range = editor.getSelection();
        const pasteIndex = range ? range.index : editor.getLength();
        editor.clipboard.dangerouslyPasteHTML(pasteIndex, extractedHtml);
        return;
      }

      const items = clipboardData.items;
      let hasImage = false;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/') || items[i].kind === 'file') {
          const rawFile = items[i].getAsFile();
          if (rawFile) {
            hasImage = true;
            imageFiles.push(await cloneFileToUnlock(rawFile, 'image/jpeg'));
          }
        }
      }
      if (hasImage && imageFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const editor = quillRef.current.getEditor();
        const range = editor.getSelection();
        const pasteIndex = range ? range.index : editor.getLength();
        uploadImagesRef.current(imageFiles, pasteIndex);
      }
    };

    container.addEventListener('paste', handleNativePaste, true);
    return () => container.removeEventListener('paste', handleNativePaste, true);
  }, []);

  const imageHandler = () => {
    const editor = quillRef.current.getEditor();
    const range = editor.getSelection();
    const startIndex = range ? range.index : editor.getLength();
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.setAttribute('multiple', 'true');
    input.click();
    input.onchange = async () => {
      const files = input.files;
      if (!files || files.length === 0) return;
      const unlockedFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        unlockedFiles.push(await cloneFileToUnlock(files[i], 'image/jpeg'));
      }
      await processAndUploadImages(unlockedFiles, startIndex);
    };
  };

  const videoFileHandler = () => {
    const editor = quillRef.current.getEditor();
    const range = editor.getSelection();
    let insertIndex = range ? range.index : editor.getLength();
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'video/*');
    input.click();
    input.onchange = async () => {
      const rawFile = input.files ? input.files[0] : null;
      if (!rawFile) return;
      const file = await cloneFileToUnlock(rawFile, 'video/mp4');
      if (file.type.startsWith('image/')) {
        alert("WebP나 GIF 움짤은 '이미지' 포맷이므로, 자동으로 사진 처리 엔진으로 전환하여 업로드합니다.");
        uploadImagesRef.current([file], insertIndex);
        return;
      }
      const currentVideoCount = editor.root.querySelectorAll('video').length;
      if (currentVideoCount >= 4) { alert(`동영상은 게시글당 최대 4개까지만 첨부할 수 있습니다.`); return; }
      if (file.size > 10 * 1024 * 1024) { alert(`[${file.name}] 동영상 용량이 초과되었습니다 (최대 10MB).`); return; }

      setIsUploading(true);
      try {
        let thumbPublicUrl = '';
        try {
          const thumbFile = await new Promise<File>((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.playsInline = true;
            video.muted = true;
            const url = URL.createObjectURL(file);
            video.src = url;
            const timeout = setTimeout(() => { URL.revokeObjectURL(url); reject(new Error('Timeout')); }, 3000); 
            video.onloadeddata = () => { video.currentTime = Math.min(0.1, video.duration > 0 ? video.duration / 2 : 0); };
            video.onseeked = () => {
              clearTimeout(timeout);
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth || 640;
              canvas.height = video.videoHeight || 360;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
              canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                if (blob) resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_thumb.webp", { type: 'image/webp' }));
                else reject(new Error('Blob conversion failed'));
              }, 'image/webp', 0.8);
            };
            video.onerror = () => { clearTimeout(timeout); URL.revokeObjectURL(url); reject(new Error('Video load error')); };
          });

          const thumbTicketRes = await fetch('/api/upload', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: thumbFile.name, contentType: thumbFile.type, isThumbnail: true }),
          });
          const thumbResData = await thumbTicketRes.json();
          if (thumbTicketRes.ok && thumbResData.uploadUrl) {
            const thumbPutRes = await fetch(thumbResData.uploadUrl, { method: 'PUT', body: thumbFile, headers: { 'Content-Type': thumbFile.type } });
            if (thumbPutRes.ok) thumbPublicUrl = thumbResData.publicUrl;
          }
        } catch (thumbError) { console.warn("썸네일 자동 추출 실패", thumbError); }

        const safeContentType = file.type || 'video/mp4';
        const ticketRes = await fetch('/api/upload', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: safeContentType }),
        });
        const resData = await ticketRes.json();
        if (!ticketRes.ok) throw new Error(resData.error || '티켓 발급 실패');
        if (resData.uploadUrl) {
          const putRes = await fetch(resData.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': safeContentType } });
          if (!putRes.ok) throw new Error('클라우드 서버 전송 실패');
          editor.insertEmbed(insertIndex, 'mp4Video', { src: resData.publicUrl + '#t=0.001', poster: thumbPublicUrl }, 'silent');
          editor.insertText(insertIndex + 1, '\n', 'silent');
          editor.setSelection(insertIndex + 2, 'silent');
        }
      } catch (error: any) {
        alert(`동영상 업로드 중 오류가 발생했습니다.\n이유: ${error.message}`);
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
        ['undo', 'redo'],
        [{ 'header': [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['blockquote', 'code-block'],
        ['clean']
      ],
      handlers: { image: imageHandler, video: videoFileHandler, undo: function () { this.quill.history.undo(); }, redo: function () { this.quill.history.redo(); } }
    }
  }), []);

  const handleContentChange = (newContent: string) => {
    const textOnly = newContent.replace(/<[^>]*>?/gm, '');
    if (textOnly.length > MAX_CONTENT_LENGTH) {
      alert(`게시글은 최대 ${MAX_CONTENT_LENGTH.toLocaleString()}자까지만 작성할 수 있습니다.\n현재 초과된 분량은 자동으로 삭제됩니다.`);
      if (quillRef.current) quillRef.current.getEditor().history.undo();
      return;
    }
    setContent(newContent);
  };

  const currentLength = content.replace(/<[^>]*>?/gm, '').length;
  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (isGlobalLocked && !isSuperUser) { alert('현재 관리자에 의해 글쓰기가 전면 차단되었습니다.'); return; }
    if (!category) { alert('게시판을 반드시 선택해 주십시오.'); return; }
    const targetBoard = boards?.find((b: any) => b.name === category);
    if (targetBoard?.is_write_locked && !isSuperUser) { alert(`해당 [${category}] 게시판은 현재 관리자에 의해 글쓰기가 잠겨있습니다.`); return; }
    if (!title.trim()) { alert('제목을 입력하세요.'); return; }
    if (!content || content === '<p><br></p>') { alert('내용을 작성해 주십시오.'); return; }

    if (!isSuperUser && userPoints < 10) {
      const contentWithoutMedia = content.replace(/<(img|video|iframe)[^>]*>/gi, '');
      if (contentWithoutMedia.includes('http://') || contentWithoutMedia.includes('https://') || contentWithoutMedia.includes('www.') || contentWithoutMedia.includes('.com')) {
        alert('스팸 방지를 위해 활동 점수 10점 미만은 외부 링크(URL)를 포함할 수 없습니다.\n본문에서 링크를 삭제한 후 다시 등록해 주십시오.');
        return;
      }
    }

    if (content.includes('data:image/')) { alert('게시글에 용량을 초과하는 텍스트 이미지(Base64)가 포함되어 있습니다.\n해당 이미지를 삭제하신 후 다시 첨부해 주십시오.'); return; }
    if (isCompressing || isUploading || isSubmitting) return;
    if (currentLength > MAX_CONTENT_LENGTH) { alert(`게시글 글자 수 제한(${MAX_CONTENT_LENGTH.toLocaleString()}자)을 초과했습니다.`); return; }

    setIsSubmitting(true);
    try {
      let targetUrl = '/api/post';
      let payload: any = { title, content, author: currentUser, category, is_notice: isNotice, is_board_notice: isBoardNotice, bot_trap: botTrap };

      if (isSuperUser && (scheduledAt || isSmartMode)) {
        targetUrl = '/api/admin/schedule';
        payload = { title, content, category, author_id: adminAuthorId || '', scheduled_at: scheduledAt ? new Date(scheduledAt + '+09:00').toISOString() : null, isSmartMode, smartInterval };
      }

      const res = await fetch(targetUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      
      if (res.ok) {
        router.push(`/board?category=${category}`);
        router.refresh();
      } else {
        const errorData = await res.json().catch(() => null);
        if (errorData?.error === 'forbidden_word') alert(`작성하신 글에 금지된 단어 [ ${errorData.word} ]가 포함되어 있습니다.`);
        else if (errorData?.message) alert(`${errorData.message}`);
        else alert('글 등록에 실패했습니다.');
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

  if (isGlobalLocked && !isSuperUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <style dangerouslySetInnerHTML={{ __html: `
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
        .ql-editor img { max-width: 100%; width: auto !important; height: auto; border-radius: 8px; display: block; margin: 15px auto !important; }
        .ql-editor img.humorin-sliced-img { margin: 0 auto !important; border-radius: 0 !important; display: block !important; padding: 0 !important; border: 0 !important; vertical-align: top !important; }
        .ql-editor p:has(img.humorin-sliced-img) { margin: 0 !important; padding: 0 !important; line-height: 0 !important; font-size: 0 !important; text-align: center; }
        @media (min-width: 768px) { .ql-editor img { max-width: 800px !important; } }
        .ql-editor video.humorin-mp4, .ql-editor iframe.humorin-youtube { width: 100%; max-width: 800px; height: auto; aspect-ratio: 16/9; border-radius: 8px; background: #000; border: none; display: block; margin: 10px auto 30px auto !important; object-fit: contain; }
        @media (max-width: 768px) { .ql-editor video.humorin-mp4, .ql-editor iframe.humorin-youtube { aspect-ratio: 16/9; height: auto; max-height: 70vh; } }
        .ql-toolbar.ql-snow { position: sticky; top: 0; z-index: 50; background-color: #fdfdfd; padding: 12px 15px; border-radius: 6px 6px 0 0; border: 1px solid #d1d5db; border-bottom: 2px solid #414a66; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
      `}} />

      <div className="max-w-6xl mx-auto p-4 md:p-6 mt-6 mb-20 bg-white border border-gray-200 shadow-sm rounded-sm">
        <h1 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-300 pb-3 flex items-center gap-2">
          글쓰기
          {isCompressing && <span className="text-[13px] font-bold text-blue-500 ml-4 animate-pulse">📷 사진 용량 최적화 중...</span>}
          {isUploading && <span className="text-[13px] font-bold text-emerald-500 ml-4 animate-pulse">🚀 서버로 전송 중...</span>}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="absolute opacity-0 -z-50 h-0 w-0 overflow-hidden" aria-hidden="true">
            <label htmlFor="humorin_secret_trap">웹사이트 주소</label>
            <input type="text" id="humorin_secret_trap" name="humorin_secret_trap" value={botTrap} onChange={(e) => setBotTrap(e.target.value)} tabIndex={-1} autoComplete="off" />
          </div>

          {isSuperUser && (
            <div className="flex flex-col px-4 py-3 bg-blue-50 border border-blue-200 rounded-sm mb-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={isSmartMode} onChange={(e) => setIsSmartMode(e.target.checked)} />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${isSmartMode ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isSmartMode ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <span className="ml-3 text-[14px] font-black text-blue-900 flex items-center gap-1">🚀 스마트 자동 할당 모드</span>
                </label>
                {isSmartMode && (
                   <select value={smartInterval} onChange={(e) => setSmartInterval(Number(e.target.value))} className="p-1.5 text-sm font-bold border border-blue-300 rounded text-blue-800 bg-white outline-none">
                      <option value={30}>30분 간격 분산</option>
                      <option value={60}>1시간 간격 분산</option>
                      <option value={120}>2시간 간격 분산</option>
                   </select>
                )}
              </div>
              
              {!isSmartMode ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-[13px] text-blue-800 font-bold mb-1">예약 발행 시간 (선택 시 예약 글로 전환됨)</label>
                    <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full p-2 border border-blue-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[13px] text-blue-800 font-bold mb-1">작성자 아이디 (user_id / 미입력시 본인)</label>
                    <input type="text" value={adminAuthorId} onChange={(e) => setAdminAuthorId(e.target.value)} placeholder="테스트 계정의 아이디를 입력하세요" className="w-full p-2 border border-blue-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                  </div>
                </div>
              ) : (
                <div className="py-2 text-center bg-white/60 rounded border border-blue-100">
                  <p className="text-[13px] font-bold text-indigo-700">✅ 등록 버튼을 누르면 시스템이 <b>가장 마지막 예약시간 + <span className="text-rose-600">{smartInterval}분</span></b> 뒤로 시간을 자동 지정하며,<br/>등록된 100개의 <b>테스트 계정을 무작위로 배정</b>합니다.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-3">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="p-3 border border-gray-300 rounded-sm outline-none font-bold bg-white text-gray-700 w-full md:w-56 shadow-sm">
              <option value="" disabled>게시판을 선택해 주세요</option>
              {Object.keys(groupedBoards).length > 0 ? (
                Object.keys(groupedBoards).map((groupName) => (
                  <optgroup key={groupName} label={groupName}>
                    {groupedBoards[groupName].map((b: any) => (
                      <option key={b.name} value={b.name} disabled={b.is_write_locked && !isSuperUser}>
                        {b.name} {b.is_write_locked && !isSuperUser ? ' 🔒 (잠김)' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))
               ) : ( <option value="">게시판을 불러오는 중...</option> )}
            </select>
            
            {/* ✨ AI 제목 최적화가 이식된 새로운 제목 입력칸 */}
            <div className="flex-1 relative flex items-center">
              <input placeholder="제목을 입력하세요." className="w-full p-3 border border-gray-300 rounded-sm font-bold text-gray-900 pr-[110px]" value={title} onChange={(e) => setTitle(e.target.value)} required />
              
              {isSuperUser && (
                <button
                  type="button"
                  onClick={handleAiTitleOptimize}
                  disabled={isAiLoading || !title.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[12px] font-bold rounded shadow-sm hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 transition-all flex items-center gap-1"
                >
                  {isAiLoading ? <Loader2 className="animate-spin" size={14} /> : '✨ AI 최적화'}
                </button>
              )}

              {showAiModal && isSuperUser && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-purple-200 shadow-xl rounded-md z-[9999] overflow-hidden">
                  <div className="bg-purple-50 px-3 py-2 border-b border-purple-100 flex justify-between items-center">
                    <span className="text-[12px] font-bold text-purple-700">✨ AI 추천 제목 (클릭하여 덮어쓰기)</span>
                    <button type="button" onClick={() => setShowAiModal(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none font-bold">×</button>
                  </div>
                  <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                    {isAiLoading ? (
                      <div className="p-4 text-center text-[13px] font-bold text-purple-600 animate-pulse flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin" size={16} /> Gemini AI가 SEO 최적화 제목을 생성 중입니다...
                      </div>
                    ) : aiTitles.length > 0 ? (
                      aiTitles.map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAiTitleSelect(t)}
                          className="w-full text-left p-3 hover:bg-purple-50 rounded border border-transparent hover:border-purple-200 transition-colors text-[14px] font-bold text-gray-800"
                        >
                          {t}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-gray-500">추천된 제목이 없습니다.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="w-full md:w-48 p-3 border border-gray-200 bg-gray-50 rounded-sm flex items-center justify-between font-bold text-gray-600">
              <div>{currentUser} {isSuperUser && <span className="text-xs text-red-500 ml-1">(Admin)</span>}</div>
            </div>
          </div>

          {isSuperUser && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-sm mt-1">
              <div className="flex items-center">
                <input type="checkbox" id="is_board_notice" checked={isBoardNotice} onChange={(e) => { setIsBoardNotice(e.target.checked); if (e.target.checked) setIsNotice(false); }} className="w-4 h-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-600 cursor-pointer" />
                <label htmlFor="is_board_notice" className="text-[13px] font-black text-indigo-700 cursor-pointer flex items-center gap-1.5 select-none ml-2"><span className="text-base">📌</span> [현재 게시판] 최상단 고정</label>
              </div>
              <div className="flex items-center sm:ml-4">
                <input type="checkbox" id="is_notice" checked={isNotice} onChange={(e) => { setIsNotice(e.target.checked); if (e.target.checked) setIsBoardNotice(false); }} className="w-4 h-4 text-rose-500 rounded border-rose-300 focus:ring-rose-500 cursor-pointer" />
                <label htmlFor="is_notice" className="text-[13px] font-black text-rose-600 cursor-pointer flex items-center gap-1.5 select-none ml-2"><span className="text-base">📢</span> [전체 게시판] 최상단 고정</label>
              </div>
            </div>
          )}

          <div className="bg-white rounded-sm mt-4 border border-gray-300" ref={editorContainerRef}>
            {isEditorReady ? ( <ReactQuillWrapper forwardedRef={quillRef} theme="snow" modules={modules} value={content} onChange={handleContentChange} placeholder={editorPlaceholder || "내용을 작성해 주십시오..."} /> ) : ( <div className="h-[600px] flex items-center justify-center bg-gray-50 text-gray-400 font-bold text-lg animate-pulse">에디터 엔진 준비 중...</div> )}
          </div>

          <div className="flex justify-end mt-2 px-1">
            <span className={`text-[11px] sm:text-[12px] font-black tracking-tighter ${currentLength >= MAX_CONTENT_LENGTH ? 'text-rose-500' : 'text-gray-400'}`}>{currentLength.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}자</span>
          </div>
          <div className="mt-3 text-center bg-gray-50 border border-gray-200 p-3 rounded-sm">
            <p className="text-[13px] font-bold text-gray-500 leading-relaxed">[알림] <span className="text-red-500">불법촬영물 및 아동·청소년 성착취 영상, 저작권 또는 사생활 침해 등의 영상은</span><br className="hidden md:block" />관련 법률 및 이용약관에 따라 제재를 받을 수 있습니다.</p>
          </div>

          <div className="flex justify-center gap-2 pt-6 border-t border-gray-100 mt-4">
            <button type="button" onClick={() => router.back()} disabled={isSubmitting} className="px-8 py-3 bg-white border border-gray-300 text-gray-700 rounded-sm font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors">취소</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); handleSubmit(e); }} onClick={(e) => handleSubmit(e)} disabled={isCompressing || isUploading || isSubmitting || !isEditorReady} className="px-12 py-3 bg-[#414a66] text-white rounded-sm font-bold hover:bg-[#2a3042] transition-all disabled:bg-gray-400 flex items-center justify-center gap-2">
              {(isCompressing || isUploading || isSubmitting) && <Loader2 className="animate-spin" size={18} />}
              {isSubmitting ? '등록 중...' : isCompressing ? '사진 최적화 중...' : isUploading ? '서버 전송 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
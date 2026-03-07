'use client';

import { useEffect } from 'react';

export default function CommentScript() {
  useEffect(() => {
    const handleChange = (e: any) => {
      if (e.target && e.target.classList && e.target.classList.contains('image-upload-input')) {
        const file = e.target.files[0];
        const previewContainer = document.getElementById('preview-' + e.target.id);
        const previewImage = document.getElementById('img-preview-' + e.target.id) as HTMLImageElement;
        
        if (file) {
          if (file.size > 1048576) {
            alert('1MB 이하의 이미지만 첨부 가능합니다.');
            e.target.value = '';
            if(previewContainer) previewContainer.classList.add('hidden');
            return;
          }
          if(previewImage && previewContainer) {
            previewImage.src = URL.createObjectURL(file);
            previewContainer.classList.remove('hidden');
          }
        } else {
          if(previewContainer) previewContainer.classList.add('hidden');
        }
      }
    };

    const handleClick = (e: any) => {
      const btn = e.target.closest('.remove-image-btn');
      if (btn) {
         const inputId = btn.getAttribute('data-input-id');
         const input = document.getElementById(inputId) as HTMLInputElement;
         if(input) input.value = '';
         const previewContainer = document.getElementById('preview-' + inputId);
         if(previewContainer) previewContainer.classList.add('hidden');
      }
    };

    // 💡 미나의 핵심 처방: "등록/수정완료" 버튼 클릭 시 창문을 닫아주는 마법!
    const handleSubmit = (e: any) => {
      const form = e.target;
      
      // 대댓글 및 수정 폼 닫기
      if (form.hasAttribute('data-checkbox-id')) {
        const checkboxId = form.getAttribute('data-checkbox-id');
        const checkbox = document.getElementById(checkboxId) as HTMLInputElement;
        if (checkbox) {
          setTimeout(() => {
            checkbox.checked = false; // 창 닫기
            form.reset(); // 내용 비우기
            const previewContainer = document.getElementById('preview-file-' + checkboxId);
            if(previewContainer) previewContainer.classList.add('hidden'); // 썸네일 숨기기
          }, 100);
        }
      }
      
      // 메인 댓글 폼 비우기
      if (form.id === 'main-comment-form') {
        setTimeout(() => {
          form.reset();
          const previewContainer = document.getElementById('preview-file-comment-main');
          if (previewContainer) previewContainer.classList.add('hidden');
        }, 100);
      }
    };

    document.addEventListener('change', handleChange);
    document.addEventListener('click', handleClick);
    document.addEventListener('submit', handleSubmit);

    return () => {
      document.removeEventListener('change', handleChange);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('submit', handleSubmit);
    };
  }, []);

  return null;
}
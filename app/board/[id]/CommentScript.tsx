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

    document.addEventListener('change', handleChange);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('change', handleChange);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return null;
}
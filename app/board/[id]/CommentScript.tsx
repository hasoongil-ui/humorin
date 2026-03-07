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
            
            if (e.target.id.startsWith('file-edit-')) {
                const nodeId = e.target.id.replace('file-edit-', '');
                const form = document.querySelector(`form[data-checkbox-id="edit-${nodeId}"]`);
                const originalImage = form ? form.getAttribute('data-original-image') : null;
                const flag = document.getElementById('remove-image-flag-' + nodeId) as HTMLInputElement;

                if (originalImage && (!flag || flag.value === 'false')) {
                    if (previewImage) previewImage.src = originalImage;
                    if (previewContainer) previewContainer.classList.remove('hidden');
                } else {
                    if (previewContainer) previewContainer.classList.add('hidden');
                }
            } else {
                if (previewContainer) previewContainer.classList.add('hidden');
            }
            return;
          }
          
          if (previewImage && previewContainer) {
            previewImage.src = URL.createObjectURL(file);
            previewContainer.classList.remove('hidden');
            
            if (e.target.id.startsWith('file-edit-')) {
               const nodeId = e.target.id.replace('file-edit-', '');
               const flag = document.getElementById('remove-image-flag-' + nodeId) as HTMLInputElement;
               if(flag) flag.value = 'false';
            }
          }
        } else {
          if (e.target.id.startsWith('file-edit-')) {
              const nodeId = e.target.id.replace('file-edit-', '');
              const form = document.querySelector(`form[data-checkbox-id="edit-${nodeId}"]`);
              const originalImage = form ? form.getAttribute('data-original-image') : null;
              const flag = document.getElementById('remove-image-flag-' + nodeId) as HTMLInputElement;

              if (originalImage && (!flag || flag.value === 'false')) {
                  if (previewImage) previewImage.src = originalImage;
                  if (previewContainer) previewContainer.classList.remove('hidden');
              } else {
                  if (previewContainer) previewContainer.classList.add('hidden');
              }
          } else {
              if (previewContainer) previewContainer.classList.add('hidden');
          }
        }
      }

      if (e.target && e.target.type === 'checkbox' && e.target.id.startsWith('edit-')) {
         if (!e.target.checked) {
             const nodeId = e.target.id.replace('edit-', '');
             const form = document.querySelector(`form[data-checkbox-id="edit-${nodeId}"]`) as HTMLFormElement;
             
             if (form) {
                 form.reset(); 
                 const flag = document.getElementById('remove-image-flag-' + nodeId) as HTMLInputElement;
                 if (flag) flag.value = 'false'; 

                 const previewContainer = document.getElementById('preview-file-edit-' + nodeId);
                 const previewImg = document.getElementById('img-preview-file-edit-' + nodeId) as HTMLImageElement;
                 const originalImage = form.getAttribute('data-original-image');

                 if (originalImage && previewContainer && previewImg) {
                     previewImg.src = originalImage;
                     previewContainer.classList.remove('hidden');
                 } else if (previewContainer) {
                     previewContainer.classList.add('hidden');
                 }
             }
         }
      }
    };

    const handleClick = (e: any) => {
      const btn = e.target.closest('.remove-image-btn');
      if (btn) {
         const inputId = btn.getAttribute('data-input-id');
         const nodeId = btn.getAttribute('data-node-id'); 

         const input = document.getElementById(inputId) as HTMLInputElement;
         if (input) input.value = '';

         const previewContainer = document.getElementById('preview-' + inputId);
         if (previewContainer) previewContainer.classList.add('hidden');

         if (nodeId) {
             const flag = document.getElementById('remove-image-flag-' + nodeId) as HTMLInputElement;
             if (flag) flag.value = 'true';
         }
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
'use client';

import { useEffect } from 'react';

export default function CommentScript() {
  useEffect(() => {
    const handleChange = (e: any) => {
      // 1. 파일 첨부 상태 변화 감지
      if (e.target && e.target.classList && e.target.classList.contains('image-upload-input')) {
        const file = e.target.files[0];
        const previewContainer = document.getElementById('preview-' + e.target.id);
        const previewImage = document.getElementById('img-preview-' + e.target.id) as HTMLImageElement;
        
        if (file) {
          if (file.size > 1048576) {
            alert('1MB 이하의 이미지만 첨부 가능합니다.');
            e.target.value = '';
            
            // 용량 초과 시, 만약 수정창이고 기존 이미지가 있었다면 다시 기존 이미지로 복구
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
            
            // 새 파일을 선택했으니, '기존 이미지 삭제 플래그'를 취소(false)로 변경
            if (e.target.id.startsWith('file-edit-')) {
               const nodeId = e.target.id.replace('file-edit-', '');
               const flag = document.getElementById('remove-image-flag-' + nodeId) as HTMLInputElement;
               if(flag) flag.value = 'false';
            }
          }
        } else {
          // 파일 선택 창을 켰다가 그냥 취소(닫기)를 눌렀을 때
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

      // 2. 수정 폼 닫기(취소) 시 완벽 원상복구 로직
      if (e.target && e.target.type === 'checkbox' && e.target.id.startsWith('edit-')) {
         if (!e.target.checked) {
             const nodeId = e.target.id.replace('edit-', '');
             const form = document.querySelector(`form[data-checkbox-id="edit-${nodeId}"]`) as HTMLFormElement;
             
             if (form) {
                 form.reset(); 
                 const flag = document.getElementById('remove-image-flag-' + nodeId) as HTMLInputElement;
                 if (flag) flag.value = 'false'; // 삭제 상태 초기화

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
         const nodeId = btn.getAttribute('data-node-id'); // 수정창 식별자

         const input = document.getElementById(inputId) as HTMLInputElement;
         if (input) input.value = '';

         const previewContainer = document.getElementById('preview-' + inputId);
         if (previewContainer) previewContainer.classList.add('hidden');

         // 엑스(X) 버튼을 누르면 서버에 '이 이미지 지워주세요' 라고 신호를 보냄
         if (nodeId) {
             const flag = document.getElementById('remove-image-flag-' + nodeId) as HTMLInputElement;
             if (flag) flag.value = 'true';
         }
      }
    };

    const handleSubmit = (e: any) => {
      const form = e.target;
      
      if (form.hasAttribute('data-checkbox-id')) {
        const checkboxId = form.getAttribute('data-checkbox-id');
        const checkbox = document.getElementById(checkboxId) as HTMLInputElement;
        if (checkbox) {
          setTimeout(() => {
            checkbox.checked = false; 
            form.reset(); 
            const previewContainer = document.getElementById('preview-file-' + checkboxId);
            if(previewContainer) previewContainer.classList.add('hidden'); 
          }, 100);
        }
      }
      
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
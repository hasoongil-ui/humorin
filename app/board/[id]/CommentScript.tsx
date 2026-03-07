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

      // 2. 수정 폼 닫기(취소) 시 완벽 원상복구 로직
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

    // 💡 미나의 새로운 제출 마법: 1초의 딜레이를 완벽하게 숨기는 스마트 버튼!
    const handleSubmit = (e: any) => {
      const form = e.target;
      const submitBtn = form.querySelector('button[type="submit"]');

      if (submitBtn) {
         // 1. 다다닥 중복 클릭 방지 (비활성화 및 약간 투명하게 처리)
         submitBtn.disabled = true;
         submitBtn.classList.add('opacity-60', 'cursor-not-allowed');

         // 2. 버튼 글씨를 상황에 맞게 변경하여 안심시키기
         const originalText = submitBtn.innerText;
         if (originalText.includes('수정')) {
             submitBtn.innerText = '수정 처리 중...';
         } else {
             submitBtn.innerText = '등록 처리 중...';
         }

         // 3. 서버가 다운되거나 응답이 없을 경우를 대비한 안전장치 (3초 뒤 원상복구)
         setTimeout(() => {
             if (submitBtn) {
                 submitBtn.disabled = false;
                 submitBtn.classList.remove('opacity-60', 'cursor-not-allowed');
                 submitBtn.innerText = originalText;
             }
         }, 3000);
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
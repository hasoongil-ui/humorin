'use client';

import { useEffect } from 'react';

export default function CopyProtection() {
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      // 유저가 드래그한 내용을 몰래 임시 상자에 담습니다.
      const container = document.createElement('div');
      container.appendChild(selection.getRangeAt(0).cloneContents());

      // 복사한 내용 중에 <img> 태그가 있는지 싹 뒤집니다.
      const imgs = container.querySelectorAll('img');
      
      if (imgs.length > 0) {
         imgs.forEach(img => {
            // 🔥 [핵심] 원본 이미지 주소를 '경고 이미지' 주소로 바꿔치기합니다!
            // (나중에 대장님이 만든 오재미 전용 엑박 이미지 주소로 바꾸시면 됩니다)
            img.src = "https://via.placeholder.com/600x400/f3f4f6/9ca3af?text=This+image+is+only+available+on+Ojemi"; 
            img.style.maxWidth = "100%";
         });

         // 꼬리표(출처) 강제 부착!
         const watermark = document.createElement('p');
         watermark.innerHTML = `<br><br><b>출처: 오재미 (https://ojemi.kr)</b>`;
         container.appendChild(watermark);

         // 조작된 내용을 유저의 클립보드(복사통)에 몰래 쑤셔 넣습니다.
         e.clipboardData?.setData('text/html', container.innerHTML);
         e.clipboardData?.setData('text/plain', container.innerText + '\n\n출처: 오재미 (https://ojemi.kr)');
         
         // 원래 브라우저가 하려던 복사 동작을 취소시킵니다.
         e.preventDefault();
      }
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, []);

  return null; // 화면에 보이는 건 없습니다. 백그라운드에서 감시만 합니다!
}
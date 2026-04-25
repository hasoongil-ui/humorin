"use client";

import { useEffect } from "react";

export default function CopyProtection() {
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      // 선택한 게 없으면 그냥 통과
      if (!selection || selection.isCollapsed) return; 

      e.preventDefault();

      // 1. 메모장 같은 곳에 붙여넣을 때 쓸 '글자' 버젼
      const selectedText = selection.toString();
      const currentUrl = window.location.href;
      const sourceLinkText = `\n\n출처: ${currentUrl}`;

      // 2. 타 커뮤니티(디시, 펨코)에 붙여넣을 때 쓸 '사진+글씨' 버젼 (HTML)
      const range = selection.getRangeAt(0);
      const clonedSelection = range.cloneContents();
      const div = document.createElement('div');
      div.appendChild(clonedSelection);
      const selectedHtml = div.innerHTML;
      
      // 출처에 링크(a 태그)를 걸어서 클릭하면 바로 유머인로 오게 만듦
      const sourceLinkHtml = `<br><br>출처: <a href="${currentUrl}">${currentUrl}</a>`;

      // 3. 복사통(클립보드)에 두 가지 버젼을 동시에 몰래 쑤셔 넣기!
      if (e.clipboardData) {
        e.clipboardData.setData("text/plain", selectedText + sourceLinkText);
        e.clipboardData.setData("text/html", selectedHtml + sourceLinkHtml);
      }
    };

    // 누군가 '복사(Ctrl+C)'를 하는 순간 이 마법이 발동됨
    document.addEventListener("copy", handleCopy);

    return () => {
      document.removeEventListener("copy", handleCopy);
    };
  }, []);

  return null; // 화면에는 아무것도 안 보임 (투명망토)
}
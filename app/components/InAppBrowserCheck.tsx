// 파일: components/InAppBrowserCheck.tsx
'use client';

import { useEffect } from 'react';

export default function InAppBrowserCheck() {
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // 3대 악질 인앱 브라우저 중 '카카오톡'만 솎아냄
    const isKakao = userAgent.match(/kakaotalk/i);

    if (isKakao) {
      const targetUrl = location.href;
      
      // 안드로이드 카카오톡인 경우에만 크롬으로 강제 납치
      if (userAgent.match(/android/i)) {
        location.href = `intent://${targetUrl.replace(/https?:\/\//i, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      } 
    }
  }, []);

  return null;
}
'use client';

import { useEffect } from 'react';

export default function InAppBrowserCheck() {
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // 3대 악질 인앱 브라우저 감지 (카카오, 네이버, 구글앱)
    const isKakao = userAgent.match(/kakaotalk/i);
    const isNaver = userAgent.match(/naver/i);
    const isGoogleApp = userAgent.match(/gsa\//i) || (userAgent.match(/google/i) && !userAgent.match(/chrome/i));

    if (isKakao || isNaver || isGoogleApp) {
      const targetUrl = location.href;
      
      if (userAgent.match(/android/i)) {
        if (isKakao) {
          // 안드로이드 카카오톡은 크롬으로 강제 자동 납치(이동) 가능
          location.href = `intent://${targetUrl.replace(/https?:\/\//i, '')}#Intent;scheme=https;package=com.android.chrome;end`;
        } else {
          // 안드로이드 구글/네이버 앱은 강제 이동이 막혀있어 안내창 띄움
          alert("현재 화면에서는 '홈 화면 추가(앱 설치)' 기능이 제한됩니다.\n\n우측 하단 또는 상단의 [···] 메뉴를 눌러\n'다른 브라우저(크롬)로 열기'를 선택해 주세요!");
        }
      } else if (userAgent.match(/iphone|ipad|ipod/i)) {
        // 아이폰(iOS)은 모든 인앱 브라우저에서 안내창 띄움
        alert("현재 화면에서는 '홈 화면 추가(앱 설치)' 기능이 제한됩니다.\n\n우측 하단 [···] 버튼이나 나침반 아이콘을 눌러\n'Safari로 열기'를 선택해 주세요!");
      }
    }
  }, []);

  return null;
}
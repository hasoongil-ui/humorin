'use client';

import { useEffect } from 'react';

export default function VideoVolumeFix() {
  useEffect(() => {
    // 💡 영상들이 화면에 다 그려질 때까지 1.5초 기다렸다가 볼륨 마법을 쏩니다!
    const timer = setTimeout(() => {
      // 1. [MP4 동영상] 볼륨 20% 세팅
      const videos = document.querySelectorAll('.ql-editor video');
      videos.forEach((v) => {
        const video = v as HTMLVideoElement;
        video.volume = 0.2; // 0.2 = 볼륨 20%
      });

      // 2. [유튜브 영상] 볼륨 20% 세팅
      const iframes = document.querySelectorAll('.ql-editor iframe');
      iframes.forEach((iframe) => {
        const ytIframe = iframe as HTMLIFrameElement;
        if (ytIframe.src.includes('youtube.com') || ytIframe.src.includes('youtu.be')) {
          // 유튜브 플레이어 내부로 "볼륨을 20으로 낮춰라!"는 비밀 명령 전송
          ytIframe.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'setVolume', args: [20] }),
            '*'
          );
        }
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return null; // 화면엔 안 보이고 뒤에서 묵묵히 일합니다!
}
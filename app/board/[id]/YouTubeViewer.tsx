'use client';

import { useEffect, useRef } from 'react';

export default function YouTubeViewer({ videoId }: { videoId: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      // 💡 [미나의 비밀 명령] 유튜브 플레이어가 로딩되면, 볼륨 슬라이더를 20%로 내리라고 3번 확실하게 꽂아 넣습니다!
      let count = 0;
      const interval = setInterval(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'setVolume', args: [20] }), // 20은 볼륨 20%를 의미합니다.
            '*'
          );
        }
        count++;
        if (count >= 3) clearInterval(interval); // 3번 쏘고 종료
      }, 1000);
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [videoId]);

  return (
    <div className="mb-10 rounded-lg overflow-hidden shadow-lg border border-gray-100 bg-black">
      <iframe
        ref={iframeRef}
        className="w-full aspect-video"
        // 💡 [핵심] enablejsapi=1 이 있어야 비밀 명령(볼륨 조절)을 받아들입니다!
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&mute=1`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      ></iframe>
    </div>
  );
}
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HybridPrefetchTrigger() {
  const router = useRouter();

  useEffect(() => {
    const prefetchedUrls = new Set<string>();

    const handlePrefetch = (target: HTMLElement) => {
      // 가장 가까운 <a> 태그나 href를 가지고 있는 태그를 찾습니다.
      const anchor = target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // 이미 프리페치했거나 상세 페이지(/board/숫자) 링크가 아닌 경우 필터링 (원하는 게시글 상세 이동만 가속)
      if (prefetchedUrls.has(href)) return;
      if (!href.startsWith('/board/')) return;

      try {
        router.prefetch(href);
        prefetchedUrls.add(href);
      } catch (e) {
        console.error('하이브리드 프리페치 실행 오류:', e);
      }
    };

    const onMouseEnter = (e: MouseEvent) => {
      handlePrefetch(e.target as HTMLElement);
    };

    const onTouchStart = (e: TouchEvent) => {
      handlePrefetch(e.target as HTMLElement);
    };

    // 이벤트 위임(Event Delegation)을 활용하여 리스트 전체 영역의 인터랙션을 효율적으로 감시
    document.addEventListener('mouseover', onMouseEnter, { passive: true });
    document.addEventListener('touchstart', onTouchStart, { passive: true });

    return () => {
      document.removeEventListener('mouseover', onMouseEnter);
      document.removeEventListener('touchstart', onTouchStart);
    };
  }, [router]);

  return null;
}

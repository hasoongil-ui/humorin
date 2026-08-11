// public/sw.js
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  console.log('🚀 유머인 PWA 서비스 워커 가동 완료!');
});

self.addEventListener('fetch', (event) => {
  // 서버 부하를 막기 위해 별도의 강제 캐싱 없이 요청을 그대로 통과시킵니다.
  return;
});
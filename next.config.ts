import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 기존 설정이 들어갈 자리 */
  
  // 쥐새끼들(해커) 강제 추방 방어막 시작
  async redirects() {
    return [
      {
        // 1. 어떤 페이지를 찌르든 상관없이 (/:path*)
        source: '/:path*',
        has: [
          {
            // 2. 만약 접속한 주소가 개구멍(ojemi-web.vercel.app)이라면
            type: 'host',
            value: 'ojemi-web.vercel.app', 
          },
        ],
        // 3. 클라우드플레어 정문(www.ojemi.kr)으로 0.001초 만에 강제로 쫓아냅니다!
        destination: 'https://www.ojemi.kr/:path*', 
        permanent: true,
      },
    ];
  },
  // 방어막 끝
};

export default nextConfig;
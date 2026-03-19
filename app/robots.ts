import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/'], // 🚨 해커 로봇, 관리자 페이지 접근 금지!
    },
    sitemap: 'https://www.ojemi.kr/sitemap.xml', // 🗺️ 지도는 여기 있어!
  }
}
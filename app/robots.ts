import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // 🟢 1. 일반 방문자 & 착한 로봇 (구글, 네이버 등)
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/'], // 🚨 해커 로봇, 관리자 페이지 접근 금지!
      },
      // 🚫 2. Vercel 요금을 갉아먹는 나쁜 식충이 사설 봇 6대장
      {
        userAgent: ['AhrefsBot', 'SemrushBot', 'DotBot', 'MJ12bot', 'PetalBot', 'YandexBot'],
        disallow: ['/'], // 🚨 유머인 사이트 전체 접근 및 수집 완전 금지!
      }
    ],
    sitemap: 'https://www.humorin.kr/sitemap.xml', // 🗺️ 지도는 여기 있어!
  }
}
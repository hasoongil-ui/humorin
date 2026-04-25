import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.humorin.kr',
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1, // 대문이 제일 중요함! (1등)
    },
    {
      url: 'https://www.humorin.kr/board',
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.8, // 게시판도 엄청 중요함!
    },
  ]
}
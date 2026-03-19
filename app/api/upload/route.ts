import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: '파일 정보가 없습니다.' }, { status: 400 });
    }

    // 🛡️ [보안 수술 1] 이미지 파일만 통과시키는 철통 검문소! (바이러스, 악성스크립트 원천 차단)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json({ error: '❌ 이미지 파일(JPG, PNG, GIF, WEBP)만 업로드할 수 있습니다.' }, { status: 400 });
    }

    // 🛡️ [보안 수술 2] 한글/띄어쓰기로 인한 URL 깨짐 방지를 위해 파일명 강제 세탁!
    // 원본 파일에서 확장자(jpg, png 등)만 쏙 빼냅니다.
    const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
    // 타임스탬프 + 8자리 무작위 알파벳/숫자 조합으로 절대 안 깨지는 이름 생성
    const safeRandomName = Math.random().toString(36).substring(2, 10);
    const uniqueFileName = `${Date.now()}-${safeRandomName}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: contentType,
    });

    // 🎟️ 마법의 황금 티켓(Presigned URL) 발급! (유효기간 60초)
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
    
    // 유저가 볼 수 있는 전시관 주소
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_URL}/${uniqueFileName}`;

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    console.error('티켓 발급 에러:', error);
    return NextResponse.json({ error: '티켓 발급 실패' }, { status: 500 });
  }
}
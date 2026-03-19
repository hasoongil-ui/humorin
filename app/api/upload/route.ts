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

    // 💡 [CCTV 가동] 브라우저가 도대체 어떤 이름표를 달고 보내는지 터미널에 기록합니다.
    console.log(`[업로드 요청] 파일명: ${filename}, 타입: ${contentType}`);

    if (!filename || !contentType) {
      return NextResponse.json({ error: '파일 정보가 없습니다.' }, { status: 400 });
    }

    // 🛡️ [정석 보안 화이트리스트] 바이러스는 막고, 정상적인 이미지/동영상만 통과시킵니다.
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    
    if (!allowedTypes.includes(contentType)) {
      console.error(`❌ 업로드 차단됨: 명단에 없는 이상한 파일 타입 (${contentType})`);
      return NextResponse.json({ error: '❌ 이미지 또는 동영상 파일만 업로드할 수 있습니다.' }, { status: 400 });
    }

    // 한글/띄어쓰기로 인한 URL 깨짐 방지를 위해 파일명 강제 세탁
    const extension = filename.split('.').pop()?.toLowerCase() || 'bin';
    const safeRandomName = Math.random().toString(36).substring(2, 10);
    const uniqueFileName = `${Date.now()}-${safeRandomName}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: contentType,
    });

    // 마법의 황금 티켓(Presigned URL) 발급
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_URL}/${uniqueFileName}`;

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    console.error('티켓 발급 에러:', error);
    return NextResponse.json({ error: '티켓 발급 실패' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'; // 💡 새로 설치한 티켓 발급기!

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
    // 💡 무거운 사진 대신, 사진의 '이름'과 '종류'만 가볍게 물어봅니다!
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: '파일 정보가 없습니다.' }, { status: 400 });
    }

    const uniqueFileName = `${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: contentType,
    });

    // 🎟️ 마법의 황금 티켓(Presigned URL) 발급! (유효기간 60초)
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
    
    // 유저가 볼 수 있는 전시관 주소
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_URL}/${uniqueFileName}`;

    // 티켓과 전시관 주소를 유저에게 던져줍니다!
    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    console.error('티켓 발급 에러:', error);
    return NextResponse.json({ error: '티켓 발급 실패' }, { status: 500 });
  }
}
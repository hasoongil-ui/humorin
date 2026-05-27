import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { cookies } from 'next/headers';

import crypto from 'crypto';

const SECRET_KEY = process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// 💡 백엔드 전용 확장자 -> 신분증(MIME) 변환기 (확장자가 없으면 fallback 반환)
const getMimeType = (filename: string, fallback: string) => {
  if (!filename.includes('.')) return fallback;
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg'].includes(ext || '')) return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  if (['mov', 'qt'].includes(ext || '')) return 'video/quicktime';
  return fallback;
};

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('humorin_userid')?.value;
    const signature = cookieStore.get('humorin_signature')?.value;
    
    if (!userId || !signature) {
      return NextResponse.json({ error: '로그인한 회원만 업로드할 수 있습니다.' }, { status: 401 });
    }
    
    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(userId).digest('hex');
    if (signature !== expectedSignature) {
      return NextResponse.json({ error: '비정상적인 접근입니다.' }, { status: 403 });
    }

    let { filename, contentType } = await request.json();

    const referer = request.headers.get('referer') || '';
    const isProfileUpload = referer.includes('/profile');

    // 💡 [핵심] 안드로이드가 신분증을 안 줬다면 백엔드에서도 강제 부여!
    if (!contentType || contentType === 'application/octet-stream' || contentType === '') {
      contentType = getMimeType(filename, contentType);
    }

    console.log(`[업로드 요청] 유저: ${userId}, 파일명: ${filename}, 타입: ${contentType}`);

    if (!filename || !contentType) {
      return NextResponse.json({ error: '파일 정보가 없습니다.' }, { status: 400 });
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    
    if (!allowedTypes.includes(contentType)) {
      console.error(`❌ 업로드 차단됨: 명단에 없는 이상한 파일 타입 (${contentType})`);
      return NextResponse.json({ error: '❌ 이미지 또는 동영상 파일만 업로드할 수 있습니다.' }, { status: 400 });
    }

    const extension = filename.split('.').pop()?.toLowerCase() || 'bin';
    const safeRandomName = Math.random().toString(36).substring(2, 10);
    let uniqueFileName = `${userId}-${Date.now()}-${safeRandomName}.${extension}`;

    if (isProfileUpload) {
      uniqueFileName = `profiles/${uniqueFileName}`;
    }

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_URL}/${uniqueFileName}`;

    return NextResponse.json({ uploadUrl, publicUrl });
  } catch (error) {
    console.error('티켓 발급 에러:', error);
    return NextResponse.json({ error: '티켓 발급 실패' }, { status: 500 });
  }
}
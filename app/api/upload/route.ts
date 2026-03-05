import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// 🔑 1. Vercel 금고에서 우리가 저장한 열쇠 5개를 꺼냅니다.
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
    // 2. 유저가 보낸 사진 꾸러미를 엽니다.
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '사진이 없어요!' }, { status: 400 });
    }

    // 3. 사진을 배달하기 좋게 봉투에 담습니다.
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 4. 사진 이름이 겹치지 않게 '현재 시간'을 이름 앞에 붙여줍니다.
    const fileName = `${Date.now()}-${file.name}`;

    // 5. 클라우드플레어 R2 창고로 사진을 슝~! 발사합니다.
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      })
    );

    // 6. "배달 성공! 사진은 이 주소에서 볼 수 있어요"라고 알려줍니다.
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_URL}/${fileName}`;
    return NextResponse.json({ url: publicUrl });

  } catch (error) {
    console.error('배달 사고 발생!:', error);
    return NextResponse.json({ error: '배달 실패ㅠㅠ' }, { status: 500 });
  }
}

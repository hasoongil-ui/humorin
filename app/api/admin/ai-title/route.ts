// 파일 위치: app/api/admin/ai-title/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 🚨 S급 관리자(마스터) 지문 감식기 (우회 원천 차단)
async function verifyAdmin() {
  const store = await cookies();
  const userId = store.get('humorin_userid')?.value;
  const signature = store.get('humorin_signature')?.value;

  if (!userId || !signature) return false;
  // '상실의 시대'와 'admin'만 허용
  if (userId !== 'admin' && userId !== 'ruffian71') return false;

  const expectedSig = crypto
    .createHmac('sha256', process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe')
    .update(userId)
    .digest('hex');

  if (signature === expectedSig) return userId;
  return false;
}

export async function POST(req: Request) {
  // 1. 관리자 권한 철저 검증
  if (!(await verifyAdmin())) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { title } = await req.json();

    if (!title) {
      return NextResponse.json({ error: '원본 제목이 필요합니다.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    // 2. 구글 Gemini API 엔진 가동 (구글이 에러 로그에서 직접 지정해 준 최신 3.6-flash 모델 하드코딩)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    // 3. SEO 최적화 프롬프트 (어그로 낚시성 제목 완벽 차단 및 명사형 렌더링 엔진 장착)
    const prompt = `
      당신은 따뜻하고 유쾌한 커뮤니티 '유머인'의 수석 SEO 카피라이터입니다.
      다음 원본 제목을 바탕으로, 포털 검색엔진(SEO)에 최적화된 담백하고 세련된 제목 3가지를 작성해주세요.

      [원본 제목]
      ${title}

      [절대 규칙]
      1. 원본의 핵심 키워드(명사)는 반드시 앞부분에 배치하여 검색 노출을 극대화할 것.
      2. 모바일 검색 결과에서 잘리지 않도록 공백 포함 30~50자 사이로 작성할 것.
      3. 🚨 절대 금지어: '충격', '경악', '레전드', '결국', '실제 사연', '결말', '꿀팁' 등 과장된 낚시성(Clickbait) 수식어는 절대 사용 금지.
      4. 억지스러운 서술어 대신, 검색 조합이 용이하고 자연스러운 명사형 형태(예: ~하는 방법, ~에 대한 이야기, ~의 풍경 등)로 문맥을 담백하게 보완할 것.
      5. 1번, 2번, 3번 같은 번호나 기호 없이 오직 제목 3줄만 결과로 출력할 것. 각 줄이 하나의 제목임.
    `;

    // 4. AI 답변 요청 및 파싱
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // 불필요한 번호표나 공백을 제거하고 정확히 3개의 배열로 정제
    const titles = text.split('\n')
      .map(t => t.replace(/^[-*0-9.]+\s*/, '').trim())
      .filter(t => t.length > 0)
      .slice(0, 3);

    return NextResponse.json({ success: true, titles });
  } catch (error) {
    console.error('AI 제목 최적화 에러:', error);
    return NextResponse.json({ error: 'AI 서버 통신 실패' }, { status: 500 });
  }
}
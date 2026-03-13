import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

// 💡 [미나 마법] 괄호 안에 (props: any) 를 빼먹지 않고 넣었습니다!
export default async function AdminSetupPage(props: any) {
  const cookieStore = await cookies();
  const currentUserId = cookieStore.get('ojemi_userid')?.value;
  if (currentUserId !== 'admin') redirect('/'); 

  async function buildDatabase() {
    'use server';
    
    try {
      // 1. 전역 설정(Global Settings) 테이블 생성 (사이트 전체 얼음 기능용)
      await sql`
        CREATE TABLE IF NOT EXISTS site_settings (
          key VARCHAR(50) PRIMARY KEY,
          value VARCHAR(255) NOT NULL
        );
      `;
      // 기본값 세팅 (처음엔 잠금 해제 상태)
      await sql`INSERT INTO site_settings (key, value) VALUES ('global_write_lock', 'false') ON CONFLICT DO NOTHING;`;
      await sql`INSERT INTO site_settings (key, value) VALUES ('global_comment_lock', 'false') ON CONFLICT DO NOTHING;`;

      // 2. 게시판(Boards) 통합 관리 테이블 생성
      await sql`
        CREATE TABLE IF NOT EXISTS boards (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) UNIQUE NOT NULL,
          group_name VARCHAR(50) NOT NULL,
          is_write_locked BOOLEAN DEFAULT false,
          is_comment_locked BOOLEAN DEFAULT false,
          sort_order INTEGER DEFAULT 0
        );
      `;

      // 3. 기존 하드코딩 되어있던 오재미 공식 게시판들을 DB로 완벽 이주!
      const initialBoards = [
        { name: '유머', group: '순한 유머 & 감동', order: 10 },
        { name: '감동', group: '순한 유머 & 감동', order: 20 },
        { name: '세상사는 이야기', group: '순한 유머 & 감동', order: 30 },
        { name: '귀여운 동물들', group: '순한 유머 & 감동', order: 40 },
        { name: '흥미로운 이야기', group: '순한 유머 & 감동', order: 50 },
        { name: '유용한 상식', group: '따뜻한 다락방', order: 60 },
        { name: '맛집', group: '따뜻한 다락방', order: 70 },
        { name: '가볼만한 곳', group: '따뜻한 다락방', order: 80 },
        { name: '볼만한 영화', group: '따뜻한 다락방', order: 90 },
        { name: '게시판 신설 요청', group: '따뜻한 다락방', order: 100 },
        { name: '건강', group: '지식 & 정보', order: 110 },
        { name: '재테크', group: '지식 & 정보', order: 120 },
        { name: '수필/에세이', group: '✒️ 나도 작가', order: 130 },
        { name: '시/단상', group: '✒️ 나도 작가', order: 140 },
        { name: '소설/웹소설', group: '✒️ 나도 작가', order: 150 },
        { name: '창작/기타', group: '✒️ 나도 작가', order: 160 }
      ];

      for (const b of initialBoards) {
        await sql`
          INSERT INTO boards (name, group_name, sort_order) 
          VALUES (${b.name}, ${b.group}, ${b.order}) 
          ON CONFLICT (name) DO NOTHING;
        `;
      }

    } catch (error) {
      console.error('DB 공사 실패:', error);
      throw error;
    }
    
    redirect('/admin/setup?success=true');
  }

  // 💡 [미나 마법] Next.js 16 문법에 맞춰 await 를 추가했습니다!
  const searchParams = await props.searchParams;
  const isSuccess = searchParams?.success === 'true';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans p-4">
      <div className="bg-white p-10 rounded-sm shadow-xl border border-gray-200 max-w-md w-full text-center">
        <h1 className="text-2xl font-black text-gray-800 mb-2">통제실 DB 건설 현장 🏗️</h1>
        <p className="text-sm text-gray-500 mb-8 font-bold">오재미의 게시판과 설정 데이터를 보관할 새로운 창고를 짓습니다.</p>
        
        {isSuccess ? (
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-sm">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-lg font-black text-emerald-700 mb-1">건설 완료!</h2>
            <p className="text-xs text-emerald-600 font-bold mb-4">DB 세팅이 완벽하게 끝났습니다.</p>
            <Link href="/admin" className="inline-block px-6 py-2 bg-[#3b4890] text-white font-bold text-sm rounded-sm hover:bg-[#2a3042] transition-colors">
              관리자 메인으로 돌아가기
            </Link>
          </div>
        ) : (
          <form action={buildDatabase}>
            <button type="submit" className="w-full py-4 bg-rose-600 text-white font-black text-lg rounded-sm shadow-md hover:bg-rose-700 transition-all hover:scale-[1.02] active:scale-[0.98]">
              🚀 통제실 DB 공사 시작하기 (클릭!)
            </button>
            <p className="text-[11px] text-gray-400 mt-4 font-bold">이 버튼은 최고 관리자(admin)만 누를 수 있습니다.</p>
          </form>
        )}
      </div>
    </div>
  );
}
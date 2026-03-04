import { sql } from '@vercel/postgres';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function formatDate(dateString: any) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default async function BoardPage() {
  const { rows } = await sql`SELECT * FROM posts ORDER BY date DESC`;

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white p-4 border-b">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-black text-[#3b4890]">OJEMI</Link>
        </div>
      </header>

      {/* 💡 클리앙 스타일로 진화한 명품 곤색 네비게이션 바! */}
      <nav className="bg-[#3b4890] text-gray-300 overflow-x-auto">
        <div className="max-w-5xl mx-auto flex relative">
          {['💯 백베스트', '👑 천베스트', '투데이 베스트', '전체글 보기', '유머', '감동', '공포', '일상', '그냥 혼잣말', '핫뉴스'].map((menu) => (
            <div key={menu} className="relative group px-4 py-3 cursor-pointer">
              
              {/* 평소엔 살짝 회색, 마우스 올리면 하얀색으로 세련되게 변함! */}
              <span className="font-bold text-sm group-hover:text-white transition-colors">
                {menu}
              </span>

              {/* 💬 클리앙 스타일 마법의 말풍선 (평소엔 숨어있다가 마우스 올리면 등장!) */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-0 hidden group-hover:block z-50">
                {/* 말풍선 위쪽 뾰족한 삼각형 */}
                <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-transparent border-b-white mx-auto"></div>
                {/* 하얀색 네모 박스 */}
                <div className="bg-white text-gray-800 text-xs font-bold px-3 py-1.5 border border-gray-300 shadow-lg whitespace-nowrap rounded-sm">
                  {menu} 바로가기
                </div>
              </div>

            </div>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 mt-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">전체글 보기</h2>
            <Link href="/board/write" className="px-6 py-2 bg-[#3b4890] text-white rounded font-bold hover:bg-[#222b5c] shadow-md transition-colors">
              ✍️ 폼나게 글쓰기
            </Link>
          </div>

          <div className="flex bg-gray-50 border-t border-b border-gray-200 py-3 text-sm font-bold text-gray-600 text-center">
            <div className="w-16">번호</div>
            <div className="flex-1">제목</div>
            <div className="w-24">글쓴이</div>
            <div className="w-20">조회수</div>
            <div className="w-32">날짜</div>
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-10 text-gray-500">아직 창고에 등록된 명품 글이 없습니다.</div>
          ) : (
            rows.map((post) => (
              <Link href={`/board/${post.id}`} key={post.id} className="flex border-b border-gray-100 py-3 text-sm hover:bg-gray-50 items-center text-center cursor-pointer transition-colors group">
                <div className="w-16 text-gray-400">{post.id}</div>
                <div className="flex-1 text-left px-4 font-semibold text-gray-800 group-hover:text-[#3b4890] group-hover:underline">
                  {post.title}
                </div>
                <div className="w-24 text-gray-600 font-bold">{post.author}</div>
                <div className="w-20 text-red-500 font-bold">{post.views || 0}</div>
                <div className="w-32 text-gray-400">{formatDate(post.date)}</div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
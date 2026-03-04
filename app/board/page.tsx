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

      <nav className="bg-[#3b4890] text-gray-300 relative z-40">
        <div className="max-w-5xl mx-auto flex flex-wrap relative">
          {['💯 백베스트', '👑 천베스트', '투데이 베스트', '전체글 보기', '유머', '감동', '공포', '일상', '그냥 혼잣말', '핫뉴스'].map((menu) => (
            <div key={menu} className="relative group px-4 py-3 cursor-pointer">
              <span className="font-bold text-sm group-hover:text-white transition-colors">
                {menu}
              </span>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-0 hidden group-hover:block z-50">
                <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[6px] border-transparent border-b-white mx-auto"></div>
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
            {/* 💡 추천 칸 추가! */}
            <div className="w-16 text-blue-600">추천</div>
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
                {/* 💡 목록에도 추천수 데이터가 나오게 추가! */}
                <div className="w-16 text-blue-600 font-extrabold">{post.likes || 0}</div>
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
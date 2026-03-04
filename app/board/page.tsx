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

      <nav className="bg-[#3b4890] text-white overflow-x-auto">
        <div className="max-w-5xl mx-auto flex">
          {['💯 백베스트', '👑 천베스트', '투데이 베스트', '전체글 보기', '유머', '감동', '공포', '일상', '그냥 혼잣말', '핫뉴스'].map((menu) => (
            <div key={menu} className="px-4 py-3 hover:bg-blue-700 font-bold text-sm cursor-pointer">{menu}</div>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 mt-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">전체글 보기</h2>
            <Link href="/board/write" className="px-6 py-2 bg-[#3b4890] text-white rounded font-bold hover:bg-blue-700 shadow-md">
              ✍️ 폼나게 글쓰기
            </Link>
          </div>

          {/* 💡 제목 칸에 '조회수' 구역 추가! */}
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
              <Link href={`/board/${post.id}`} key={post.id} className="flex border-b border-gray-100 py-3 text-sm hover:bg-blue-50 items-center text-center cursor-pointer transition-colors group">
                <div className="w-16 text-gray-400">{post.id}</div>
                <div className="flex-1 text-left px-4 font-semibold text-gray-800 group-hover:text-[#3b4890] group-hover:underline">
                  {post.title}
                </div>
                <div className="w-24 text-gray-600 font-bold">{post.author}</div>
                {/* 💡 목록에도 조회수 데이터가 나오게 추가! */}
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